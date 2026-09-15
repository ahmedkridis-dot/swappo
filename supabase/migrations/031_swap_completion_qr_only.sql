-- ============================================================
-- 031_swap_completion_qr_only.sql
-- A deal (and its cash payment) can ONLY be confirmed by the QR scan.
--
-- Problem: the "swaps_update_party" RLS policy lets either party update
-- any column of their swap. The Deal Tracker's "I paid / I received"
-- buttons wrote payer/payee_confirmed_at straight from the browser, and
-- nothing stopped a client from setting status = 'completed' (or the
-- confirmed flags) without ever scanning the QR code.
--
-- Fix:
--   1. BEFORE UPDATE trigger: direct client writes (roles authenticated /
--      anon) cannot complete a swap or touch any confirmation / QR column.
--      SECURITY DEFINER RPCs (confirm_swap_qr, generate_swap_qr, …) run as
--      the function owner and service_role (webhooks, cron) is unaffected.
--   2. confirm_swap_qr also stamps payer/payee_confirmed_at: the scan is
--      the single proof that the handover — and the cash — happened.
-- ============================================================

-- ── 1. Guard trigger ───────────────────────────────────────
create or replace function public.swaps_guard_qr_only_completion()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if new.status = 'completed' and old.status is distinct from 'completed' then
    raise exception 'swap_completion_requires_qr' using errcode = '42501';
  end if;

  if new.proposer_confirmed    is distinct from old.proposer_confirmed
  or new.receiver_confirmed    is distinct from old.receiver_confirmed
  or new.proposer_confirmed_at is distinct from old.proposer_confirmed_at
  or new.receiver_confirmed_at is distinct from old.receiver_confirmed_at
  or new.payer_confirmed_at    is distinct from old.payer_confirmed_at
  or new.payee_confirmed_at    is distinct from old.payee_confirmed_at
  or new.completed_at          is distinct from old.completed_at
  or new.qr_token              is distinct from old.qr_token
  or new.qr_expires_at         is distinct from old.qr_expires_at
  or new.qr_issued_by          is distinct from old.qr_issued_by
  then
    raise exception 'swap_confirmation_requires_qr' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists swaps_guard_qr_only_completion on public.swaps;
create trigger swaps_guard_qr_only_completion
  before update on public.swaps
  for each row execute function public.swaps_guard_qr_only_completion();

-- ── 2. confirm_swap_qr: the scan also settles the payment ──
-- Same as 016 + payer/payee_confirmed_at.
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
    payer_confirmed_at    = coalesce(payer_confirmed_at, now()),
    payee_confirmed_at    = coalesce(payee_confirmed_at, now()),
    status                = 'completed',
    completed_at          = now(),
    qr_token              = null,
    qr_expires_at         = null
  where id = v_swap.id;

  update public.items set status = v_new_item_status
    where id in (v_swap.proposer_item_id, v_swap.receiver_item_id)
      and id is not null;

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

-- ── 3. Undo payment confirmations written by the old buttons ──
-- On deals not completed through the QR scan, those timestamps were
-- only a client-side claim.
update public.swaps
  set payer_confirmed_at = null, payee_confirmed_at = null
  where status <> 'completed'
    and (payer_confirmed_at is not null or payee_confirmed_at is not null);
