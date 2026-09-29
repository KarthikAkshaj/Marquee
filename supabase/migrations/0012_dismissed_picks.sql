-- "Not for me" on For you (SPEC §20).
--
-- A title from outside your shelves that you've waved away, by its provider
-- id, so the picks never offer it again. Only ever read and written by its
-- owner. Removing the account removes these with it.

create table public.dismissed_picks (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source      public.meta_source not null check (source <> 'manual'),
  external_id text not null check (char_length(external_id) between 1 and 64),
  created_at  timestamptz not null default now(),
  primary key (user_id, source, external_id)
);

alter table public.dismissed_picks enable row level security;

create policy "own dismissed picks" on public.dismissed_picks
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
