-- Username availability for Settings → Profile (SPEC §8.10).
--
-- RLS keeps every profile private to its owner, so a signed-in user can't
-- query other rows to see whether a username is taken. This function answers
-- only that yes/no question and never reveals who holds a name.
-- A user's own current username counts as available to them.

create or replace function public.is_username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select candidate ~ '^[a-z0-9_]{3,20}$'
     and not exists (
       select 1
       from public.profiles
       where username = candidate
         and id <> auth.uid()
     );
$$;

revoke all on function public.is_username_available(text) from public, anon;
grant execute on function public.is_username_available(text) to authenticated;

-- Storage `remove()` needs SELECT as well as DELETE on the object rows, and
-- 0002 only granted DELETE, so replaced or removed avatars were never deleted.
-- Owners may see only their own folder; everyone else still reads through the
-- public URL. Safe to run twice.
drop policy if exists "avatar select own" on storage.objects;
create policy "avatar select own" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
