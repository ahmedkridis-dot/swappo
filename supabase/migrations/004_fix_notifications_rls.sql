-- 004_fix_notifications_rls.sql
-- Applied via MCP 2026-04-15 by Cowork. Backfilled to the folder 2026-04-16.
--
-- Fix principal : les notifications étaient impossibles à créer
-- (403 new row violates row-level security policy for table "notifications")
--
-- Politique : tout user authentifié peut créer une notif (pour lui-même ou un autre user
-- dans le cadre d'une action : offre, message, swap). La vérification du "qui peut notifier qui"
-- est gérée au niveau applicatif — pour un MVP c'est suffisant.
-- On pourra durcir plus tard via SECURITY DEFINER function si besoin.

create policy "notif_insert_authenticated"
  on public.notifications
  for insert
  to authenticated
  with check ((select auth.uid()) is not null);

-- Les users peuvent supprimer leurs propres notifs (pour le bouton "dismiss")
create policy "notif_delete_self"
  on public.notifications
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
