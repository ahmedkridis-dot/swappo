-- ============================================================
-- 035_pro_included_boosts.sql
-- Swappo Pro includes 3 boosts / month (pricing page, SUBSCRIPTION_TIERS).
-- Until now every "Boost" click went to Stripe Checkout, Pro or not
-- (Ahmed, 2026-09-17). This adds the server side of included boosts:
--
--   pro_boosts_status()          → {is_pro, used, limit, remaining, resets_on}
--   use_pro_boost(p_item_id)     → applies a 3-day boost to the caller's own
--                                  listing, paid by the Pro plan, max 3 per
--                                  calendar month. Logged in boost_purchases
--                                  with source = 'pro_included', amount 0.
--
-- The included tier is fixed server-side (3 days = the 10 AED tier; three
-- of them roughly equal the 29 AED subscription). Change PRO_TIER below to
-- move it; the client never chooses the included tier.
-- ============================================================

-- ── 1. Ledger accepts included boosts (no Stripe session, 0 AED) ──
alter table public.boost_purchases
  add column if not exists source text not null default 'stripe'
    check (source in ('stripe', 'pro_included'));
alter table public.boost_purchases alter column stripe_session_id drop not null;
alter table public.boost_purchases drop constraint if exists boost_purchases_amount_aed_check;
alter table public.boost_purchases add constraint boost_purchases_amount_aed_check check (amount_aed >= 0);
create index if not exists idx_boost_purchases_pro_month
  on public.boost_purchases (user_id, created_at) where source = 'pro_included';

-- ── 2. Status for the client ─────────────────────────────────
create or replace function public.pro_boosts_status()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_user  record;
  v_limit int := 3;
  v_used  int := 0;
  v_pro   boolean := false;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select is_pro, plan, pro_expires_at into v_user from public.users where id = v_uid;
  v_pro := coalesce(v_user.is_pro, false) or coalesce(v_user.plan, '') = 'pro';
  if v_pro and v_user.pro_expires_at is not null and v_user.pro_expires_at < now() - interval '3 days' then
    v_pro := false;  -- grace period for late renewals
  end if;
  select count(*) into v_used from public.boost_purchases
    where user_id = v_uid and source = 'pro_included'
      and created_at >= date_trunc('month', now());
  return jsonb_build_object(
    'is_pro',    v_pro,
    'used',      v_used,
    'limit',     v_limit,
    'remaining', greatest(v_limit - v_used, 0),
    'resets_on', (date_trunc('month', now()) + interval '1 month')::date
  );
end;
$$;
revoke all on function public.pro_boosts_status() from public;
grant execute on function public.pro_boosts_status() to authenticated;

-- ── 3. Use one included boost ────────────────────────────────
create or replace function public.use_pro_boost(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  PRO_TIER  constant text := '3d';
  PRO_DAYS  constant int  := 3;
  v_uid     uuid := auth.uid();
  v_status  jsonb;
  v_item    record;
  v_from    timestamptz;
  v_expires timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  v_status := public.pro_boosts_status();
  if not (v_status->>'is_pro')::boolean then
    raise exception 'pro_required' using errcode = '42501';
  end if;
  if (v_status->>'remaining')::int <= 0 then
    raise exception 'pro_boosts_exhausted' using errcode = 'P0001';
  end if;

  select id, user_id, status, boost_expires_at into v_item
    from public.items where id = p_item_id for update;
  if not found then raise exception 'item_not_found' using errcode = 'P0002'; end if;
  if v_item.user_id <> v_uid then raise exception 'not_your_item' using errcode = '42501'; end if;
  if v_item.status <> 'available' then raise exception 'item_not_available' using errcode = 'P0001'; end if;

  -- Same rule as the Stripe webhook: extend a running boost, else start now.
  v_from := case when v_item.boost_expires_at is not null and v_item.boost_expires_at > now()
                 then v_item.boost_expires_at else now() end;
  v_expires := v_from + make_interval(days => PRO_DAYS);

  insert into public.boost_purchases (user_id, item_id, tier, duration_days, amount_aed, stripe_session_id, source)
    values (v_uid, p_item_id, PRO_TIER, PRO_DAYS, 0, null, 'pro_included');

  update public.items
     set is_boosted = true, boost_expires_at = v_expires
   where id = p_item_id;

  return jsonb_build_object(
    'success',    true,
    'item_id',    p_item_id,
    'tier',       PRO_TIER,
    'expires_at', v_expires,
    'used',       (v_status->>'used')::int + 1,
    'limit',      (v_status->>'limit')::int,
    'remaining',  (v_status->>'remaining')::int - 1
  );
end;
$$;
revoke all on function public.use_pro_boost(uuid) from public;
grant execute on function public.use_pro_boost(uuid) to authenticated;
