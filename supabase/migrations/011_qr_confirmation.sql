-- ============================================================
-- 011_qr_confirmation.sql
-- Real QR-code swap confirmation flow.
-- Author: Ahmed + Claude (phase 1)  ·  2026-04-18
--
-- Replaces the prototype "Simulate Scan" button by a genuine
-- QR handshake between the two parties of an accepted swap:
--
--   1. Party A calls rpc.generate_swap_qr(swap_id)
--        → returns a fresh 32-char token + expires_at (now + 10s)
--      The client renders the token as a real QR image pointing to
--      https://swappo.ae/pages/confirm.html?t=<token>
--
--   2. Party B scans the QR with their phone's camera, lands on
--      confirm.html authenticated, and the page calls
--      rpc.confirm_swap_qr(token)
--      → server checks: token exists, not expired, caller is the
--        counterparty (NOT the issuer), swap is accepted.
--      → flips BOTH confirmed flags, sets status='completed',
--        flips items to swapped/sold, bumps swap_count for both.
--
-- Tokens are single-use and invalidated on completion.
-- No geolocation / fraud logic in this migration — that's phase 2.
-- ============================================================

-- ── 1. Columns ─────────────────────────────────────────────
alter table public.swaps
  add column if not exists qr_token              text,
  add column if not exists qr_expires_at         timestamptz,
  add column if not exists qr_issued_by          uuid references public.users(id),
  add column if not exists proposer_confirmed_at timestamptz,
  add column if not exists receiver_confirmed_at timestamptz;

-- Partial unique index on active tokens (so old tokens can coexist as null)
create unique index if not exists swaps_qr_token_uniq
  on public.swaps(qr_token) where qr_token is not null;

-- ── 2. generate_swap_qr(swap_id) ──────────────────────────
-- Caller must be one of the two parties, swap must be 'accepted'.
create or replace function public.generate_swap_qr(p_swap_id uuid)
returns table (qr_token text, expires_at timestamptz)
language plpgsql
security definer
-- `extensions` is required because gen_random_bytes() lives in the
-- extensions schema on Supabase (not in public).
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_swap    public.swaps%rowtype;
  v_token   text;
  v_expires timestamptz;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_swap from public.swaps where id = p_swap_id;
  if not found then
    raise exception 'swap_not_found' using errcode = 'P0002';
  end if;

  if v_uid <> v_swap.proposer_id and v_uid <> v_swap.receiver_id then
    raise exception 'not_your_swap' using errcode = '42501';
  end if;

  if v_swap.status <> 'accepted' then
    raise exception 'swap_not_accepted' using errcode = 'P0001';
  end if;

  if v_swap.proposer_confirmed and v_swap.receiver_confirmed then
    raise exception 'swap_already_completed' using errcode = 'P0001';
  end if;

  -- 32-char hex token (16 random bytes = 128 bits of entropy)
  v_token   := encode(extensions.gen_random_bytes(16), 'hex');
  v_expires := now() + interval '10 seconds';

  update public.swaps
    set qr_token      = v_token,
        qr_expires_at = v_expires,
        qr_issued_by  = v_uid
    where id = p_swap_id;

  return query select v_token, v_expires;
end;
$$;

revoke all on function public.generate_swap_qr(uuid) from public;
grant execute on function public.generate_swap_qr(uuid) to authenticated;

-- ── 3. confirm_swap_qr(token) ─────────────────────────────
-- Caller must be the COUNTERPARTY of the issuer. Single scan
-- completes the swap (both flags flip, items updated, counts bumped).
create or replace function public.confirm_swap_qr(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid             uuid := auth.uid();
  v_swap            public.swaps%rowtype;
  v_new_item_status text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_token is null or length(p_token) < 16 then
    raise exception 'invalid_token' using errcode = 'P0001';
  end if;

  -- Lock the row so a second scanner can't race us
  select * into v_swap from public.swaps
    where qr_token = p_token
    for update;

  if not found then
    raise exception 'qr_not_found_or_consumed' using errcode = 'P0002';
  end if;

  if v_swap.qr_expires_at is null or v_swap.qr_expires_at < now() then
    raise exception 'qr_expired' using errcode = 'P0001';
  end if;

  if v_swap.status <> 'accepted' then
    raise exception 'swap_not_accepted' using errcode = 'P0001';
  end if;

  if v_uid <> v_swap.proposer_id and v_uid <> v_swap.receiver_id then
    raise exception 'not_your_swap' using errcode = '42501';
  end if;

  -- Security: the scanner must be the OTHER party, not the issuer.
  -- This prevents the issuer from self-scanning on the same device.
  if v_uid = v_swap.qr_issued_by then
    raise exception 'cannot_scan_own_qr' using errcode = '42501';
  end if;

  -- Both confirmed — atomic completion
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

  update public.items set status = v_new_item_status
    where id in (v_swap.proposer_item_id, v_swap.receiver_item_id)
      and id is not null;

  perform public.bump_swap_count(v_swap.proposer_id);
  perform public.bump_swap_count(v_swap.receiver_id);

  return jsonb_build_object(
    'success',        true,
    'completed',      true,
    'swap_id',        v_swap.id,
    'proposer_id',    v_swap.proposer_id,
    'receiver_id',    v_swap.receiver_id,
    'is_purchase',    v_swap.is_purchase
  );
end;
$$;

revoke all on function public.confirm_swap_qr(text) from public;
grant execute on function public.confirm_swap_qr(text) to authenticated;

-- ── 4. Housekeeping: cheap view to peek at a QR's state from the
--    client without reading the whole swaps row (RLS-friendly).
create or replace function public.peek_swap_qr(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  v_uid  uuid := auth.uid();
  v_swap public.swaps%rowtype;
begin
  if v_uid is null then return jsonb_build_object('valid', false, 'reason', 'auth'); end if;
  select * into v_swap from public.swaps where qr_token = p_token;
  if not found then return jsonb_build_object('valid', false, 'reason', 'not_found'); end if;
  if v_swap.qr_expires_at < now() then return jsonb_build_object('valid', false, 'reason', 'expired'); end if;
  if v_uid <> v_swap.proposer_id and v_uid <> v_swap.receiver_id then
    return jsonb_build_object('valid', false, 'reason', 'not_yours');
  end if;
  if v_uid = v_swap.qr_issued_by then
    return jsonb_build_object('valid', false, 'reason', 'own_qr');
  end if;
  return jsonb_build_object(
    'valid',   true,
    'swap_id', v_swap.id,
    'expires_at', v_swap.qr_expires_at
  );
end;
$$;

revoke all on function public.peek_swap_qr(text) from public;
grant execute on function public.peek_swap_qr(text) to authenticated;
