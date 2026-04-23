-- ============================================================
-- 023 — Deprecate 'aani' as a user-selectable payment method.
--
-- Strategic decision: Swappo does not promote any third-party
-- payment provider for free. Aani / Ziina / Tabby and friends
-- will pay to be featured inside the Deal Tracker once the
-- platform has traction. Until then only user-to-user options
-- (Cash at meetup / Cash on Delivery) are offered.
--
-- The CHECK constraint from migration 009 keeps allowing
-- 'aani' so historical rows stay valid; the frontend just
-- stops offering the choice. New rows will only use
-- 'cash_meetup' or 'cod'.
-- ============================================================

COMMENT ON COLUMN public.swaps.payment_method IS
  'Allowed: cash_meetup, cod. aani deprecated 2026-04-22 — kept in the check constraint for backward compat with existing rows, no longer selectable in the UI.';
