-- Phase 3: a snapshot of provider metadata, filled when a title is added from
-- search (SPEC §7). Groundwork for recommendations: the user's own ratings per
-- genre against the community score. Manual titles leave both empty.

alter table public.items
  add column if not exists genres text[] not null default '{}'
    check (cardinality(genres) <= 12),
  add column if not exists community_score smallint
    check (community_score between 0 and 100);
