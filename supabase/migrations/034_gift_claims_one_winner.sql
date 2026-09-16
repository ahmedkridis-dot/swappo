-- ============================================================
-- 034_gift_claims_one_winner.sql
-- Gift Corner claims (Ahmed, 2026-09-17):
--   1. A user can have only ONE pending claim per gift.
--   2. When the giver accepts a claim, every other pending claim on the
--      same gift is declined automatically and each claimer is notified:
--      "This gift went to someone else — your claim is still available."
--      (a declined claim does not count against the monthly quota, which
--      the pages now compute on accepted / completed claims only).
-- Runs at the database level so it holds for accept_swap(), the profile
-- dashboard, or any future client.
-- ============================================================

-- ── 1. One pending claim per (claimer, gift) ─────────────────
-- Keep the most recent pending claim of any existing duplicate pair,
-- decline the older ones, then enforce with a partial unique index.
update public.swaps set status = 'declined'
 where id in (
   select id from (
     select id, row_number() over (partition by proposer_id, receiver_item_id order by created_at desc) as rn
       from public.swaps
      where is_giveaway_claim and status = 'pending'
   ) x where rn > 1
 );

create unique index if not exists swaps_one_pending_gift_claim_per_user
  on public.swaps (proposer_id, receiver_item_id)
  where is_giveaway_claim and status = 'pending';

-- ── 2. Accepting one claim declines the others ───────────────
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

  return new;
end;
$$;

drop trigger if exists swaps_gift_claim_accept_declines_others on public.swaps;
create trigger swaps_gift_claim_accept_declines_others
  after update of status on public.swaps
  for each row execute function public.gift_claim_accept_declines_others();
