-- How long a title runs and what shape it is, so screen time in /wrapped can
-- stop being a guess (SPEC §15).
--
-- Every provider already tells us and we were dropping it on the floor:
-- AniList returns `format` and `duration`, TMDB returns `runtime` for a film
-- and `episode_run_time` for a show. Without them an 8 minute short and a
-- 3 hour picture both counted as 115 minutes, and an anime film was
-- indistinguishable from a one-off OVA.
--
-- `runtime_minutes` is per episode for anything episodic and the whole thing
-- for a film, which is exactly how `progress_current` counts, so minutes are
-- always progress x runtime. Manual adds, and every row already on a shelf,
-- leave both empty and fall back to the old flat estimates.

do $$ begin
  create type item_format as enum ('movie','tv','tv_short','ova','ona','special');
exception when duplicate_object then null;
end $$;

alter table public.items
  add column if not exists runtime_minutes smallint
    check (runtime_minutes between 1 and 2000),
  add column if not exists format item_format;
