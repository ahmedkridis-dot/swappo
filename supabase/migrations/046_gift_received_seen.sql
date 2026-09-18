-- ============================================================
-- 046_gift_received_seen.sql
-- "Claim accepted" / "Gift received" / "Gift given" panels (js/gift-moments.js).
--
-- A Swappo gift is NOT a game of chance: the giver freely chooses who
-- receives the item. Vocabulary in this file, as everywhere else:
-- received / given / recipient / giver / claim accepted.
--
--   1. swaps.recipient_seen_accepted_at / recipient_seen_completed_at /
--      giver_seen_completed_at — each panel is shown once per swap, on any
--      device (no localStorage).
--   2. Column-level ownership: RLS lets both parties update the row, so a
--      guard trigger makes sure each party only stamps ITS OWN columns.
--   3. mark_gift_moment_seen(swap, moment) — stamps with the server clock.
--   4. Give & Earn, for real: every 3 gifts handed over (QR-confirmed) earn
--      the giver one free 3-day boost.
--        give_earn_status()      → {given, per_boost, earned, used, available, progress}
--        use_gift_boost(item_id) → applies the boost, ledger source 'give_earn'
-- ============================================================

-- ── 1. Seen columns ──────────────────────────────────────────
alter table public.swaps
  add column if not exists recipient_seen_accepted_at  timestamptz,
  add column if not exists recipient_seen_completed_at timestamptz,
  add column if not exists giver_seen_completed_at     timestamptz;

-- ── 2. Each party only touches its own columns ───────────────
-- NOT security definer: auth.uid() is the caller's. SQL editor / service
-- role (auth.uid() is null) stays free to fix data.
create or replace function public.swaps_gift_seen_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return new; end if;
  if (new.recipient_seen_accepted_at  is distinct from old.recipient_seen_accepted_at
   or new.recipient_seen_completed_at is distinct from old.recipient_seen_completed_at)
     and v_uid <> old.proposer_id then
    raise exception 'not_your_column' using errcode = '42501';
  end if;
  if new.giver_seen_completed_at is distinct from old.giver_seen_completed_at
     and v_uid <> old.receiver_id then
    raise exception 'not_your_column' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists swaps_gift_seen_guard on public.swaps;
create trigger swaps_gift_seen_guard
  before update of recipient_seen_accepted_at, recipient_seen_completed_at, giver_seen_completed_at
  on public.swaps
  for each row execute function public.swaps_gift_seen_guard();

-- ── 3. Stamp a panel as seen (server clock, idempotent) ──────
create or replace function public.mark_gift_moment_seen(p_swap_id uuid, p_moment text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_swap record;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_moment not in ('accepted', 'completed') then
    raise exception 'invalid_moment' using errcode = 'P0001';
  end if;
  select id, proposer_id, receiver_id, is_giveaway_claim into v_swap
    from public.swaps where id = p_swap_id;
  if not found then raise exception 'swap_not_found' using errcode = 'P0002'; end if;
  if not coalesce(v_swap.is_giveaway_claim, false) then
    raise exception 'not_a_gift' using errcode = 'P0001';
  end if;

  if v_uid = v_swap.proposer_id then            -- the recipient
    if p_moment = 'accepted' then
      update public.swaps set recipient_seen_accepted_at = coalesce(recipient_seen_accepted_at, now()) where id = p_swap_id;
    else
      update public.swaps set recipient_seen_completed_at = coalesce(recipient_seen_completed_at, now()),
                              recipient_seen_accepted_at  = coalesce(recipient_seen_accepted_at, now())
       where id = p_swap_id;
    end if;
  elsif v_uid = v_swap.receiver_id then         -- the giver
    if p_moment = 'completed' then
      update public.swaps set giver_seen_completed_at = coalesce(giver_seen_completed_at, now()) where id = p_swap_id;
    end if;
  else
    raise exception 'not_your_swap' using errcode = '42501';
  end if;
  return jsonb_build_object('success', true);
end;
$$;
revoke all on function public.mark_gift_moment_seen(uuid, text) from public;
grant execute on function public.mark_gift_moment_seen(uuid, text) to authenticated;

-- ── 4. Give & Earn ───────────────────────────────────────────
alter table public.boost_purchases drop constraint if exists boost_purchases_source_check;
alter table public.boost_purchases add constraint boost_purchases_source_check
  check (source in ('stripe', 'pro_included', 'give_earn'));

create or replace function public.give_earn_status()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  PER_BOOST constant int := 3;
  v_uid    uuid := auth.uid();
  v_given  int := 0;
  v_used   int := 0;
  v_earned int := 0;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  -- A gift counts once it is handed over: claim accepted, then QR-confirmed.
  select count(*) into v_given from public.swaps
    where receiver_id = v_uid and is_giveaway_claim = true and status = 'completed';
  select count(*) into v_used from public.boost_purchases
    where user_id = v_uid and source = 'give_earn';
  v_earned := v_given / PER_BOOST;
  return jsonb_build_object(
    'given',     v_given,
    'per_boost', PER_BOOST,
    'earned',    v_earned,
    'used',      v_used,
    'available', greatest(v_earned - v_used, 0),
    'progress',  v_given % PER_BOOST
  );
end;
$$;
revoke all on function public.give_earn_status() from public;
grant execute on function public.give_earn_status() to authenticated;

create or replace function public.use_gift_boost(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  GE_TIER   constant text := '3d';
  GE_DAYS   constant int  := 3;
  v_uid     uuid := auth.uid();
  v_status  jsonb;
  v_item    record;
  v_from    timestamptz;
  v_expires timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  -- Serialise per user so two taps can't spend the same boost twice.
  perform pg_advisory_xact_lock(hashtext('give_earn:' || v_uid::text));
  v_status := public.give_earn_status();
  if (v_status->>'available')::int <= 0 then
    raise exception 'gift_boosts_exhausted' using errcode = 'P0001';
  end if;

  select id, user_id, status, boost_expires_at into v_item
    from public.items where id = p_item_id for update;
  if not found then raise exception 'item_not_found' using errcode = 'P0002'; end if;
  if v_item.user_id <> v_uid then raise exception 'not_your_item' using errcode = '42501'; end if;
  if v_item.status <> 'available' then raise exception 'item_not_available' using errcode = 'P0001'; end if;

  -- Same rule as the Stripe webhook: extend a running boost, else start now.
  v_from := case when v_item.boost_expires_at is not null and v_item.boost_expires_at > now()
                 then v_item.boost_expires_at else now() end;
  v_expires := v_from + make_interval(days => GE_DAYS);

  insert into public.boost_purchases (user_id, item_id, tier, duration_days, amount_aed, stripe_session_id, source)
    values (v_uid, p_item_id, GE_TIER, GE_DAYS, 0, null, 'give_earn');

  update public.items
     set is_boosted = true, boost_expires_at = v_expires
   where id = p_item_id;

  return jsonb_build_object(
    'success',    true,
    'item_id',    p_item_id,
    'tier',       GE_TIER,
    'expires_at', v_expires,
    'available',  (v_status->>'available')::int - 1
  );
end;
$$;
revoke all on function public.use_gift_boost(uuid) from public;
grant execute on function public.use_gift_boost(uuid) to authenticated;
