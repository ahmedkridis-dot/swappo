-- ============================================================
-- 048_notify_declined_offer.sql
-- Declining an offer was a bare status update: the member who made the
-- offer was never told (Ahmed, 2026-09-18 — two offers declined, zero
-- notification). Now the database itself notifies, whatever the client:
--
--   pending → declined  ⇒  notifications row for the proposer
--     · offer / swap  : kind 'swap_declined', link to the item with
--                       ?reoffer=<swap id> → "Change my offer" (product page
--                       re-opens the offer form, new offer linked to the old
--                       one through swaps.parent_offer_id)
--     · gift claim    : kind 'gift_declined' (no renegotiation on a gift)
--   The email goes out through the normal dispatch (migration 047).
--
-- The automatic decline of the other gift claims (034) already writes its
-- own "went to someone else" notification: it raises a transaction-local
-- flag so this trigger stays quiet for those rows.
-- ============================================================

-- ── 1. Auto-decline of other gift claims: raise the flag ─────
create or replace function public.gift_claim_accept_declines_others()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
begin
  if not coalesce(new.is_giveaway_claim, false) then return new; end if;
  if new.status <> 'accepted' or old.status is not distinct from 'accepted' then return new; end if;
  if new.receiver_item_id is null then return new; end if;

  perform set_config('swappo.auto_decline', '1', true);
  for r in
    with declined as (
      update public.swaps s
         set status = 'declined'
       where s.receiver_item_id = new.receiver_item_id
         and s.is_giveaway_claim
         and s.status = 'pending'
         and s.id <> new.id
       returning s.id, s.proposer_id
    )
    select id, proposer_id from declined
  loop
    insert into public.notifications (user_id, kind, type, title, message, url, payload)
    values (
      r.proposer_id,
      'gift_declined',
      'gift',
      'This gift went to someone else',
      'This gift went to someone else — your claim is still available.',
      '/pages/giveaway.html',
      jsonb_build_object('swap_id', r.id, 'item_id', new.receiver_item_id)
    );
  end loop;
  perform set_config('swappo.auto_decline', '0', true);

  return new;
end;
$$;

-- ── 2. Every other decline notifies the proposer ─────────────
create or replace function public.swaps_notify_declined()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item   record;
  v_title  text := 'the item';
  v_offer  text;
begin
  if new.status <> 'declined' or old.status is distinct from 'pending' then return new; end if;
  if coalesce(current_setting('swappo.auto_decline', true), '0') = '1' then return new; end if;

  if new.receiver_item_id is not null then
    select brand, model, type into v_item from public.items where id = new.receiver_item_id;
    if found then
      v_title := coalesce(nullif(trim(
        (case when coalesce(v_item.brand, '') ~* '^(other|n/a)$' then '' else coalesce(v_item.brand, '') end)
        || ' ' || coalesce(v_item.model, '')), ''), nullif(v_item.type, ''), 'the item');
    end if;
  end if;

  if coalesce(new.is_giveaway_claim, false) then
    insert into public.notifications (user_id, kind, type, title, message, url, payload)
    values (
      new.proposer_id, 'gift_declined', 'gift',
      'Your claim was declined',
      'The giver declined your claim on ' || v_title || '. Your monthly claim is still available.',
      '/pages/giveaway.html',
      jsonb_build_object('swap_id', new.id, 'item_id', new.receiver_item_id, 'item_title', v_title)
    );
    return new;
  end if;

  v_offer := case
    when coalesce(new.cash_amount, 0) > 0 and new.proposer_item_id is null and new.proposer_box_id is null
      then 'Your offer of ' || trim(to_char(new.cash_amount, 'FM999G999G999')) || ' AED on ' || v_title
    else 'Your offer on ' || v_title
  end;

  insert into public.notifications (user_id, kind, type, title, message, url, payload)
  values (
    new.proposer_id, 'swap_declined',
    case when new.is_purchase then 'offer' else 'swap' end,
    'Your offer was declined',
    v_offer || ' was declined. You can change it and send a new one.',
    case when new.receiver_item_id is not null
         then '/pages/product.html?id=' || new.receiver_item_id || '&reoffer=' || new.id
         else '/pages/profile.html?tab=swap-dashboard&sub=history' end,
    jsonb_build_object(
      'swap_id', new.id, 'item_id', new.receiver_item_id, 'item_title', v_title,
      'cash_amount', coalesce(new.cash_amount, 0), 'is_purchase', coalesce(new.is_purchase, false),
      'can_reoffer', new.receiver_item_id is not null)
  );
  return new;
end;
$$;

drop trigger if exists swaps_notify_declined on public.swaps;
create trigger swaps_notify_declined
  after update of status on public.swaps
  for each row execute function public.swaps_notify_declined();
