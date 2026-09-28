-- Public profile page in one round trip (SPEC §19).
--
-- The page used to ask three times: the profile, then its shelf, then who was
-- looking. Each trip to the database is the slow part, so this returns all
-- three at once. It reuses public_profile and public_shelf, so what a visitor
-- can see is still decided in exactly one place.

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
  )
  select public.public_profile(o.username) || jsonb_build_object(
    -- Only ever true for the owner themselves; it says nothing about anyone else.
    'own',    o.id = (select auth.uid()),
    'shelf',  (select slug from shelf),
    'titles', coalesce(public.public_shelf(o.username, (select slug from shelf)), '[]'::jsonb)
  )
  from owner o;
$$;

revoke all on function public.public_page(text, text) from public;
grant execute on function public.public_page(text, text) to anon, authenticated;
