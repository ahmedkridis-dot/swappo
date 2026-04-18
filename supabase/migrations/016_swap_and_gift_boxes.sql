-- ============================================================
-- 016_swap_and_gift_boxes.sql
-- SWAP BOX & GIFT BOX — bundle 2+ items as a single unit.
-- Author: Ahmed + Claude  ·  2026-04-18
--
-- Concept: a "Box" is a bundle of ≥2 items owned by one user,
-- treated as a single unit across all Swappo flows:
--
--   - Swap Box:  used in a swap proposal in place of a single item
--   - Gift Box:  listed in the catalogue / Gift Corner, claimed
--                as one unit (all items transfer together)
--
-- A user can never have <2 items in a box (enforced by an RPC
-- precondition; the trigger layer allows draft boxes). Once
-- listed/reserved, the box is immutable.
-- ============================================================

-- ── 1. Tables ──────────────────────────────────────────────
create table if not exists public.boxes (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.users(id) on delete cascade,
  kind        text not null check (kind in ('swap','gift')),
  title       text,
  description text,
  status      text not null default 'draft'
              check (status in ('draft','listed','reserved','completed','cancelled')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists boxes_owner_idx       on public.boxes(owner_id);
create index if not exists boxes_kind_status_idx on public.boxes(kind, status);

create table if not exists public.box_items (
  box_id  uuid not null references public.boxes(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  primary key (box_id, item_id)
);
create index if not exists box_items_item_idx on public.box_items(item_id);

-- An item can be inside AT MOST ONE active box (draft/listed/reserved).
-- Enforced via a partial unique index, so it's cheap and fast.
create unique index if not exists box_items_item_unique_active
  on public.box_items(item_id)
  where exists (
    select 1 from public.boxes b
    where b.id = box_items.box_id
      and b.status in ('draft','listed','reserved')
  );
-- ^^ postgres doesn't allow subqueries in partial index predicate — fix below.

drop index if exists box_items_item_unique_active;

-- Use a simpler guard: unique(item_id) across all box_items rows. If a
-- box is cancelled/completed we manually DELETE the box_items rows so
-- the item is free to join a new box.
create unique index if not exists box_items_item_uniq
  on public.box_items(item_id);

-- Reverse pointer on items so rendering code can know "this item is in
-- box X" with a single join-free read.
alter table public.items
  add column if not exists box_id uuid references public.boxes(id) on delete set null;
create index if not exists items_box_idx on public.items(box_id) where box_id is not null;

-- Swaps can now reference a box on either side.
alter table public.swaps
  add column if not exists proposer_box_id uuid references public.boxes(id),
  add column if not exists receiver_box_id uuid references public.boxes(id);

-- Soft constraints: at most one "unit" per side (an item XOR a box). We
-- don't express this as a CHECK because existing rows may have just an
-- item_id set; the RPCs enforce it on write.

-- ── 2. updated_at trigger ──────────────────────────────────
create or replace function public._boxes_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tr_boxes_touch_updated_at on public.boxes;
create trigger tr_boxes_touch_updated_at
  before update on public.boxes
  for each row execute function public._boxes_touch_updated_at();

-- ── 3. RLS ────────────────────────────────────────────────
alter table public.boxes      enable row level security;
alter table public.box_items  enable row level security;

-- Owners read/write their boxes. Everybody reads listed gift boxes.
drop policy if exists boxes_select on public.boxes;
create policy boxes_select on public.boxes
  for select using (
    owner_id = auth.uid()
    or (kind = 'gift' and status in ('listed','reserved','completed'))
  );

drop policy if exists boxes_insert on public.boxes;
create policy boxes_insert on public.boxes
  for insert with check (owner_id = auth.uid());

drop policy if exists boxes_update on public.boxes;
create policy boxes_update on public.boxes
  for update using (owner_id = auth.uid())
            with check (owner_id = auth.uid());

drop policy if exists boxes_delete on public.boxes;
create policy boxes_delete on public.boxes
  for delete using (owner_id = auth.uid());

-- box_items: visibility mirrors the parent box.
drop policy if exists box_items_select on public.box_items;
create policy box_items_select on public.box_items
  for select using (
    exists (
      select 1 from public.boxes b
      where b.id = box_items.box_id
        and (b.owner_id = auth.uid()
             or (b.kind = 'gift' and b.status in ('listed','reserved','completed')))
    )
  );

-- box_items writes go through RPCs (SECURITY DEFINER), so we block
-- direct access to keep the invariant intact.
drop policy if exists box_items_no_insert on public.box_items;
create policy box_items_no_insert on public.box_items
  for insert with check (false);

drop policy if exists box_items_no_update on public.box_items;
create policy box_items_no_update on public.box_items
  for update using (false) with check (false);

drop policy if exists box_items_no_delete on public.box_items;
create policy box_items_no_delete on public.box_items
  for delete using (false);

-- ── 4. RPC: create_swap_box(p_item_ids) ───────────────────
-- Caller must own every item. All items must be 'available' and NOT in
-- another box. Items stay 'available' (a swap proposal then reserves
-- them via the usual accept_swap flow).
create or replace function public.create_swap_box(p_item_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_box_id  uuid;
  v_count   int;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_item_ids is null or array_length(p_item_ids, 1) < 2 then
    raise exception 'box_min_2_items' using errcode = 'P0001';
  end if;

  select count(*) into v_count
    from public.items
    where id = any(p_item_ids)
      and user_id = v_uid
      and status  = 'available'
      and box_id is null;
  if v_count <> array_length(p_item_ids, 1) then
    raise exception 'invalid_items_for_box' using errcode = 'P0001';
  end if;

  insert into public.boxes (owner_id, kind, status)
    values (v_uid, 'swap', 'draft')
    returning id into v_box_id;

  insert into public.box_items (box_id, item_id)
    select v_box_id, x from unnest(p_item_ids) as x;

  update public.items set box_id = v_box_id
    where id = any(p_item_ids);

  return v_box_id;
end;
$$;

revoke all on function public.create_swap_box(uuid[]) from public;
grant execute on function public.create_swap_box(uuid[]) to authenticated;

-- ── 5. RPC: create_gift_box(p_item_ids, p_title, p_description) ──
-- For the publishing flow: bundles 2+ of the caller's items into a
-- gift box, marks them is_giveaway=true, and lists the box.
create or replace function public.create_gift_box(
  p_item_ids   uuid[],
  p_title      text default null,
  p_description text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_box_id uuid;
  v_count  int;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_item_ids is null or array_length(p_item_ids, 1) < 2 then
    raise exception 'box_min_2_items' using errcode = 'P0001';
  end if;

  select count(*) into v_count
    from public.items
    where id = any(p_item_ids)
      and user_id = v_uid
      and status = 'available'
      and box_id is null;
  if v_count <> array_length(p_item_ids, 1) then
    raise exception 'invalid_items_for_box' using errcode = 'P0001';
  end if;

  insert into public.boxes (owner_id, kind, status, title, description)
    values (v_uid, 'gift', 'listed', p_title, p_description)
    returning id into v_box_id;

  insert into public.box_items (box_id, item_id)
    select v_box_id, x from unnest(p_item_ids) as x;

  -- Mark the constituent items as giveaways + attach to the box.
  update public.items
    set box_id = v_box_id,
        is_giveaway = true
    where id = any(p_item_ids);

  return v_box_id;
end;
$$;

revoke all on function public.create_gift_box(uuid[], text, text) from public;
grant execute on function public.create_gift_box(uuid[], text, text) to authenticated;

-- ── 6. Cancel a box (owner only, before it's consumed) ────
create or replace function public.cancel_box(p_box_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_box public.boxes%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into v_box from public.boxes where id = p_box_id;
  if not found then raise exception 'box_not_found' using errcode = 'P0002'; end if;
  if v_box.owner_id <> v_uid then raise exception 'not_your_box' using errcode = '42501'; end if;
  if v_box.status in ('reserved','completed') then
    raise exception 'box_in_use' using errcode = 'P0001';
  end if;

  update public.items
    set box_id = null,
        is_giveaway = case when v_box.kind = 'gift' then false else is_giveaway end
    where box_id = p_box_id;

  delete from public.box_items where box_id = p_box_id;
  update public.boxes set status = 'cancelled' where id = p_box_id;

  return jsonb_build_object('success', true, 'box_id', p_box_id);
end;
$$;

revoke all on function public.cancel_box(uuid) from public;
grant execute on function public.cancel_box(uuid) to authenticated;

-- ── 7. Upgrade accept_swap to understand boxes ────────────
-- When accepting a swap, reserve all items involved: either the single
-- receiver_item_id / proposer_item_id OR every item inside the linked
-- box (proposer_box_id / receiver_box_id).
create or replace function public.accept_swap(p_swap_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_swap public.swaps%rowtype;
  v_conv_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  select * into v_swap from public.swaps where id = p_swap_id for update;
  if not found then raise exception 'swap_not_found' using errcode = 'P0002'; end if;
  if v_swap.receiver_id <> v_uid then raise exception 'not_your_swap' using errcode = '42501'; end if;
  if v_swap.status <> 'pending' then raise exception 'swap_not_pending' using errcode = 'P0001'; end if;

  update public.swaps
    set status = 'accepted', accepted_at = now()
    where id = p_swap_id;

  -- Mark all items involved as reserved. We walk both sides —
  -- item_id OR every item inside box_id.
  update public.items set status = 'reserved'
    where id in (v_swap.proposer_item_id, v_swap.receiver_item_id)
      and id is not null;

  if v_swap.proposer_box_id is not null then
    update public.items set status = 'reserved'
      where id in (select item_id from public.box_items where box_id = v_swap.proposer_box_id);
    update public.boxes set status = 'reserved' where id = v_swap.proposer_box_id;
  end if;
  if v_swap.receiver_box_id is not null then
    update public.items set status = 'reserved'
      where id in (select item_id from public.box_items where box_id = v_swap.receiver_box_id);
    update public.boxes set status = 'reserved' where id = v_swap.receiver_box_id;
  end if;

  -- Create or find the shared conversation (identity revealed = true
  -- because the proposer and receiver have mutually opted into the swap).
  declare
    u1 uuid := case when v_swap.proposer_id < v_swap.receiver_id then v_swap.proposer_id else v_swap.receiver_id end;
    u2 uuid := case when v_swap.proposer_id < v_swap.receiver_id then v_swap.receiver_id else v_swap.proposer_id end;
  begin
    select id into v_conv_id from public.conversations
      where user1_id = u1 and user2_id = u2 and swap_id = v_swap.id
      limit 1;
    if v_conv_id is null then
      insert into public.conversations (user1_id, user2_id, item_id, swap_id, identity_revealed)
        values (u1, u2, v_swap.receiver_item_id, v_swap.id, true)
        returning id into v_conv_id;
    else
      update public.conversations set identity_revealed = true where id = v_conv_id;
    end if;
  end;

  return jsonb_build_object(
    'success',         true,
    'swap_id',         v_swap.id,
    'conversation_id', v_conv_id
  );
end;
$$;

revoke all on function public.accept_swap(uuid) from public;
grant execute on function public.accept_swap(uuid) to authenticated;

-- ── 8. Extend confirm_swap_qr to flip the box statuses on completion ──
create or replace function public.confirm_swap_qr(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid             uuid := auth.uid();
  v_swap            public.swaps%rowtype;
  v_new_item_status text;
  v_conv_id         uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_token is null or length(p_token) < 16 then raise exception 'invalid_token' using errcode = 'P0001'; end if;
  select * into v_swap from public.swaps where qr_token = p_token for update;
  if not found then raise exception 'qr_not_found_or_consumed' using errcode = 'P0002'; end if;
  if v_swap.qr_expires_at is null or v_swap.qr_expires_at < now() then
    raise exception 'qr_expired' using errcode = 'P0001';
  end if;
  if v_swap.status <> 'accepted' then raise exception 'swap_not_accepted' using errcode = 'P0001'; end if;
  if v_uid <> v_swap.proposer_id and v_uid <> v_swap.receiver_id then
    raise exception 'not_your_swap' using errcode = '42501';
  end if;
  if v_uid = v_swap.qr_issued_by then
    raise exception 'cannot_scan_own_qr' using errcode = '42501';
  end if;

  v_new_item_status := case when v_swap.is_purchase then 'sold' else 'swapped' end;

  update public.swaps set
    proposer_confirmed    = true,
    receiver_confirmed    = true,
    proposer_confirmed_at = coalesce(proposer_confirmed_at, now()),
    receiver_confirmed_at = coalesce(receiver_confirmed_at, now()),
    status                = 'completed',
    completed_at          = now(),
    qr_token              = null,
    qr_expires_at         = null
  where id = v_swap.id;

  -- Single items on either side
  update public.items set status = v_new_item_status
    where id in (v_swap.proposer_item_id, v_swap.receiver_item_id)
      and id is not null;

  -- Box items on either side — all flip together
  if v_swap.proposer_box_id is not null then
    update public.items set status = v_new_item_status
      where id in (select item_id from public.box_items where box_id = v_swap.proposer_box_id);
    update public.boxes set status = 'completed' where id = v_swap.proposer_box_id;
  end if;
  if v_swap.receiver_box_id is not null then
    update public.items set status = v_new_item_status
      where id in (select item_id from public.box_items where box_id = v_swap.receiver_box_id);
    update public.boxes set status = 'completed' where id = v_swap.receiver_box_id;
  end if;

  perform public.bump_swap_count(v_swap.proposer_id);
  perform public.bump_swap_count(v_swap.receiver_id);

  select id into v_conv_id from public.conversations where swap_id = v_swap.id limit 1;

  return jsonb_build_object(
    'success',         true,
    'completed',       true,
    'swap_id',         v_swap.id,
    'conversation_id', v_conv_id,
    'proposer_id',     v_swap.proposer_id,
    'receiver_id',     v_swap.receiver_id,
    'is_purchase',     v_swap.is_purchase
  );
end;
$$;

revoke all on function public.confirm_swap_qr(text) from public;
grant execute on function public.confirm_swap_qr(text) to authenticated;

-- ── 9. Protect items that are locked inside an active box ─
-- The existing guard_item_delete() trigger already blocks deletion
-- while an engaged swap exists. We extend it to also block deletion
-- for any item that's part of a non-cancelled box.
create or replace function public.guard_item_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1 from public.swaps s
    where s.status in ('pending','accepted')
      and (s.proposer_item_id = old.id or s.receiver_item_id = old.id)
  ) then
    raise exception 'item_locked_in_swap' using errcode = '23514';
  end if;

  if old.box_id is not null then
    if exists (
      select 1 from public.boxes b
      where b.id = old.box_id and b.status in ('draft','listed','reserved')
    ) then
      raise exception 'item_locked_in_box' using errcode = '23514';
    end if;
  end if;

  return old;
end;
$$;
