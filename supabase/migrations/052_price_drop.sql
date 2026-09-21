-- ============================================================
-- 052_price_drop.sql
-- When a seller lowers a price (Ahmed, 2026-09-21):
--   1. the listing keeps the old price → cards and product page show
--      "1,800 → 1,500 AED" (old price struck through);
--   2. the members who showed interest — saved the item, or made an offer
--      on it — get a 'price_drop' notification (bell + email through the
--      normal dispatch, migration 047).
-- A price that goes back up clears the old price: we never show a fake
-- discount. One notice per member and item per 24 h, so a seller fiddling
-- with the price cannot spam anyone.
-- ============================================================
alter table public.items
  add column if not exists previous_price   numeric,
  add column if not exists price_changed_at timestamptz;

-- ── 1. Remember the old price ────────────────────────────────
create or replace function public.items_track_price()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.price is not distinct from old.price then return new; end if;
  new.price_changed_at := now();
  if coalesce(new.is_giveaway, false) or coalesce(new.price, 0) <= 0 or coalesce(old.price, 0) <= 0 then
    new.previous_price := null;
  elsif new.price < old.price then
    -- Several drops in a row keep the highest price seen as the reference.
    new.previous_price := greatest(old.price, coalesce(old.previous_price, 0));
  elsif old.previous_price is not null and new.price < old.previous_price then
    new.previous_price := old.previous_price;      -- went up, still under the reference
  else
    new.previous_price := null;                    -- back to (or above) the old price
  end if;
  return new;
end;
$$;
drop trigger if exists items_track_price on public.items;
create trigger items_track_price
  before update of price on public.items
  for each row execute function public.items_track_price();

-- ── 2. Tell the interested members ───────────────────────────
create or replace function public.items_notify_price_drop()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_title text;
  r record;
begin
  if new.price is not distinct from old.price then return new; end if;
  if not (coalesce(old.price, 0) > 0 and coalesce(new.price, 0) > 0 and new.price < old.price) then return new; end if;
  if new.status <> 'available' or coalesce(new.is_giveaway, false) then return new; end if;

  v_title := coalesce(nullif(trim(
    (case when coalesce(new.brand, '') ~* '^(other|n/a)$' then '' else coalesce(new.brand, '') end)
    || ' ' || coalesce(new.model, '')), ''), nullif(new.type, ''), 'An item you like');

  for r in
    select distinct uid from (
      select f.user_id as uid from public.favorites f where f.item_id = new.id
      union
      select s.proposer_id from public.swaps s
       where s.receiver_item_id = new.id and s.status in ('pending', 'declined', 'cancelled', 'expired')
    ) x
    join public.users u on u.id = x.uid
    where x.uid <> new.user_id
      and coalesce(u.is_banned, false) = false
      and not exists (
        select 1 from public.notifications n
         where n.user_id = x.uid and n.kind = 'price_drop'
           and n.payload->>'item_id' = new.id::text
           and n.created_at > now() - interval '24 hours')
  loop
    insert into public.notifications (user_id, kind, type, title, message, url, payload)
    values (
      r.uid, 'price_drop', 'item',
      'Price drop: ' || v_title,
      v_title || ' is now ' || trim(to_char(new.price, 'FM999G999G999')) || ' AED (was '
        || trim(to_char(old.price, 'FM999G999G999')) || ' AED).',
      '/pages/product.html?id=' || new.id,
      jsonb_build_object('item_id', new.id, 'item_title', v_title,
                         'old_price', old.price, 'new_price', new.price)
    );
  end loop;
  return new;
end;
$$;
drop trigger if exists items_notify_price_drop on public.items;
create trigger items_notify_price_drop
  after update of price on public.items
  for each row execute function public.items_notify_price_drop();
