-- Comics and novels on anime shelves (U5).
--
-- An anime shelf can now hold what AniList lists as a manga rather than an
-- anime: The Greatest Estate Developer has no anime at all, only the Korean
-- comic. The add panel searches either one, and a title remembers which it is
-- in `format`, so it can read as Reading and count chapters instead of
-- Watching and episodes, and stay out of the watching hours in /wrapped.
--
-- AniList files these by where they come from rather than what they're
-- called, so the app maps its MANGA and ONE_SHOT formats to manga, manhwa or
-- manhua by country, and NOVEL to a light novel when it's Japanese.
--
-- Only new enum values: nothing already stored changes, and every function
-- that casts to item_format (restore_titles, fill_item_runtimes) accepts them
-- as they are.

alter type public.item_format add value if not exists 'manga';
alter type public.item_format add value if not exists 'manhwa';
alter type public.item_format add value if not exists 'manhua';
alter type public.item_format add value if not exists 'light_novel';
alter type public.item_format add value if not exists 'novel';
