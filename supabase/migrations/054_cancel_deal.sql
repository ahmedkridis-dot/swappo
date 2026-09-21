-- ============================================================
-- 054_cancel_deal.sql
-- Cancelling a deal (Ahmed, 2026-09-21: accepted a gift, the recipient never
-- answered, "Cancel deal" said "No active deal to cancel").
--
-- Until now the browser did it in three separate writes, and the item
-- update silently failed for whoever was not the item's owner (RLS). One
-- function does it all:  cancel_swap_deal(swap)  →  swap 'cancelled', items
-- back to 'available', boxes released, system message in the chat, the
-- other member notified (bell + email).
--
-- Rule for an ACCEPTED deal:
--   · the member who made the request (proposer) can withdraw at any time;
--   · the member who accepted it can cancel once the other side has been
--     silent for 3 days (no chat message since the acceptance / since their
--     last message). can_cancel_deal(swap) tells the interface whether to
--     show the button — the rule itself is not displayed anywhere.
-- A PENDING request can be cancelled by either side at any time.
-- ============================================================

create or replace function public._deal_cancel_allowed(p_swap public.swaps, p_uid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  SILENCE constant interval := interval '3 days';
  v_other uuid;
  v_last  timestamptz;
begin
  if p_uid is null or (p_uid <> p_swap.proposer_id and p_uid <> p_swap.receiver_id) then return false; end if;
  if p_swap.status = 'pending' then return true; end if;
  if p_swap.status <> 'accepted' then return false; end if;
  if p_uid = p_swap.proposer_id then return true; end if;

  v_other := p_swap.proposer_id;
  select max(m.created_at) into v_last
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
   where c.swap_id = p_swap.id and m.sender_id = v_other and coalesce(m.is_system, false) = false;
  return greatest(coalesce(v_last, p_swap.accepted_at), coalesce(p_swap.accepted_at, p_swap.created_at)) < now() - SILENCE;
end;
$$;
revoke all on function public._deal_cancel_allowed(public.swaps, uuid) from public, anon, authenticated;

create or replace function public.can_cancel_deal(p_swap_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_swap public.swaps%rowtype;
begin
  select * into v_swap from public.swaps where id = p_swap_id;
  if not found then return false; end if;
  return public._deal_cancel_allowed(v_swap, auth.uid());
end;
$$;
revoke all on function public.can_cancel_deal(uuid) from public, anon;
grant execute on function public.can_cancel_deal(uuid) to authenticated;

create or replace function public.cancel_swap_deal(p_swap_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_swap   public.swaps%rowtype;
  v_other  uuid;
  v_conv   uuid;
  v_name   text;
  v_was    text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into v_swap from public.swaps where id = p_swap_id for update;
  if not found then raise exception 'swap_not_found' using errcode = 'P0002'; end if;
  if v_uid <> v_swap.proposer_id and v_uid <> v_swap.receiver_id then
    raise exception 'not_your_swap' using errcode = '42501';
  end if;
  if v_swap.status not in ('pending', 'accepted') then
    raise exception 'swap_not_cancellable' using errcode = 'P0001';
  end if;
  if not public._deal_cancel_allowed(v_swap, v_uid) then
    raise exception 'cancel_not_available' using errcode = 'P0001';
  end if;

  v_was := v_swap.status;
  update public.swaps set status = 'cancelled' where id = p_swap_id;

  -- Items reserved by this deal go back on the market.
  update public.items set status = 'available'
   where id in (v_swap.receiver_item_id, v_swap.proposer_item_id) and status = 'reserved';

  -- Swap Box built for this offer: dissolve it, free its items.
  if v_swap.proposer_box_id is not null then
    update public.items set status = 'available' where box_id = v_swap.proposer_box_id and status = 'reserved';
    update public.items set box_id = null where box_id = v_swap.proposer_box_id;
    delete from public.box_items where box_id = v_swap.proposer_box_id;
    update public.boxes set status = 'cancelled' where id = v_swap.proposer_box_id;
  end if;
  -- Gift Box: stays listed, its items are available again.
  if v_swap.receiver_box_id is not null then
    update public.items set status = 'available'
     where id in (select item_id from public.box_items where box_id = v_swap.receiver_box_id) and status = 'reserved';
    update public.boxes set status = 'listed' where id = v_swap.receiver_box_id and status = 'reserved';
  end if;

  v_other := case when v_uid = v_swap.proposer_id then v_swap.receiver_id else v_swap.proposer_id end;
  select id into v_conv from public.conversations where swap_id = p_swap_id limit 1;

  if v_was = 'accepted' then
    select coalesce(nullif(pseudo, ''), 'The other member') into v_name from public.users where id = v_uid;
    if v_conv is not null then
      insert into public.messages (conversation_id, sender_id, content, is_system)
      values (v_conv, null, '❌ Deal cancelled. The items are available again.', true);
    end if;
    insert into public.notifications (user_id, kind, type, title, message, url, payload)
    values (v_other, 'swap_cancelled', 'swap', 'Deal cancelled',
            coalesce(v_name, 'The other member') || ' cancelled your deal. The items are available again.',
            case when v_conv is not null then '/pages/chat.html?conv=' || v_conv else '/pages/profile.html?tab=swap-dashboard&sub=history' end,
            jsonb_build_object('swap_id', p_swap_id, 'conversation_id', v_conv, 'cancelled_by', v_uid,
                               'item_id', v_swap.receiver_item_id));
  end if;

  return jsonb_build_object('success', true, 'swap_id', p_swap_id, 'was', v_was, 'conversation_id', v_conv);
end;
$$;
revoke all on function public.cancel_swap_deal(uuid) from public, anon;
grant execute on function public.cancel_swap_deal(uuid) to authenticated;
