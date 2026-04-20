-- ============================================================
-- 019 — Auto-expire boosts via pg_cron (every 5 minutes).
--
-- Problem before: items.is_boosted stayed true forever once boost_expires_at
-- passed. sql/schema.sql already defined expire_boosts() but it was never
-- deployed and never scheduled, so the column drifted.
--
-- Structural fix: enable pg_cron, (re)create expire_boosts() with the
-- hardened search_path pattern used elsewhere, and schedule it every
-- 5 minutes. Works for every item, every user, automatically.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.expire_boosts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE public.items
    SET is_boosted = false
    WHERE is_boosted = true
      AND boost_expires_at IS NOT NULL
      AND boost_expires_at < now();
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

-- Re-running this migration shouldn't pile up duplicate cron jobs.
DO $$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'expire-boosts';
  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;
END $$;

SELECT cron.schedule(
  'expire-boosts',
  '*/5 * * * *',
  $cron$SELECT public.expire_boosts();$cron$
);
