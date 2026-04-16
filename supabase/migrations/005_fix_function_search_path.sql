-- 005_fix_function_search_path.sql
-- Applied via MCP 2026-04-15 by Cowork. Backfilled to the folder 2026-04-16.
--
-- Fix warning sécurité : fonctions avec search_path mutable
-- Cela évite qu'un attaquant puisse rediriger un appel de fonction
-- vers un schéma malicieux en manipulant search_path.

alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.bump_favorites_count() set search_path = public, pg_temp;
alter function public.bump_conversation_preview() set search_path = public, pg_temp;
alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.apply_report_to_user() set search_path = public, pg_temp;
alter function public.bump_swap_count(uuid) set search_path = public, pg_temp;
alter function public.bump_views(uuid) set search_path = public, pg_temp;
alter function public.is_pseudo_available(text) set search_path = public, pg_temp;
