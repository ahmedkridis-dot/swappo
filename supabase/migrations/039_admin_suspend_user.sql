-- ============================================================
-- 039_admin_suspend_user.sql
-- Moderation: suspend / reinstate a member (Ahmed, 2026-09-17).
--
--   select public.admin_suspend_user('someone@example.com', 'reason');
--   select public.admin_reinstate_user('someone@example.com');
--
-- Suspending: blocks sign-in (auth.users.banned_until), ends every open
-- session (refresh tokens cascade), hides the member's live listings
-- (status 'removed', reversible), declines their open swaps and gift
-- claims, and records when / why on public.users.
-- Only the database owner / service role can call these — never a client.
-- ============================================================

alter table public.users add column if not exists suspended_at timestamptz;
alter table public.users add column if not exists suspended_reason text;

create or replace function public.admin_suspend_user(p_email text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid uuid;
  v_items int := 0;
  v_swaps int := 0;
  v_sessions int := 0;
begin
  select id into v_uid from auth.users where lower(email) = lower(p_email);
  if v_uid is null then raise exception 'user_not_found: %', p_email; end if;

  update auth.users set banned_until = now() + interval '100 years' where id = v_uid;
  delete from auth.sessions where user_id = v_uid;
  get diagnostics v_sessions = row_count;

  update public.items set status = 'removed'
   where user_id = v_uid and status in ('available', 'reserved');
  get diagnostics v_items = row_count;

  update public.swaps set status = 'declined'
   where (proposer_id = v_uid or receiver_id = v_uid) and status in ('pending', 'accepted');
  get diagnostics v_swaps = row_count;

  update public.users set suspended_at = now(), suspended_reason = p_reason where id = v_uid;

  return jsonb_build_object('user_id', v_uid, 'sessions_ended', v_sessions, 'items_hidden', v_items, 'swaps_declined', v_swaps);
end;
$$;

create or replace function public.admin_reinstate_user(p_email text)
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
  update auth.users set banned_until = null where id = v_uid;
  update public.items set status = 'available' where user_id = v_uid and status = 'removed';
  get diagnostics v_items = row_count;
  update public.users set suspended_at = null, suspended_reason = null where id = v_uid;
  return jsonb_build_object('user_id', v_uid, 'items_restored', v_items);
end;
$$;

revoke all on function public.admin_suspend_user(text, text) from public, anon, authenticated;
revoke all on function public.admin_reinstate_user(text) from public, anon, authenticated;
