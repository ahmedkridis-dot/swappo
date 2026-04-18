-- ============================================================
-- 017_boxes_rls_swap_counterparty.sql
-- Relax boxes + box_items RLS so the COUNTER-PARTY of a swap
-- referencing a box can read the box + its items. Without this,
-- a receiver sees "Swap Box · 0 items" and cannot decide whether
-- to accept the offer (Ahmed 2026-04-18).
-- ============================================================

drop policy if exists boxes_select on public.boxes;
create policy boxes_select on public.boxes for select using (
  owner_id = auth.uid()
  or (kind = 'gift' and status in ('listed','reserved','completed'))
  or exists (
    select 1 from public.swaps s
    where (s.proposer_box_id = boxes.id or s.receiver_box_id = boxes.id)
      and (s.proposer_id = auth.uid() or s.receiver_id = auth.uid())
  )
);

drop policy if exists box_items_select on public.box_items;
create policy box_items_select on public.box_items for select using (
  exists (
    select 1 from public.boxes b
    where b.id = box_items.box_id
      and (
        b.owner_id = auth.uid()
        or (b.kind = 'gift' and b.status in ('listed','reserved','completed'))
        or exists (
          select 1 from public.swaps s
          where (s.proposer_box_id = b.id or s.receiver_box_id = b.id)
            and (s.proposer_id = auth.uid() or s.receiver_id = auth.uid())
        )
      )
  )
);
