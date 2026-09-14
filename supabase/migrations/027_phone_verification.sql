-- ============================================
-- Swappo — Migration 027: Phone verification (dormant until FEATURES.PHONE_VERIFICATION)
--
-- Email stays the login identifier. A verified phone is an additional
-- trust signal attached to the account → "✓ Verified" badge.
--
-- The phone number itself is NEVER exposed to other users: users_public
-- gains is_verified only. users.phone already exists (migration 003).
-- Safe to re-run: all statements are idempotent.
-- ============================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_verified       BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.users.is_verified IS
  'TRUE when phone_verified_at is set. Later also via UAE Pass.';

-- One verified number per account.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_verified
  ON public.users(phone) WHERE phone_verified_at IS NOT NULL;

-- ── Public read: badge visible, number hidden ─────────────
-- Extend the safe-columns grant from migration 021 (is_verified only).
GRANT SELECT (is_verified) ON public.users TO authenticated, anon;

-- CREATE OR REPLACE VIEW may only append columns → is_verified goes last.
CREATE OR REPLACE VIEW public.users_public AS
  SELECT id,
         COALESCE(NULLIF(display_name, ''), pseudo,
                  'Swapper#' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 4))) AS display_name,
         pseudo, avatar, plan, is_pro, swap_count, badge,
         COALESCE(rating_avg, 0)   AS rating_avg,
         COALESCE(rating_count, 0) AS rating_count,
         created_at,
         COALESCE(is_verified, false) AS is_verified
    FROM public.users
   WHERE COALESCE(is_deleted,   false) = false
     AND COALESCE(is_suspended, false) = false;

ALTER VIEW public.users_public SET (security_invoker = true);
GRANT SELECT ON public.users_public TO anon, authenticated;

-- ── Clients cannot self-grant the badge ───────────────────
-- users_update_self lets a user UPDATE their own row; this trigger pins
-- is_verified / phone_verified_at unless the change comes through the
-- confirm_phone_verified() RPC below (which sets a transaction-local GUC).
CREATE OR REPLACE FUNCTION public.guard_phone_verification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.phone_verify', true) IS DISTINCT FROM 'on' THEN
    NEW.is_verified       := OLD.is_verified;
    NEW.phone_verified_at := OLD.phone_verified_at;
    -- Changing the number invalidates a previous verification.
    IF NEW.phone IS DISTINCT FROM OLD.phone AND OLD.phone_verified_at IS NOT NULL THEN
      NEW.is_verified       := false;
      NEW.phone_verified_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_phone_verification ON public.users;
CREATE TRIGGER trg_guard_phone_verification
  BEFORE UPDATE OF is_verified, phone_verified_at, phone ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_phone_verification();

-- ── The only path to a verified badge ─────────────────────
-- Called by js/phone-verify.js right after auth.verifyOtp(type='phone_change')
-- succeeds. Trusts Supabase Auth (auth.users.phone_confirmed_at), not the client.
CREATE OR REPLACE FUNCTION public.confirm_phone_verified()
RETURNS public.users_public
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_phone text;
  v_conf  timestamptz;
  v_row   public.users_public;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_signed_in' USING ERRCODE = '28000';
  END IF;

  SELECT phone, phone_confirmed_at INTO v_phone, v_conf
    FROM auth.users WHERE id = v_uid;

  IF v_phone IS NULL OR v_conf IS NULL THEN
    RAISE EXCEPTION 'phone_not_confirmed' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users
              WHERE phone = v_phone AND phone_verified_at IS NOT NULL AND id <> v_uid) THEN
    RAISE EXCEPTION 'phone_taken' USING ERRCODE = '23505';
  END IF;

  PERFORM set_config('app.phone_verify', 'on', true);
  UPDATE public.users
     SET phone             = v_phone,
         phone_verified_at = now(),
         is_verified       = true
   WHERE id = v_uid;

  SELECT * INTO v_row FROM public.users_public WHERE id = v_uid;
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_phone_verified() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_phone_verified() TO authenticated;
