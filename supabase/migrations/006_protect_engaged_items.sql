-- ============================================
-- Swappo — Migration 006: Protect items engaged in a swap
--
-- Decision 2026-04-16 (Ahmed):
--   Once someone claims/requests a gift or proposes a swap for an item,
--   the item's owner MUST NOT be able to delete it until the swap is
--   resolved (completed / cancelled / declined / expired).
--
-- Without this protection, a bad actor could "accept" a gift claim and
-- then delete the item to make it disappear — essentially bait-and-switch.
--
-- Implementation: a BEFORE DELETE trigger on public.items that raises
-- EXCEPTION when the item is referenced by any swap whose status is
-- pending or accepted. Cancelled / declined / expired / completed swaps
-- do not block deletion (those are closed states).
-- ============================================

CREATE OR REPLACE FUNCTION public.guard_item_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  blocking_count int;
BEGIN
  SELECT COUNT(*) INTO blocking_count
  FROM public.swaps
  WHERE (receiver_item_id = OLD.id OR proposer_item_id = OLD.id)
    AND status IN ('pending', 'accepted');

  IF blocking_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete item %: there are % pending or accepted swap(s) against it. Resolve the swap(s) first (cancel, decline or complete).',
      OLD.id, blocking_count
      USING ERRCODE = 'P0001';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS items_guard_delete ON public.items;
CREATE TRIGGER items_guard_delete
  BEFORE DELETE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.guard_item_delete();

-- Convenience helper for the client: returns true if the item can be deleted
-- right now (no active swaps). Saves the client from doing the SQL itself.
CREATE OR REPLACE FUNCTION public.item_can_be_deleted(item_id_in uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.swaps
    WHERE (receiver_item_id = item_id_in OR proposer_item_id = item_id_in)
      AND status IN ('pending', 'accepted')
  );
$$;

GRANT EXECUTE ON FUNCTION public.item_can_be_deleted(uuid) TO authenticated;
