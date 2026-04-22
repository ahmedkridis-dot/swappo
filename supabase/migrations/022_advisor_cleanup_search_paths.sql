-- ============================================================
-- 022 — Clean up the remaining Supabase security advisors
-- (structural, applies to all users).
--
-- WARN: 4 functions have a mutable search_path. That's a known
-- attack surface — a malicious schema on the search path could
-- shadow a builtin call. Lock the path to 'public, pg_temp' on
-- every function we own.
--
-- INFO: public.swap_events had RLS enabled but zero policies, so
-- the table is unreadable from client code. Add a SELECT policy
-- that matches the pattern used for private user data: you see
-- rows only for swaps you are a party to.
-- ============================================================

-- 1. Lock search_path on the four flagged functions.
ALTER FUNCTION public.sync_notification_read()
  SET search_path TO 'public', 'pg_temp';

ALTER FUNCTION public.msgs_denormalize_convo_users()
  SET search_path TO 'public', 'pg_temp';

ALTER FUNCTION public.reviews_sync_trigger()
  SET search_path TO 'public', 'pg_temp';

ALTER FUNCTION public._boxes_touch_updated_at()
  SET search_path TO 'public', 'pg_temp';

-- 2. swap_events: let a user read events from their own swaps.
--    Writes only happen via the record_swap_event trigger (SECURITY
--    DEFINER), so no INSERT/UPDATE/DELETE policy is needed here.
DROP POLICY IF EXISTS swap_events_read ON public.swap_events;
CREATE POLICY swap_events_read ON public.swap_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.swaps s
      WHERE s.id = swap_events.swap_id
        AND (s.proposer_id = auth.uid() OR s.receiver_id = auth.uid())
    )
  );
