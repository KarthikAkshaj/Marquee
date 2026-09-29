-- Shelf links and Add all (SPEC §19).
--
-- A shelf link is a secret address for one shelf. It works with the profile
-- private, and shows that shelf and nothing else of the account. Add all
-- copies a whole shared shelf (or the tab you're on) onto one of yours.
--
-- Who may see a shelf is now decided in one function, visible_shelves: a
-- shared shelf on a public profile, or the shelf a link points at. Every read
-- and copy by a visitor goes through it, so a new way in (friends, one day)
-- is added there and nowhere else. Nothing below is tied to a kind or a
-- provider: copies go onto a shelf of the same kind, whatever kinds exist.

-- ---------------------------------------------------------------------------
-- The links. A row each, so a shelf can have several one day (one per
-- friend, or ones that expire) without changing this table.

create table public.shelf_links (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  -- 122 random bits from gen_random_uuid, written URL-safe: 22 characters nobody can guess.
  token       text not null unique
              default translate(rtrim(encode(uuid_send(gen_random_uuid()), 'base64'), '='), '+/', '-_')
              check (token ~ '^[A-Za-z0-9_-]{22}$'),
  created_at  timestamptz not null default now()
);

create index shelf_links_category on public.shelf_links (category_id, created_at desc);

alter table public.shelf_links enable row level security;

create policy "own shelf links" on public.shelf_links
  for all using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.categories c where c.id = category_id and c.user_id = (select auth.uid()))
  );

-- Owners read, make and remove their links; they never pick or edit a token,
-- so every link stays random. Visitors never touch the table at all.
revoke all on public.shelf_links from anon, authenticated;
grant select, delete on public.shelf_links to authenticated;
grant insert (category_id) on public.shelf_links to authenticated;

-- ---------------------------------------------------------------------------
-- Internal pieces, called only from the functions further down.

-- The one place that decides which shelves a visitor may see.
create or replace function public.visible_shelves(p_username text, p_token text)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id
  from public.categories c
  join public.profiles p on p.id = c.user_id
  where p_username is not null
    and p.username = lower(btrim(p_username))
    and p.is_public
    and c.is_public
  union all
  select l.category_id
  from public.shelf_links l
  where p_token is not null and l.token = p_token;
$$;

-- A shelf's titles, as a visitor sees them. Notes, dates and provider ids stay home.
create or replace function public.shelf_titles(p_category uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',               i.id,
    'title',            i.title,
    'status',           i.status,
    'rating',           i.rating,
    'progress_current', i.progress_current,
    'progress_total',   i.progress_total,
    'cover_url',        i.cover_url,
    'backdrop_url',     i.backdrop_url,
    'accent_color',     i.accent_color,
    'year',             i.year,
    'format',           i.format,
    'genres',           i.genres,
    'is_favorite',      i.is_favorite
  ) order by i.updated_at desc), '[]'::jsonb)
  from public.items i
  where i.category_id = p_category;
$$;

-- Which of these titles the caller already has: on a shelf of the same kind,
-- the same provider title, or, where either side was added by hand, the same
-- name and year (so namesakes stay apart). Two equality joins, so a big
-- library stays quick. Only ever the caller's own rows.
create or replace function public.copies_of(p_items uuid[])
returns table (shared_id uuid, copy_id uuid, copy_shelf uuid)
language sql
stable
security definer
set search_path = ''
as $$
  with t_shared as (
    select i.id, i.source, i.external_id, lower(i.title) as name, i.year, c.kind
    from public.items i
    join public.categories c on c.id = i.category_id
    where i.id = any(p_items)
  ),
  t_mine as (
    select m.id, m.category_id, m.source, m.external_id, lower(m.title) as name, m.year, c.kind, m.created_at
    from public.items m
    join public.categories c on c.id = m.category_id
    where m.user_id = (select auth.uid())
  ),
  t_matches as (
    select s.id as s_id, m.id as c_id, m.category_id as c_shelf, m.created_at
    from t_shared s
    join t_mine m on m.kind = s.kind and m.source = s.source and m.external_id = s.external_id
    where s.source <> 'manual'
    union all
    select s.id, m.id, m.category_id, m.created_at
    from t_shared s
    join t_mine m on m.kind = s.kind and m.name = s.name
    where (s.source = 'manual' or m.source = 'manual')
      and (s.year is null or m.year is null or s.year = m.year)
  )
  select distinct on (s_id) s_id, c_id, c_shelf
  from t_matches
  order by s_id, created_at;
