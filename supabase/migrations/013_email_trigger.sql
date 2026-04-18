-- ============================================================
-- 013_email_trigger.sql
-- Fires the send-swap-email edge function when a new notification
-- row is inserted. The trigger is OFF by default: we enable it via
--   select public.toggle_email_trigger(true);
-- only after:
--   1. Resend domain is verified
--   2. Edge function send-swap-email is deployed
--   3. RESEND_API_KEY + RESEND_FROM secrets are set
--   4. SITE_URL and SUPABASE_SERVICE_ROLE_KEY are accessible
--
-- Why this indirection? A broken trigger on notifications INSERT
-- would block every in-app notification. Better to ship dark and
-- flip the switch once we've confirmed the function works.
-- ============================================================

-- Track whether we've already emailed for a given notification so
-- retries / UPDATEs on the row don't re-send.
alter table public.notifications
  add column if not exists emailed_at timestamptz;

create index if not exists notifications_emailed_idx
  on public.notifications(emailed_at)
  where emailed_at is not null;

-- Vault secret the trigger reads. You set it ONCE via SQL editor:
--   select vault.create_secret('https://<project>.functions.supabase.co/send-swap-email', 'swappo_email_fn_url');
-- The trigger reads it at runtime — never logs it, never exposes it.
-- Fallback: if the secret is missing the trigger no-ops silently.
create or replace function public._swappo_email_fn_url()
returns text
language plpgsql
stable
security definer
set search_path = public, vault, pg_temp
as $$
declare v_url text;
begin
  begin
    select decrypted_secret into v_url from vault.decrypted_secrets
      where name = 'swappo_email_fn_url' limit 1;
  exception when others then v_url := null;
  end;
  return v_url;
end;
$$;

-- Service role key for the edge function auth (also in vault)
create or replace function public._swappo_service_role_key()
returns text
language plpgsql
stable
security definer
set search_path = public, vault, pg_temp
as $$
declare v_key text;
begin
  begin
    select decrypted_secret into v_key from vault.decrypted_secrets
      where name = 'swappo_service_role_key' limit 1;
  exception when others then v_key := null;
  end;
  return v_key;
end;
$$;

-- Trigger body
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
  -- Missing secrets → skip silently. Everything else keeps working.
  if v_url is null or v_key is null then return new; end if;

  -- Only send for the kinds we actually care about (cheap guard
  -- to avoid hitting the function for future unrelated notif kinds).
  if new.kind not in ('swap_proposed', 'offer_received',
                      'swap_accepted', 'swap_declined',
                      'counter_offer', 'quota_low') then
    return new;
  end if;

  -- Fire-and-forget. pg_net queues the HTTP call; we don't block
  -- the notification INSERT on network latency.
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := jsonb_build_object('notification_id', new.id)
  );

  return new;
exception when others then
  -- Never let an email failure break the notification itself.
  return new;
end;
$$;

revoke all on function public.notifications_email_dispatch() from public;

-- The trigger lives here but is created disabled. Toggle with
-- `select public.toggle_email_trigger(true);` once Resend is live.
drop trigger if exists tr_notifications_email_dispatch on public.notifications;
create trigger tr_notifications_email_dispatch
  after insert on public.notifications
  for each row
  execute function public.notifications_email_dispatch();

-- Trigger starts disabled so we can ship dark.
alter table public.notifications
  disable trigger tr_notifications_email_dispatch;

-- Friendly on/off switch for Ahmed (and for staging rollback).
create or replace function public.toggle_email_trigger(p_enabled boolean)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_enabled then
    execute 'alter table public.notifications enable trigger tr_notifications_email_dispatch';
    return 'email trigger ENABLED';
  else
    execute 'alter table public.notifications disable trigger tr_notifications_email_dispatch';
    return 'email trigger DISABLED';
  end if;
end;
$$;

revoke all on function public.toggle_email_trigger(boolean) from public;
-- Only service_role can flip it (run from Supabase SQL editor or CLI).
grant execute on function public.toggle_email_trigger(boolean) to service_role;
