-- Filling in runtimes on titles added before they were kept (SPEC §15).
--
-- The catch is `touch_updated_at`: a plain update would stamp every row as
-- changed today, and "Recently updated" is the default sort, so a whole
-- library would collapse into one timestamp. The trigger now stands down for
-- a transaction that asks it to, the same way `import_titles` quiets the
-- status stamps, and only this function asks.

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  if current_setting('marquee.quiet', true) = 'on' then
    return new;
  end if;
  new.updated_at = now();
  return new;
end $$;

-- Runs as the caller, so RLS still decides whose rows these are.
create or replace function public.fill_item_runtimes(rows jsonb)
returns integer
language plpgsql security invoker set search_path = public as $$
declare
  filled integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) not between 1 and 100 then
    raise exception 'send between 1 and 100 rows at a time';
  end if;

  perform set_config('marquee.quiet', 'on', true);

  update public.items as i
     set runtime_minutes = nullif(r.value->>'runtime_minutes', '')::smallint,
         format          = nullif(r.value->>'format', '')::item_format
    from jsonb_array_elements(rows) as r(value)
   where i.id = (r.value->>'id')::uuid;

  get diagnostics filled = row_count;
  perform set_config('marquee.quiet', 'off', true);
  return filled;
end $$;

revoke all on function public.fill_item_runtimes(jsonb) from public, anon;
grant execute on function public.fill_item_runtimes(jsonb) to authenticated;
