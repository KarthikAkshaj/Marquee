-- Restoring a Marquee backup (SPEC §8.10, U7).
--
-- Settings, Data hands out a complete JSON backup, and until now Import could
-- only read titles, statuses and years back out of it. Ratings, notes,
-- progress, dates, favourites, artwork, genres, runtimes and provider links
-- all went in and never came back. These two functions are the way back in.
--
-- Rules, both enforced here rather than trusted to the client:
--
--   * Nothing is ever deleted. A restore inserts what is missing and updates
--     what the file describes. Rows the file says nothing about are untouched,
--     so running this against a live library cannot lose work.
--   * A title is matched on its provider link where it has one, and on its
--     title otherwise, both scoped to one shelf. The exported UUIDs are
--     deliberately ignored: the primary key is global, so reusing them would
--     collide the moment a backup is restored into a second account while the
--     first still exists.
--
-- Both run as the caller, so row level security decides whose rows these are,
-- and both quiet the two triggers that would otherwise rewrite history:
-- `marquee.importing` stops start and finish dates being stamped with today,
-- and `marquee.quiet` stops updated_at being flattened to now.

-- Shelves first: the titles need their ids.
create or replace function public.restore_shelves(shelves jsonb)
returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  found jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if jsonb_typeof(shelves) <> 'array' or jsonb_array_length(shelves) not between 1 and 60 then
    raise exception 'send between 1 and 60 shelves at a time';
  end if;

  insert into public.categories (user_id, name, slug, kind, color, icon, position)
  select auth.uid(),
         s.value->>'name',
         s.value->>'slug',
         (s.value->>'kind')::category_kind,
         s.value->>'color',
         s.value->>'icon',
         coalesce((s.value->>'position')::int, 0)
    from jsonb_array_elements(shelves) as s(value)
  on conflict (user_id, slug) do update
    set name     = excluded.name,
        kind     = excluded.kind,
        color    = excluded.color,
        icon     = excluded.icon,
        position = excluded.position;

  -- The caller needs slug -> id to write titles into the right shelf.
  select jsonb_object_agg(c.slug, c.id) into found
    from public.categories c
   where c.user_id = auth.uid()
     and c.slug in (select s.value->>'slug' from jsonb_array_elements(shelves) as s(value));

  return coalesce(found, '{}'::jsonb);
end $$;

create or replace function public.restore_titles(target_category uuid, rows jsonb)
returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  r        jsonb;
  hit      uuid;
  inserted int := 0;
  updated  int := 0;
  skipped  int := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) not between 1 and 100 then
    raise exception 'send between 1 and 100 titles at a time';
  end if;
  if not exists (select 1 from public.categories c
                  where c.id = target_category and c.user_id = auth.uid()) then
    raise exception 'that shelf is not yours';
  end if;

  perform set_config('marquee.importing', 'on', true);
  perform set_config('marquee.quiet', 'on', true);

  for r in select value from jsonb_array_elements(rows) loop
    hit := null;

    -- A provider link is exact and survives a rename, so it is tried first.
    if coalesce(r->>'source', 'manual') <> 'manual' and nullif(r->>'external_id', '') is not null then
      select i.id into hit
        from public.items i
       where i.user_id = auth.uid()
         and i.category_id = target_category
         and i.source::text = r->>'source'
         and i.external_id = r->>'external_id'
       limit 1;
    end if;

    -- Otherwise, and as a fallback when the same title was added by hand
    -- before, the title is all there is to go on.
    if hit is null then
      select i.id into hit
        from public.items i
       where i.user_id = auth.uid()
         and i.category_id = target_category
         and lower(btrim(i.title)) = lower(btrim(r->>'title'))
       limit 1;
    end if;

    -- One title that will not fit should cost that title, not the batch.
    -- The only realistic failure is the partial unique index on
    -- (user_id, category_id, source, external_id).
    begin
    if hit is null then
      insert into public.items (
        user_id, category_id, title, status, rating, progress_current, progress_total,
        notes, is_favorite, year, started_at, finished_at, cover_url, backdrop_url,
        accent_color, genres, community_score, runtime_minutes, format, source,
        external_id, created_at, updated_at
      ) values (
        auth.uid(),
        target_category,
        r->>'title',
        coalesce((r->>'status')::item_status, 'planned'),
        (r->>'rating')::smallint,
        coalesce((r->>'progress_current')::int, 0),
        (r->>'progress_total')::int,
        nullif(r->>'notes', ''),
        coalesce((r->>'is_favorite')::boolean, false),
        (r->>'year')::smallint,
        nullif(r->>'started_at', '')::date,
        nullif(r->>'finished_at', '')::date,
        nullif(r->>'cover_url', ''),
        nullif(r->>'backdrop_url', ''),
        nullif(r->>'accent_color', ''),
        case when jsonb_typeof(r->'genres') = 'array'
             then array(select jsonb_array_elements_text(r->'genres'))
             else '{}'::text[] end,
        (r->>'community_score')::smallint,
        (r->>'runtime_minutes')::smallint,
        nullif(r->>'format', '')::item_format,
        coalesce((r->>'source')::meta_source, 'manual'),
        nullif(r->>'external_id', ''),
        coalesce(nullif(r->>'created_at', '')::timestamptz, now()),
        coalesce(nullif(r->>'updated_at', '')::timestamptz, now())
      );
      inserted := inserted + 1;
    else
      update public.items set
        title            = r->>'title',
        status           = coalesce((r->>'status')::item_status, status),
        rating           = (r->>'rating')::smallint,
        progress_current = coalesce((r->>'progress_current')::int, 0),
        progress_total   = (r->>'progress_total')::int,
        notes            = nullif(r->>'notes', ''),
        is_favorite      = coalesce((r->>'is_favorite')::boolean, false),
        year             = (r->>'year')::smallint,
        started_at       = nullif(r->>'started_at', '')::date,
        finished_at      = nullif(r->>'finished_at', '')::date,
        cover_url        = nullif(r->>'cover_url', ''),
        backdrop_url     = nullif(r->>'backdrop_url', ''),
        accent_color     = nullif(r->>'accent_color', ''),
        genres           = case when jsonb_typeof(r->'genres') = 'array'
                                then array(select jsonb_array_elements_text(r->'genres'))
                                else '{}'::text[] end,
        community_score  = (r->>'community_score')::smallint,
        runtime_minutes  = (r->>'runtime_minutes')::smallint,
        format           = nullif(r->>'format', '')::item_format,
        source           = coalesce((r->>'source')::meta_source, source),
        external_id      = nullif(r->>'external_id', ''),
        updated_at       = coalesce(nullif(r->>'updated_at', '')::timestamptz, updated_at)
      where id = hit;
      updated := updated + 1;
    end if;
    exception when unique_violation or check_violation then
      skipped := skipped + 1;
    end;
  end loop;

  perform set_config('marquee.importing', 'off', true);
  perform set_config('marquee.quiet', 'off', true);

  return jsonb_build_object('inserted', inserted, 'updated', updated, 'skipped', skipped);
end $$;

revoke all on function public.restore_shelves(jsonb) from public, anon;
revoke all on function public.restore_titles(uuid, jsonb) from public, anon;
grant execute on function public.restore_shelves(jsonb) to authenticated;
grant execute on function public.restore_titles(uuid, jsonb) to authenticated;
