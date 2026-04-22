-- ============================================================
-- 021 — Harden public.users_public (Supabase advisor: CRITICAL).
--
-- Before: the view was SECURITY DEFINER (the default for Postgres
-- views). That meant every user querying it bypassed their own RLS
-- and used the view-creator's permissions. Advisor flagged it.
--
-- Structural fix (works for all users, not a patch):
--   1. SECURITY INVOKER on the view → each user hits it with their
--      own permissions.
--   2. New RLS policy users_read_public on public.users lets any
--      role SELECT rows of non-deleted, non-suspended users. This
--      is what the view needs to return results as INVOKER.
--   3. Column-level privileges stop authenticated / anon from
--      SELECTing PII (email, phone, name, city, emirate, recovery_
--      email, recovery_phone) or admin/meta (points_balance,
--      reports_count, deleted_at, updated_at, notif_email_*).
--      They can still read the safe columns users_public already
--      exposes, so the view and every other SELECT of safe fields
--      keeps working.
--   4. New SECURITY DEFINER RPC get_my_user_row() returns the full
--      row for auth.uid() — the only path self-PII (recovery,
--      notif prefs, etc.) now travels. Any other user id: denied.
-- ============================================================

-- 1. Convert the view to SECURITY INVOKER.
ALTER VIEW public.users_public SET (security_invoker = true);

-- 2. Public-read RLS on users (non-deleted + non-suspended).
DROP POLICY IF EXISTS users_read_public ON public.users;
CREATE POLICY users_read_public ON public.users
  FOR SELECT
  USING (
    COALESCE(is_deleted, false) = false
    AND COALESCE(is_suspended, false) = false
  );

-- 3. Column-level privileges: replace the default blanket SELECT with
-- a safe-columns-only grant. PII + admin fields stay ungranted.
REVOKE SELECT ON public.users FROM authenticated;
REVOKE SELECT ON public.users FROM anon;
GRANT SELECT (
  id, pseudo, display_name, avatar, plan, is_pro, swap_count, badge,
  rating_avg, rating_count, created_at, badge_last_activity_at,
  is_deleted, is_suspended
) ON public.users TO authenticated, anon;

-- Views with SECURITY INVOKER need the caller to have SELECT on the
-- view itself (separate from the table grants above).
GRANT SELECT ON public.users_public TO authenticated, anon;

-- 4. Self-only escape hatch for PII / user preferences. Every self
-- read of recovery_email / recovery_phone / notif_email_* / email /
-- phone / etc. must go through here.
CREATE OR REPLACE FUNCTION public.get_my_user_row()
RETURNS public.users
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT * FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_user_row() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_user_row() TO authenticated;
