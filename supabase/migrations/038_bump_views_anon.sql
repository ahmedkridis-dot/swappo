-- ============================================================
-- 038_bump_views_anon.sql
-- Views must reflect every visitor's navigation, not only signed-in
-- members: ad traffic and shared links land as guests. bump_views() is
-- SECURITY DEFINER and only increments a counter (the client already
-- de-duplicates per session and skips the owner), so anon may call it.
-- ============================================================
grant execute on function public.bump_views(uuid) to anon;
