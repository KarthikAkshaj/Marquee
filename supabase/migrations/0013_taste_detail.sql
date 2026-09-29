-- Finer taste for For you (SPEC §20).

-- An anime's main AniList tags, or a game's IGDB themes: finer than genres
-- ("Iyashikei", "Time Skip", "Warfare"). Null means never looked up; empty
-- means looked up and nothing worth keeping, so it isn't asked again.
alter table public.items
  add column tags text[] check (tags is null or cardinality(tags) <= 12);

-- What a waved-away title was about, so "Not for me" can nudge those genres
-- and tags down a little. Rows from before this are simply about nothing.
alter table public.dismissed_picks
  add column genres text[] not null default '{}' check (cardinality(genres) <= 12),
  add column tags   text[] not null default '{}' check (cardinality(tags) <= 12);

-- Filling tags in on titles added before they were kept. Quiet, like
-- fill_item_runtimes (0007), so "Recently updated" keeps its order, and run
-- as the caller, so RLS still decides whose rows these are.
create or replace function public.fill_item_tags(rows jsonb)
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
     set tags = coalesce(array(select jsonb_array_elements_text(r.value->'tags')), '{}')
    from jsonb_array_elements(rows) as r(value)
   where i.id = (r.value->>'id')::uuid;

  get diagnostics filled = row_count;
  perform set_config('marquee.quiet', 'off', true);
  return filled;
end $$;

revoke all on function public.fill_item_tags(jsonb) from public, anon;
grant execute on function public.fill_item_tags(jsonb) to authenticated;
