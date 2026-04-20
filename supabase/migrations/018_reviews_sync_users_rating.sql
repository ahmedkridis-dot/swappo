-- ============================================================
-- 018 — Rating system: keep users.rating_avg / rating_count in sync
--       with the reviews table on every INSERT / UPDATE / DELETE.
--
-- Problem before this migration:
--   rate_swap RPC only wrote to swaps.{proposer,receiver}_rating.
--   Nothing populated public.reviews, so users.rating_avg stayed at 0
--   even for accounts that had received 4+ five-star ratings. The
--   dashboard rendered "—" for every user, forever.
--
-- Structural fix (works for any user, present or future):
--   1. UNIQUE (reviewer_id, swap_id) so the same reviewer can't inflate
--      the target's average with duplicate rows for one swap.
--   2. AFTER INSERT/UPDATE/DELETE trigger on reviews recomputes the
--      target's users.rating_avg + rating_count from the source of
--      truth (reviews table).
--   3. rate_swap RPC now upserts into reviews — the trigger fans out
--      to users automatically.
--   4. Backfill: ratings already sitting in swaps.{proposer,receiver}
--      _rating are copied into reviews once, so accounts that were
--      rated before this migration get their stars retroactively.
-- ============================================================

-- 1. Uniqueness: one review per (reviewer, swap) pair.
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_reviewer_swap_unique UNIQUE (reviewer_id, swap_id);

-- 2. Recomputer (single user).
CREATE OR REPLACE FUNCTION public.sync_user_rating(p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_count int;
  v_avg numeric;
BEGIN
  IF p_user IS NULL THEN RETURN; END IF;
  SELECT COUNT(*), COALESCE(AVG(rating), 0)
    INTO v_count, v_avg
    FROM public.reviews WHERE target_id = p_user;
  UPDATE public.users
    SET rating_count = v_count,
        rating_avg = ROUND(v_avg::numeric, 2)
    WHERE id = p_user;
END;
$$;

-- 3. Trigger wrapper (fans out on INSERT / UPDATE / DELETE).
CREATE OR REPLACE FUNCTION public.reviews_sync_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM public.sync_user_rating(NEW.target_id);
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM public.sync_user_rating(NEW.target_id);
    IF NEW.target_id <> OLD.target_id THEN
      PERFORM public.sync_user_rating(OLD.target_id);
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM public.sync_user_rating(OLD.target_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS reviews_sync_user_rating ON public.reviews;
CREATE TRIGGER reviews_sync_user_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.reviews_sync_trigger();

-- 4. Backfill existing swap-local ratings into reviews.
--    swaps.receiver_rating = rating GIVEN by proposer (target = receiver)
--    swaps.proposer_rating = rating GIVEN by receiver (target = proposer)
INSERT INTO public.reviews (reviewer_id, target_id, swap_id, rating, created_at)
SELECT proposer_id, receiver_id, id, receiver_rating, created_at
FROM public.swaps
WHERE receiver_rating IS NOT NULL
ON CONFLICT (reviewer_id, swap_id) DO NOTHING;

INSERT INTO public.reviews (reviewer_id, target_id, swap_id, rating, created_at)
SELECT receiver_id, proposer_id, id, proposer_rating, created_at
FROM public.swaps
WHERE proposer_rating IS NOT NULL
ON CONFLICT (reviewer_id, swap_id) DO NOTHING;

-- 5. New rate_swap RPC: upserts into reviews; trigger fans out to users.
CREATE OR REPLACE FUNCTION public.rate_swap(p_swap_id uuid, p_rating smallint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_swap public.swaps%rowtype;
  v_target uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode = '28000'; END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'invalid_rating' USING errcode = 'P0001';
  END IF;

  SELECT * INTO v_swap FROM public.swaps WHERE id = p_swap_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'swap_not_found' USING errcode = 'P0002'; END IF;
  IF v_swap.status <> 'completed' THEN RAISE EXCEPTION 'swap_not_completed' USING errcode = 'P0001'; END IF;

  IF v_uid = v_swap.proposer_id THEN
    v_target := v_swap.receiver_id;
    UPDATE public.swaps SET receiver_rating = p_rating WHERE id = p_swap_id;
  ELSIF v_uid = v_swap.receiver_id THEN
    v_target := v_swap.proposer_id;
    UPDATE public.swaps SET proposer_rating = p_rating WHERE id = p_swap_id;
  ELSE
    RAISE EXCEPTION 'not_your_swap' USING errcode = '42501';
  END IF;

  INSERT INTO public.reviews (reviewer_id, target_id, swap_id, rating)
    VALUES (v_uid, v_target, p_swap_id, p_rating)
    ON CONFLICT (reviewer_id, swap_id)
      DO UPDATE SET rating = EXCLUDED.rating;

  RETURN jsonb_build_object('success', true, 'rating', p_rating);
END;
$$;
