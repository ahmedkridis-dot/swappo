-- ============================================
-- Swappo — Migration 026: Stripe billing columns
--
-- Stripe is used ONLY for Swappo revenue (Pro subscription + boosts).
-- It never touches user-to-user deals (see CLAUDE.md rule #3).
--
-- Written by the stripe-webhook Edge Function (service role).
-- Read by the client through get_my_user_row / users_public.
-- Safe to re-run: all statements are idempotent.
-- ============================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS plan_interval          TEXT CHECK (plan_interval IN ('month','year')),
  ADD COLUMN IF NOT EXISTS pro_expires_at         TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_stripe_customer
  ON public.users(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_pro_expires
  ON public.users(pro_expires_at)
  WHERE pro_expires_at IS NOT NULL;

COMMENT ON COLUMN public.users.stripe_customer_id     IS 'Stripe cus_… — one per account, created on first checkout.';
COMMENT ON COLUMN public.users.stripe_subscription_id IS 'Stripe sub_… of the active Pro subscription (NULL when Free).';
COMMENT ON COLUMN public.users.plan_interval          IS 'month | year — billing period of the active Pro subscription.';
COMMENT ON COLUMN public.users.pro_expires_at         IS 'End of the paid period. plan stays pro until then even if cancelled.';

-- Ledger of one-off boost purchases (audit + idempotency for webhook retries).
CREATE TABLE IF NOT EXISTS public.boost_purchases (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_id            UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  tier               TEXT NOT NULL CHECK (tier IN ('24h','3d','7d')),
  duration_days      INT  NOT NULL CHECK (duration_days > 0),
  amount_aed         INT  NOT NULL CHECK (amount_aed > 0),
  stripe_session_id  TEXT NOT NULL UNIQUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.boost_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS boost_purchases_select_own ON public.boost_purchases;
CREATE POLICY boost_purchases_select_own
  ON public.boost_purchases FOR SELECT
  USING (auth.uid() = user_id);
-- No INSERT/UPDATE/DELETE policies: only the service role (webhook) writes.

CREATE INDEX IF NOT EXISTS idx_boost_purchases_user ON public.boost_purchases(user_id, created_at DESC);

-- Nightly safety net: downgrade Pro accounts whose paid period is over and
-- whose subscription is gone (webhook missed / retried past its window).
CREATE OR REPLACE FUNCTION public.expire_lapsed_pro()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.users
     SET plan = 'free',
         is_pro = false,
         plan_interval = NULL,
         stripe_subscription_id = NULL
   WHERE is_pro = true
     AND pro_expires_at IS NOT NULL
     AND pro_expires_at < now() - INTERVAL '3 days';
$$;

-- Schedule only if pg_cron is available (it is on Supabase). Idempotent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('expire-lapsed-pro') WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'expire-lapsed-pro'
    );
    PERFORM cron.schedule('expire-lapsed-pro', '15 3 * * *', 'SELECT public.expire_lapsed_pro();');
  END IF;
END $$;
