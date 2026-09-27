-- ============================================================
-- 056_remove_item_soft.sql
-- "Delete" on a listing failed for any item that ever had an offer or a
-- claim, even a cancelled one (Ahmed, 2026-09-28: barbecue →
-- "null value in column receiver_item_id of relation swaps violates
-- not-null constraint"): the browser hard-deleted the row, and the
-- swaps → items foreign key is ON DELETE SET NULL on a NOT NULL column.
--
-- A member's delete is now a soft delete through remove_item():
--   · status → 'removed' (already allowed by the status check),
--     boost cleared, the item leaves every list and the map;
--   · offers, claims, chat history, impact counters, boost ledger and the
--     moderation trail are kept (a hard delete would also cascade-delete
--     boost purchases);
--   · refused while a pending / accepted swap references the item, or
--     while the item sits in a live box — same rules as guard_item_delete.
-- The row-level DELETE right stays for the owner, but the site no longer
-- uses it.
-- ============================================================
alter table public.items add column if not exists removed_at timestamptz;

create or replace function public.remove_item(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_item public.items%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into v_item from public.items where id = p_item_id for update;
  if not found then raise exception 'item_not_found' using errcode = 'P0002'; end if;
  if v_item.user_id <> v_uid then raise exception 'not_your_item' using errcode = '42501'; end if;
  if v_item.status = 'removed' then
    return jsonb_build_object('success', true, 'item_id', p_item_id, 'already', true);
  end if;
  if exists (select 1 from public.swaps s
              where s.status in ('pending', 'accepted')
                and (s.proposer_item_id = p_item_id or s.receiver_item_id = p_item_id)) then
    raise exception 'item_locked_by_active_swap' using errcode = 'P0001';
  end if;
  if v_item.box_id is not null and exists (
       select 1 from public.boxes b where b.id = v_item.box_id and b.status in ('draft', 'listed', 'reserved')) then
    raise exception 'item_locked_in_box' using errcode = 'P0001';
  end if;

  update public.items
     set status = 'removed', removed_at = now(), is_boosted = false, boost_expires_at = null
   where id = p_item_id;
  -- Nobody keeps a ghost in their Saved list.
  delete from public.favorites where item_id = p_item_id;

  return jsonb_build_object('success', true, 'item_id', p_item_id);
end;
$$;
revoke all on function public.remove_item(uuid) from public, anon;
grant execute on function public.remove_item(uuid) to authenticated;
