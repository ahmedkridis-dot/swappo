-- ============================================================
-- 040_ban_on_fake_listing.sql
-- One fake listing = account closed, immediately, no warnings
-- (Ahmed, 2026-09-17). Moderation runbook: docs/MODERATION.md
--
-- Set a listing to status 'suspended' → the owner is banned:
--   users.is_banned / banned_at / ban_reason ('fake_listing'), plus
--   is_suspended = true so users_public (cards, profiles) drops them;
--   their other live listings → 'suspended'; their pending swaps, offers
--   and gift claims → 'cancelled'; a 'banned' notification (emailed).
-- A banned member can still sign in and read notifications, but RLS
-- refuses INSERT on items / swaps / messages. Nothing is deleted;
-- admin_unban_user(email) reverses it.
-- ============================================================

-- ── 2a. columns ─────────────────────────────────────────────
alter table public.users
  add column if not exists is_banned  boolean not null default false,
  add column if not exists banned_at  timestamptz,
  add column if not exists ban_reason text;

-- items.status gains 'suspended'
alter table public.items drop constraint if exists items_status_check;
alter table public.items add constraint items_status_check
  check (status = any (array['available','reserved','swapped','sold','removed','suspended']));

-- ── 2b. trigger: listing suspended → owner banned ───────────
create or replace function public.items_ban_owner_on_suspend()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_already boolean;
  v_title   text;
begin
  if new.status <> 'suspended' or old.status = 'suspended' then return new; end if;

  -- Loop guard: the cascade below re-fires this trigger for the owner's
  -- other listings; once the owner is banned there is nothing to do.
  select is_banned into v_already from public.users where id = new.user_id;
  if coalesce(v_already, false) then return new; end if;

  update public.users
     set is_banned = true, banned_at = now(), ban_reason = 'fake_listing',
         is_suspended = true, suspended_at = coalesce(suspended_at, now()),
         suspended_reason = coalesce(suspended_reason, 'fake_listing')
   where id = new.user_id;

  update public.items set status = 'suspended'
   where user_id = new.user_id and id <> new.id and status in ('available', 'reserved');

  update public.swaps set status = 'cancelled'
   where (proposer_id = new.user_id or receiver_id = new.user_id) and status = 'pending';

  v_title := nullif(btrim(coalesce(new.brand, '') || ' ' || coalesce(new.model, '')), '');
  v_title := coalesce(v_title, nullif(new.type, ''), 'your listing');

  insert into public.notifications (user_id, kind, type, title, message, url, payload)
  values (
    new.user_id, 'banned', 'account',
    'Account closed',
    'Your listing "' || v_title || '" was removed because it doesn''t show a real item. On Swappo, one fake listing closes the account. If you think this is a mistake, write to contact@swappo.ae.',
    '/pages/profile.html',
    jsonb_build_object('item_id', new.id, 'item_title', v_title, 'reason', 'fake_listing')
  );
  return new;
end;
$$;

drop trigger if exists on_item_suspended on public.items;
create trigger on_item_suspended
  after update of status on public.items
  for each row execute function public.items_ban_owner_on_suspend();

-- ── 2c. email: the 'banned' notification is always emailed ──
create or replace function public.should_email_user(p_user_id uuid, p_kind text)
 returns boolean
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  u public.users%rowtype;
begin
  select * into u from public.users where id = p_user_id;
  if not found then return false; end if;
  if u.email is null or u.email = '' then return false; end if;
  -- Account decisions are not a notification preference.
  if p_kind = 'banned' then return true; end if;
  if not u.notif_email_enabled then return false; end if;
  return case p_kind
    when 'swap_proposed'   then u.notif_email_swap_proposed
    when 'offer_received'  then u.notif_email_swap_proposed
    when 'swap_accepted'   then u.notif_email_swap_accepted
    when 'swap_declined'   then u.notif_email_swap_declined
    when 'counter_offer'   then u.notif_email_counter_offer
    when 'quota_low'       then u.notif_email_quota_low
    when 'new_message'     then u.notif_email_new_message
    else false
  end;
end;
$function$;

create or replace function public.notifications_email_dispatch()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_url text := public._swappo_email_fn_url();
  v_key text := public._swappo_service_role_key();
begin
  if v_url is null or v_key is null then return new; end if;
  if new.kind not in ('swap_proposed', 'offer_received',
                      'swap_accepted', 'swap_declined',
                      'counter_offer', 'quota_low', 'banned') then
    return new;
  end if;
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := jsonb_build_object('notification_id', new.id)
  );
  return new;
end;
$$;

-- ── 2d. RLS: a banned member cannot publish, claim, offer or message ──
create or replace function public.current_user_is_banned()
returns boolean
language sql
stable security definer
set search_path = public, pg_temp
as $$
  select coalesce((select is_banned from public.users where id = auth.uid()), false);
$$;
grant execute on function public.current_user_is_banned() to authenticated, anon;

drop policy if exists "items_insert_self" on public.items;
create policy "items_insert_self" on public.items for insert
  with check ((select auth.uid()) = user_id and not public.current_user_is_banned());

drop policy if exists "swaps_insert_proposer" on public.swaps;
create policy "swaps_insert_proposer" on public.swaps for insert
  with check ((select auth.uid()) = proposer_id and not public.current_user_is_banned());

drop policy if exists "msg_insert_sender" on public.messages;
create policy "msg_insert_sender" on public.messages for insert
  with check (
    (select auth.uid()) = sender_id
    and not public.current_user_is_banned()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and ((select auth.uid()) = c.user1_id or (select auth.uid()) = c.user2_id)
    )
  );

-- ── 2e. reversible ─────────────────────────────────────────
create or replace function public.admin_unban_user(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid uuid;
  v_items int := 0;
begin
  select id into v_uid from auth.users where lower(email) = lower(p_email);
  if v_uid is null then raise exception 'user_not_found: %', p_email; end if;
  update public.users
     set is_banned = false, banned_at = null, ban_reason = null,
         is_suspended = false, suspended_at = null, suspended_reason = null
   where id = v_uid;
  update public.items set status = 'available' where user_id = v_uid and status = 'suspended';
  get diagnostics v_items = row_count;
  return jsonb_build_object('user_id', v_uid, 'items_restored', v_items);
end;
$$;
revoke all on function public.admin_unban_user(text) from public, anon, authenticated;
