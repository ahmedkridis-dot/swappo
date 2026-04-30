-- ============================================================
-- 025 — Capacitor mobile push notifications: token storage.
--
-- The native shell (iOS APNs / Android FCM) hands us a device token
-- after the user grants notifications. We persist it here keyed by
-- (user_id, token) so a single user can have multiple devices and
-- a single device can rotate its token (FCM does this on reinstall).
--
-- Edge Functions (push-fanout) read this table to dispatch notifs to
-- every active device when a new offer / message / accepted swap
-- lands in public.notifications.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON public.push_tokens(user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- A user can only see / write / delete their own tokens. The fanout
-- worker uses the service role which bypasses RLS, so cross-user reads
-- on the worker side stay possible.
DROP POLICY IF EXISTS push_tokens_self ON public.push_tokens;
CREATE POLICY push_tokens_self ON public.push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Touch updated_at on token refresh.
CREATE OR REPLACE FUNCTION public._touch_push_token_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_tokens_touch ON public.push_tokens;
CREATE TRIGGER push_tokens_touch
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW EXECUTE FUNCTION public._touch_push_token_updated_at();