$$;

-- A signed-in visitor's side of a shelf: their own shelves, and which of this
-- shelf's titles they already have. Null for the owner and anyone signed out.
create or replace function public.viewer_side(p_category uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'shelves', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'slug', c.slug, 'kind', c.kind, 'color', c.color
      ) order by c.position, c.created_at)
      from public.categories c
      where c.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'has', coalesce((
      select jsonb_object_agg(y.shared_id, jsonb_build_object('item', y.copy_id, 'shelf', y.copy_shelf))
      from public.copies_of(array(select i.id from public.items i where i.category_id = p_category)) y
    ), '{}'::jsonb)
  )
  where p_category is not null
    and (select auth.uid()) is not null
    and (select auth.uid()) is distinct from (select c.user_id from public.categories c where c.id = p_category);
$$;

revoke all on function public.visible_shelves(text, text) from public, anon, authenticated;
revoke all on function public.shelf_titles(uuid) from public, anon, authenticated;
revoke all on function public.copies_of(uuid[]) from public, anon, authenticated;
revoke all on function public.viewer_side(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The public profile, now reading through visible_shelves. Same answers as
-- before (0010, 0011, 0014).

create or replace function public.public_profile(p_username text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'username',     p.username,
    'display_name', p.display_name,
    'avatar_url',   p.avatar_url,
    'bio',          p.bio,
    'member_since', to_char(p.created_at at time zone 'UTC', 'YYYY-MM'),
    'shelves', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug',  c.slug,
        'name',  c.name,
        'kind',  c.kind,
        'color', c.color,
        'icon',  c.icon,
        'count', (select count(*) from public.items i where i.category_id = c.id)
      ) order by c.position, c.created_at)
      from public.categories c
      where c.id in (select public.visible_shelves(p_username, null))
    ), '[]'::jsonb),
    -- Counted on the shared shelves only, like everything else here.
    'finished_this_year', (
      select count(*)
      from public.items i
      where i.category_id in (select public.visible_shelves(p_username, null))
        and i.status = 'completed'
        and i.finished_at >= date_trunc('year', now())::date
    )
  )
  from public.profiles p
  where p.username = lower(btrim(p_username)) and p.is_public;
$$;

create or replace function public.public_shelf(p_username text, p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select public.shelf_titles(c.id)
    from public.categories c
    where c.id in (select public.visible_shelves(p_username, null)) and c.slug = p_slug
  ), '[]'::jsonb);
$$;

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
    select c.id, c.slug
    from public.categories c
    where c.id in (select public.visible_shelves(p_username, null))
    order by coalesce(c.slug = p_slug, false) desc, c.position, c.created_at
    limit 1
  )
  select public.public_profile(o.username) || jsonb_build_object(
    -- Only ever true for the owner themselves; it says nothing about anyone else.
    'own',    o.id = (select auth.uid()),
    'shelf',  (select slug from shelf),
    'titles', coalesce(public.shelf_titles((select id from shelf)), '[]'::jsonb),
    'viewer', public.viewer_side((select id from shelf))
  )
  from owner o;
$$;

-- ---------------------------------------------------------------------------
-- A shelf by its link: the owner's name and photo (nothing else of theirs),
-- the shelf, its titles, and the visitor's side. Null for a link that's gone.

create or replace function public.link_page(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'owner', jsonb_build_object('name', p.display_name, 'avatar_url', p.avatar_url),
    'shelf', jsonb_build_object(
      'slug',  c.slug,
      'name',  c.name,
      'kind',  c.kind,
      'color', c.color,
      'icon',  c.icon,
      'count', (select count(*) from public.items i where i.category_id = c.id)
    ),
    'own',    c.user_id = (select auth.uid()),
    'titles', public.shelf_titles(c.id),
    'viewer', public.viewer_side(c.id)
  )
  from public.categories c
  join public.profiles p on p.id = c.user_id
  where c.id in (select public.visible_shelves(null, p_token));
