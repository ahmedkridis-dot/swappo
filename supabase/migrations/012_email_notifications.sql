-- ============================================================
-- 012_email_notifications.sql
-- Email notification preferences on public.users.
-- Author: Ahmed + Claude  ·  2026-04-18
--
-- This migration ONLY adds the preference columns. The actual
-- email-sending pg_net trigger is in migration 013 so that we
-- can apply it *after* the Resend API key is stored in the
-- Supabase Vault and the send-swap-email edge function is live.
--
-- Defaults are TRUE (opt-out model): users receive emails unless
-- they actively disable them in Settings → Notifications.
--
-- The five toggles already rendered in pages/profile.html map 1:1
-- to the columns below.
-- ============================================================

alter table public.users
  add column if not exists notif_email_enabled        boolean not null default true,
  add column if not exists notif_email_swap_proposed  boolean not null default true,
  add column if not exists notif_email_swap_accepted  boolean not null default true,
  add column if not exists notif_email_swap_declined  boolean not null default true,
  add column if not exists notif_email_counter_offer  boolean not null default true,
  add column if not exists notif_email_quota_low      boolean not null default true;

comment on column public.users.notif_email_enabled is
  'Master switch. When false, no transactional emails are sent regardless of the per-kind flags.';
comment on column public.users.notif_email_swap_proposed is
  'Email when someone proposes a swap on one of your items.';
comment on column public.users.notif_email_swap_accepted is
  'Email when your outgoing swap proposal is accepted.';
comment on column public.users.notif_email_swap_declined is
  'Email when your outgoing swap proposal is declined.';
comment on column public.users.notif_email_counter_offer is
  'Email when someone counters your swap offer.';
comment on column public.users.notif_email_quota_low is
  'Email when your monthly swap quota is almost used up.';

-- Helper: does this user want an email for this notification kind?
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
  if not u.notif_email_enabled then return false; end if;
  if u.email is null or u.email = '' then return false; end if;

  return case p_kind
    when 'swap_proposed'   then u.notif_email_swap_proposed
    when 'offer_received'  then u.notif_email_swap_proposed   -- alias used by the client
    when 'swap_accepted'   then u.notif_email_swap_accepted
    when 'swap_declined'   then u.notif_email_swap_declined
    when 'counter_offer'   then u.notif_email_counter_offer
    when 'quota_low'       then u.notif_email_quota_low
    else false
  end;
end;
$$;

revoke all on function public.should_email_user(uuid, text) from public;
grant execute on function public.should_email_user(uuid, text) to authenticated, service_role;
