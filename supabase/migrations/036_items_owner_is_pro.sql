-- ============================================================
-- 036_items_owner_is_pro.sql
-- "Priority in search results" for Swappo Pro (pricing page promise).
-- The catalogue sorted on items.is_pro_user, a column that never existed,
-- so Pro members got no priority at all. items.owner_is_pro is kept in
-- sync by triggers (item insert + plan changes) so every feed can order
-- and badge Pro listings without a join.
-- ============================================================

alter table public.items add column if not exists owner_is_pro boolean not null default false;
create index if not exists idx_items_feed_priority on public.items (status, is_boosted desc, owner_is_pro desc, created_at desc);

-- Backfill
update public.items i set owner_is_pro = coalesce(u.is_pro, false) or coalesce(u.plan, '') = 'pro'
  from public.users u where u.id = i.user_id
  and i.owner_is_pro is distinct from (coalesce(u.is_pro, false) or coalesce(u.plan, '') = 'pro');

-- New listing → copy the owner's plan
create or replace function public.items_set_owner_is_pro()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select (coalesce(is_pro, false) or coalesce(plan, '') = 'pro') into new.owner_is_pro
    from public.users where id = new.user_id;
  new.owner_is_pro := coalesce(new.owner_is_pro, false);
  return new;
end;
$$;
drop trigger if exists items_set_owner_is_pro on public.items;
create trigger items_set_owner_is_pro
  before insert on public.items
  for each row execute function public.items_set_owner_is_pro();

-- Plan change (Stripe webhook flips users.is_pro / plan) → all their listings
create or replace function public.users_sync_items_owner_is_pro()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pro boolean := coalesce(new.is_pro, false) or coalesce(new.plan, '') = 'pro';
begin
  if v_pro is distinct from (coalesce(old.is_pro, false) or coalesce(old.plan, '') = 'pro') then
    update public.items set owner_is_pro = v_pro where user_id = new.id and owner_is_pro is distinct from v_pro;
  end if;
  return new;
end;
$$;
drop trigger if exists users_sync_items_owner_is_pro on public.users;
create trigger users_sync_items_owner_is_pro
  after update of is_pro, plan on public.users
  for each row execute function public.users_sync_items_owner_is_pro();
