-- ============================================================
-- 047_email_all_notifications.sql
-- Every notification also goes out by email (Ahmed, 2026-09-18).
--
-- Until now the dispatch trigger and should_email_user() worked from a
-- closed list of kinds: gift_claimed (every Gift Corner claim) was never
-- emailed, and new_message was dropped from the list when 041 rewrote it.
-- 19 gift claims in 48 h reached the bell and zero reached an inbox.
--
-- New rule: a row inserted in public.notifications is emailed whatever its
-- kind — present or future. No more whitelist.
--   · should_email_user(): master switch + the existing fine-grained
--     preferences stay; unknown kinds → TRUE (was FALSE).
--   · notifications_email_dispatch(): no kind filter, only an (empty)
--     blacklist for kinds that must stay in-app.
--   · No double send: notifications.emailed_at — the Edge Function claims
--     the row before sending and refuses a row that is already claimed.
--   · Anti-burst for new_message only: one email per conversation per
--     10 minutes; everything else leaves immediately.
-- ============================================================

-- ── 1. Preferences: unknown kinds are emailed ────────────────
create or replace function public.should_email_user(p_user_id uuid, p_kind text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
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
    when 'gift_claimed'    then u.notif_email_swap_proposed
    when 'swap_accepted'   then u.notif_email_swap_accepted
    when 'swap_declined'   then u.notif_email_swap_declined
    when 'counter_offer'   then u.notif_email_counter_offer
    when 'quota_low'       then u.notif_email_quota_low
    when 'new_message'     then u.notif_email_new_message
    else true               -- any other kind, present or future
  end;
end;
$$;

-- ── 2. Dispatch: every kind, minus the in-app-only blacklist ─
create or replace function public.notifications_email_dispatch()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_url  text := public._swappo_email_fn_url();
  v_key  text := coalesce(public._swappo_service_role_key(), public._swappo_anon_key());
  v_conv text;
begin
  if v_url is null or v_key is null then return new; end if;
  -- Add here the kinds that must stay purely in-app.
  if new.kind in ('_never_email') then return new; end if;
  if new.emailed_at is not null then return new; end if;

  -- Anti-burst, chat messages only: one email per conversation per 10 min.
  -- The first email opens the chat, where the following messages are.
  if new.kind = 'new_message' then
    v_conv := new.payload->>'conversation_id';
    if v_conv is not null and exists (
      select 1 from public.notifications n
       where n.user_id = new.user_id
         and n.kind = 'new_message'
         and n.id <> new.id
         and n.payload->>'conversation_id' = v_conv
         and n.created_at > now() - interval '10 minutes'
    ) then
      return new;
    end if;
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

-- ── 3. Atomic claim used by the Edge Function (no double send) ─
-- Returns true when the caller got the row (emailed_at was null and is
-- now stamped); false when it was already emailed. release_… puts it back
-- when the provider refuses the email, so a retry stays possible.
create or replace function public.claim_notification_email(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  update public.notifications set emailed_at = now()
   where id = p_notification_id and emailed_at is null
   returning id into v_id;
  return v_id is not null;
end;
$$;
create or replace function public.release_notification_email(p_notification_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.notifications set emailed_at = null where id = p_notification_id;
$$;
revoke all on function public.claim_notification_email(uuid)   from public, anon, authenticated;
revoke all on function public.release_notification_email(uuid) from public, anon, authenticated;
grant execute on function public.claim_notification_email(uuid)   to service_role;
grant execute on function public.release_notification_email(uuid) to service_role;
