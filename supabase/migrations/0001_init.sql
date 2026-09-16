-- Marquee — initial schema (SPEC §5)
-- Multi-user: every row is owned by a user and protected by RLS.

-- Enums
create type category_kind as enum ('anime','movie','series','game','custom');
create type item_status  as enum ('planned','in_progress','completed','dropped');
create type meta_source  as enum ('tmdb','anilist','igdb','manual');

-- Profiles
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text check (char_length(display_name) between 1 and 40),
  avatar_url   text,
  bio          text check (char_length(bio) <= 160),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Categories
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 40),
  slug       text not null,
  kind       category_kind not null default 'custom',
  color      text not null default 'amber',   -- token name, not hex
  icon       text not null default 'clapperboard', -- lucide icon name
  position   int  not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

-- Items
create table public.items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  category_id      uuid not null references public.categories(id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 200),
  status           item_status not null default 'planned',
  rating           smallint check (rating between 1 and 10),
  progress_current int  not null default 0 check (progress_current >= 0),
  progress_total   int  check (progress_total is null or progress_total > 0),
  notes            text check (char_length(notes) <= 2000),
  cover_url        text,
  backdrop_url     text,
  accent_color     text,          -- hex from cover, e.g. '#3a5f8c'
  year             smallint,
  source           meta_source not null default 'manual',
  external_id      text,
  is_favorite      boolean not null default false,
  started_at       date,
  finished_at      date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index items_unique_external
  on public.items (user_id, category_id, source, external_id)
  where external_id is not null;
create index items_user_category_status on public.items (user_id, category_id, status);
create index items_user_updated on public.items (user_id, updated_at desc);

-- updated_at trigger
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger items_touch before update on public.items
for each row execute function public.touch_updated_at();

create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

-- Auto-set started_at / finished_at on status change
create or replace function public.stamp_status_dates() returns trigger
language plpgsql as $$
begin
  if new.status = 'in_progress' and new.started_at is null then
    new.started_at = current_date;
  end if;
  if new.status = 'completed' and new.finished_at is null then
    new.finished_at = current_date;
    if new.progress_total is not null then new.progress_current = new.progress_total; end if;
  end if;
  return new;
end $$;

create trigger items_stamp before insert or update of status on public.items
for each row execute function public.stamp_status_dates();

-- Seed on signup: profile (with a generated username) + 4 default categories
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text := left(regexp_replace(lower(split_part(coalesce(new.email,''),'@',1)), '[^a-z0-9_]', '', 'g'), 15);
begin
  if char_length(base) < 3 then base := 'user'; end if;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (new.id,
          base || '_' || substr(md5(random()::text), 1, 4),   -- e.g. akuma_3f9c, user can change it
          left(coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), 40),
          new.raw_user_meta_data->>'avatar_url');

  insert into public.categories (user_id, name, slug, kind, color, icon, position) values
    (new.id, 'Anime',  'anime',  'anime',  'crimson', 'sparkles',     0),
    (new.id, 'Movies', 'movies', 'movie',  'amber',   'clapperboard', 1),
    (new.id, 'Series', 'series', 'series', 'violet',  'tv',           2),
    (new.id, 'Games',  'games',  'game',   'teal',    'gamepad-2',    3);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles   enable row level security;
alter table public.categories enable row level security;
alter table public.items      enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own categories" on public.categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own items" on public.items
  for all using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.categories c
                where c.id = category_id and c.user_id = auth.uid())
  );

-- Account deletion: user deletes their own auth row; FKs cascade to profiles, categories, items.
create or replace function public.delete_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
