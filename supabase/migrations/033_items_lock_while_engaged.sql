-- ============================================================
-- 033_items_lock_while_engaged.sql
-- A listing can be edited by its owner, but NOT while a deal is in
-- progress (Ahmed, 2026-09-16).
--
-- Why: once someone has proposed a swap / claimed a gift / accepted a
-- deal on an item, the owner changing the price, photos or description
-- underneath them is a bait-and-switch. Same rule as the delete guard
-- (migration 006), applied to edits.
--
-- What is locked: the "listing" columns (what the counterparty saw when
-- they engaged). Status / boost / auto-decline / shipping / box columns
-- are NOT guarded — the swap RPCs and the client flows keep updating
-- those as before. SECURITY DEFINER RPCs run as the function owner, and
-- service_role (webhooks, cron) is unaffected: only direct client writes
-- (roles authenticated / anon) are checked.
--
-- Locked when: the item is not 'available' (reserved / swapped / sold /
-- removed) OR a swap in status pending / accepted references it.
-- ============================================================

create or replace function public.items_guard_edit_while_engaged()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  -- Only listing columns are guarded.
  if new.category     is not distinct from old.category
  and new.subcategory is not distinct from old.subcategory
  and new.type        is not distinct from old.type
  and new.brand       is not distinct from old.brand
  and new.model       is not distinct from old.model
  and new.condition   is not distinct from old.condition
  and new.year        is not distinct from old.year
  and new.size        is not distinct from old.size
  and new.color       is not distinct from old.color
  and new.photos      is not distinct from old.photos
  and new.is_giveaway is not distinct from old.is_giveaway
  and new.price       is not distinct from old.price
  and new.description is not distinct from old.description
  and new.specs       is not distinct from old.specs
  and new.emirate     is not distinct from old.emirate
  and new.city        is not distinct from old.city
  then
    return new;
  end if;

  if old.status is distinct from 'available' then
    raise exception 'item_locked_by_active_swap' using errcode = '42501';
  end if;

  -- item_can_be_deleted (006) is SECURITY DEFINER: counts pending / accepted
  -- swaps on the item without being filtered by the caller's RLS.
  if not public.item_can_be_deleted(old.id) then
    raise exception 'item_locked_by_active_swap' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists items_guard_edit_while_engaged on public.items;
create trigger items_guard_edit_while_engaged
  before update on public.items
  for each row execute function public.items_guard_edit_while_engaged();

-- Client helper: can this listing be edited right now?
-- Mirrors item_can_be_deleted (006) + the status check above.
create or replace function public.item_can_be_edited(item_id_in uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.items i
    where i.id = item_id_in
      and i.status = 'available'
      and not exists (
        select 1 from public.swaps s
        where (s.receiver_item_id = i.id or s.proposer_item_id = i.id)
          and s.status in ('pending', 'accepted')
      )
  );
$$;

grant execute on function public.item_can_be_edited(uuid) to authenticated;

-- ── Data fix: brands stored as the literal "Other" / "N/A" ──────────
-- Before the free-text brand input (2026-09-16) the wizard stored the
-- placeholder itself, which then showed up as the listing title
-- ("Other Sk20"). No brand is the honest value.
update public.items
   set brand = ''
 where lower(btrim(coalesce(brand, ''))) in ('other', 'n/a');
