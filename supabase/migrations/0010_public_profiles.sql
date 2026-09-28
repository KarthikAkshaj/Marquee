-- Public profiles (SPEC §19): /u/<username> shows the shelves a person chose to share.
--
-- Both switches are off until the owner turns them on. The tables stay
-- owner-only under RLS: RLS decides which rows, not which columns, and a
-- shared shelf must never hand out notes or dates. Visitors read through the
-- two functions below instead, which return only the fields a public page
-- shows, and nothing at all unless the profile and the shelf are both public.

alter table public.profiles   add column is_public boolean not null default false;
alter table public.categories add column is_public boolean not null default false;

-- The page's header and its shelf tabs. Null for a missing or private profile,
-- so the page can't tell anyone which usernames exist.
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
      where c.user_id = p.id and c.is_public
    ), '[]'::jsonb),
    -- Counted on the shared shelves only, like everything else here.
    'finished_this_year', (
      select count(*)
      from public.items i
      join public.categories c on c.id = i.category_id
      where c.user_id = p.id
        and c.is_public
        and i.status = 'completed'
        and i.finished_at >= date_trunc('year', now())::date
    )
  )
  from public.profiles p
  where p.username = lower(btrim(p_username)) and p.is_public;
$$;

-- One shared shelf's titles, newest activity first. Empty unless both the
-- profile and the shelf are public. Notes, dates and ids from providers stay home.
create or replace function public.public_shelf(p_username text, p_slug text)
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
  join public.categories c on c.id = i.category_id
  join public.profiles p on p.id = c.user_id
  where p.username = lower(btrim(p_username))
    and p.is_public
    and c.slug = p_slug
    and c.is_public;
$$;

revoke all on function public.public_profile(text) from public;
revoke all on function public.public_shelf(text, text) from public;
grant execute on function public.public_profile(text) to anon, authenticated;
grant execute on function public.public_shelf(text, text) to anon, authenticated;