$$;

revoke all on function public.link_page(text) from public;
grant execute on function public.link_page(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Copying, one title or a whole shelf. Replaces 0014's shared_title and
-- copy_shared_title, which stay until nothing calls them and go in a later
-- migration.

-- What a copy may take from shared titles: what each title *is*, never what
-- its owner made of it (status, rating, progress, notes, favourite, dates),
-- plus whether the caller has it already. At most 500 at a time. A new
-- catalogue column (a song's artist, say) is added here and in the insert in
-- copy_shared_titles, and nowhere else.
create or replace function public.shared_titles(p_username text, p_token text, p_items uuid[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',              i.id,
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
    'community_score', i.community_score,
    'yours',           y.copy_id is not null
  ) order by u.ord), '[]'::jsonb)
  from unnest(p_items) with ordinality as u(id, ord)
  join public.items i on i.id = u.id
  join public.categories c on c.id = i.category_id
  left join public.copies_of(p_items) y on y.shared_id = i.id
  where cardinality(p_items) <= 500
    and i.category_id in (select public.visible_shelves(p_username, p_token));
$$;

-- The copy. It runs as the caller, so RLS decides whose shelf this is, like
-- any other add. Titles already theirs are skipped. The first title given
-- comes out newest, so a shelf sorted by recent reads them in order.
-- Returns {added: [{shared, item}], already: n}.
create or replace function public.copy_shared_titles(
  p_username text,
  p_token text,
  p_items uuid[],
  p_category uuid,
  p_status public.item_status
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  shared jsonb;
  shelf_kind public.category_kind;
  entry record;
  new_id uuid;
  added jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_items is null or cardinality(p_items) not between 1 and 500 then
    raise exception 'send between 1 and 500 titles at a time' using errcode = '54000';
  end if;

  -- One of the caller's own shelves (RLS).
  select c.kind into shelf_kind from public.categories c where c.id = p_category;
  if shelf_kind is null then
    raise exception 'no such shelf' using errcode = '22023';
  end if;

  shared := public.shared_titles(p_username, p_token, p_items);
  if jsonb_array_length(shared) = 0 then
    raise exception 'not shared' using errcode = 'P0002';
  end if;
  if exists (select 1 from jsonb_array_elements(shared) e where e->>'kind' <> shelf_kind::text) then
    raise exception 'not a shelf for these titles' using errcode = '22023';
  end if;

  for entry in
    select e.value, e.ordinality
    from jsonb_array_elements(shared) with ordinality as e(value, ordinality)
    where not (e.value->>'yours')::boolean
  loop
    insert into public.items (
      user_id, category_id, status,
      title, cover_url, backdrop_url, accent_color, year, format, genres, tags,
      source, external_id, progress_total, runtime_minutes, community_score,
      created_at, updated_at
    )
    select
      auth.uid(), p_category, p_status,
      r.title, r.cover_url, r.backdrop_url, r.accent_color, r.year, r.format, r.genres, r.tags,
      r.source, r.external_id, r.progress_total, r.runtime_minutes, r.community_score,
      now() - entry.ordinality * interval '1 millisecond',
      now() - entry.ordinality * interval '1 millisecond'
    from jsonb_populate_record(null::public.items, entry.value) as r
    -- A double tap, or a copy made a moment ago in another tab.
    on conflict (user_id, category_id, source, external_id) where external_id is not null do nothing
    returning id into new_id;

    if new_id is not null then
      added := added || jsonb_build_object('shared', entry.value->>'id', 'item', new_id);
    end if;
  end loop;

  return jsonb_build_object('added', added, 'already', jsonb_array_length(shared) - jsonb_array_length(added));
end $$;

revoke all on function public.shared_titles(text, text, uuid[]) from public, anon;
revoke all on function public.copy_shared_titles(text, text, uuid[], uuid, public.item_status) from public, anon;
grant execute on function public.shared_titles(text, text, uuid[]) to authenticated;
grant execute on function public.copy_shared_titles(text, text, uuid[], uuid, public.item_status) to authenticated;
