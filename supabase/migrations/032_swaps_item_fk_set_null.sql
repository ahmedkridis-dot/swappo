-- Swappo — Migration 032: deleting an item must not delete the deal
-- swaps.receiver_item_id was ON DELETE CASCADE: removing the item silently
-- erased the swap while its conversation survived (orphaned chat, "no deal
-- to cancel", items stuck in reserved). Align with proposer_item_id:
-- keep the swap row, null the reference. Idempotent.
ALTER TABLE public.swaps DROP CONSTRAINT IF EXISTS swaps_receiver_item_id_fkey;
ALTER TABLE public.swaps
  ADD CONSTRAINT swaps_receiver_item_id_fkey
  FOREIGN KEY (receiver_item_id) REFERENCES public.items(id) ON DELETE SET NULL;
