-- Add to my shelf (SPEC §19): a signed-in visitor copies a title from someone's
-- public shelf onto one of their own.
--
-- The copy takes what the title *is* (its name, art, year, genres, which
-- provider title it is) and never what the owner made of it: no status,
-- rating, progress, notes, favourite or dates. The visitor picks their own
-- status. Nothing here is specific to a kind or a provider: a title goes onto
-- a shelf of the same kind as the one it came from, whatever kinds exist.

-- What a copy may take from one shared title, and the kind of shelf it sits
-- on. Nothing unless the profile and the shelf are both public. A new
-- catalogue column (a song's artist, say) is added here and in the insert
-- below, and nowhere else.
create or replace function public.shared_title(p_username text, p_item uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'kind',            c.kind,
    'title',           i.title,
    'cover_url',       i.cover_url,
    'backdrop_url',    i.backdrop_url,
    'accent_color',    i.accent_color,
    'year',            i.year,
    'format',          i.format,
    'genres',          i.genres,
    'tags',            i.tags,
    'source',          i.source,
    'external_id',     i.external_id,
    'progress_total',  i.progress_total,
    'runtime_minutes', i.runtime_minutes,
    'community_score', i.community_score
  )
  from public.items i
  join public.categories c on c.id = i.category_id
  join public.profiles p on p.id = c.user_id
  where i.id = p_item
    and p.username = lower(btrim(p_username))
    and p.is_public
    and c.is_public;
$$;

-- The copy itself. It runs as the visitor, so RLS decides whose shelf this is,
-- exactly as for any other add. Returns the new title's id.
create or replace function public.copy_shared_title(
  p_username text,
  p_item uuid,
  p_category uuid,
  p_status public.item_status
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  shared jsonb;
  shelf_kind public.category_kind;
  added uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  shared := public.shared_title(p_username, p_item);
  if shared is null then
    raise exception 'not shared' using errcode = 'P0002';
  end if;

  -- One of the visitor's own shelves (RLS), of the kind the title came from.
  select c.kind into shelf_kind from public.categories c where c.id = p_category;
  if shelf_kind is null or shelf_kind::text <> shared->>'kind' then
    raise exception 'not a shelf for this title' using errcode = '22023';
  end if;

  -- A double tap lands on items_unique_external (23505) for a provider title.
  insert into public.items (
    user_id, category_id, status,
    title, cover_url, backdrop_url, accent_color, year, format, genres, tags,
    source, external_id, progress_total, runtime_minutes, community_score
  )
  select
    auth.uid(), p_category, p_status,
    r.title, r.cover_url, r.backdrop_url, r.accent_color, r.year, r.format, r.genres, r.tags,
    r.source, r.external_id, r.progress_total, r.runtime_minutes, r.community_score
  from jsonb_populate_record(null::public.items, shared) as r
  returning id into added;

  return added;
end $$;

revoke all on function public.shared_title(text, uuid) from public, anon;
revoke all on function public.copy_shared_title(text, uuid, uuid, public.item_status) from public, anon;
grant execute on function public.shared_title(text, uuid) to authenticated;
grant execute on function public.copy_shared_title(text, uuid, uuid, public.item_status) to authenticated;

-- The public page, as before, plus what a signed-in visitor needs to add
-- titles: their own shelves, and which of the open shelf's titles they already
-- have. Both are the visitor's own rows, found by auth.uid(); an owner or a
-- signed-out visitor gets null. "Already have" means on a shelf of the same
-- kind: the same provider title, or, where either side was added by hand,
-- the same name and year. Two equality joins, so a big library stays quick.
create or replace function public.public_page(p_username text, p_slug text default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with owner as (
    select p.id, p.username
    from public.profiles p
    where p.username = lower(btrim(p_username)) and p.is_public
  ),
  -- The shelf asked for if it's shared, else the first shared one.
  shelf as (
    select c.slug
    from public.categories c
    join owner o on o.id = c.user_id
    where c.is_public
    order by coalesce(c.slug = p_slug, false) desc, c.position, c.created_at
    limit 1
  ),
  visitor as (
    select (select auth.uid()) as id
    where (select auth.uid()) is not null
      and (select auth.uid()) is distinct from (select id from owner)
  ),
  theirs as (
    select i.id, i.source, i.external_id, lower(i.title) as name, i.year, c.kind
    from public.items i
    join public.categories c on c.id = i.category_id
    join owner o on o.id = c.user_id
    where c.is_public and c.slug = (select slug from shelf)
  ),
  mine as (
    select m.id, m.category_id, m.source, m.external_id, lower(m.title) as name, m.year, c.kind, m.created_at
    from public.items m
    join public.categories c on c.id = m.category_id
    join visitor v on v.id = m.user_id
  ),
  matches as (
    select t.id as theirs, m.id as item, m.category_id as shelf, m.created_at
    from theirs t
    join mine m on m.kind = t.kind and m.source = t.source and m.external_id = t.external_id
    where t.source <> 'manual'
    union all
    select t.id, m.id, m.category_id, m.created_at
    from theirs t
    join mine m on m.kind = t.kind and m.name = t.name
    where (t.source = 'manual' or m.source = 'manual')
      and (t.year is null or m.year is null or t.year = m.year)
  ),
  first_match as (
    select distinct on (theirs) theirs, item, shelf
    from matches
    order by theirs, created_at
  )
  select public.public_profile(o.username) || jsonb_build_object(
    -- Only ever true for the owner themselves; it says nothing about anyone else.
    'own',    o.id = (select auth.uid()),
    'shelf',  (select slug from shelf),
    'titles', coalesce(public.public_shelf(o.username, (select slug from shelf)), '[]'::jsonb),
    'viewer', (
      select jsonb_build_object(
        'shelves', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', c.id, 'name', c.name, 'slug', c.slug, 'kind', c.kind, 'color', c.color
          ) order by c.position, c.created_at)
          from public.categories c
          where c.user_id = v.id
        ), '[]'::jsonb),
        'has', coalesce((
          select jsonb_object_agg(f.theirs, jsonb_build_object('item', f.item, 'shelf', f.shelf))
          from first_match f
        ), '{}'::jsonb)
      )
      from visitor v
    )
  )
  from owner o;
$$;
