-- Phase 4a: bulk import (SPEC §8.9).
--
-- Imported titles weren't started or finished today, so the status trigger
-- leaves their dates empty while an import is running. import_titles() sets a
-- transaction-local flag for that, and keeps the document's order by spacing
-- created_at/updated_at a millisecond apart (first line = newest).

create or replace function public.stamp_status_dates() returns trigger
language plpgsql as $$
begin
  if current_setting('marquee.importing', true) = 'on' then
    return new;
  end if;
  if new.status = 'in_progress' and new.started_at is null then
    new.started_at = current_date;
  end if;
  if new.status = 'completed' and new.finished_at is null then
    new.finished_at = current_date;
    if new.progress_total is not null then new.progress_current = new.progress_total; end if;
  end if;
  return new;
end $$;

-- Runs as the caller, so RLS still decides which category they can add to.
create or replace function public.import_titles(target_category uuid, titles jsonb, batch_started timestamptz)
returns integer
language plpgsql security invoker set search_path = public as $$
declare
  added integer;
  started timestamptz := least(coalesce(batch_started, now()), now());
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if jsonb_typeof(titles) <> 'array' or jsonb_array_length(titles) not between 1 and 100 then
    raise exception 'send between 1 and 100 titles at a time';
  end if;

  perform set_config('marquee.importing', 'on', true);

  insert into public.items (user_id, category_id, title, status, year, created_at, updated_at)
  select auth.uid(),
         target_category,
         t.value->>'title',
         (t.value->>'status')::item_status,
         nullif(t.value->>'year', '')::smallint,
         started - ((t.value->>'position')::int * interval '1 millisecond'),
         started - ((t.value->>'position')::int * interval '1 millisecond')
  from jsonb_array_elements(titles) as t(value);

  get diagnostics added = row_count;
  perform set_config('marquee.importing', 'off', true);
  return added;
end $$;

revoke all on function public.import_titles(uuid, jsonb, timestamptz) from public, anon;
grant execute on function public.import_titles(uuid, jsonb, timestamptz) to authenticated;
