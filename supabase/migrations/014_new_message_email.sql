-- ============================================================
-- 014_new_message_email.sql
-- "Wake up a dormant chat" email.
--
-- When user B sends a message to user A, send an email to A ONLY if
-- the previous message in this conversation is more than 30 minutes
-- old. That way:
--   - active ping-pong = no emails (messages < 30 min apart)
--   - user goes away → first message after the silence wakes them up
--   - at most 1 email per silence window per conversation
--
-- Mechanics:
--   1. New user pref column notif_email_new_message (default true)
--   2. public.should_email_user() extended to cover 'new_message'
--   3. Trigger on messages INSERT: calculates gap vs the previous row
--      in the same conversation; if > 30 min (or this is the first
--      real message) AND not a system msg → inserts a notifications
--      row of kind='new_message'. The existing
--      notifications_email_dispatch trigger then fires the edge
--      function and Resend sends the email.
-- ============================================================

-- ── 1. Preference column ───────────────────────────────────
alter table public.users
  add column if not exists notif_email_new_message boolean not null default true;

comment on column public.users.notif_email_new_message is
  'Email when a counter-party sends you a chat message after 30 min of silence.';

-- ── 2. Extend the pref lookup ──────────────────────────────
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
    when 'offer_received'  then u.notif_email_swap_proposed
    when 'swap_accepted'   then u.notif_email_swap_accepted
    when 'swap_declined'   then u.notif_email_swap_declined
    when 'counter_offer'   then u.notif_email_counter_offer
    when 'quota_low'       then u.notif_email_quota_low
    when 'new_message'     then u.notif_email_new_message
    else false
  end;
end;
$$;

-- ── 3. Widen the email dispatch allow-list ─────────────────
create or replace function public.notifications_email_dispatch()
returns trigger
language plpgsql
security definer
set search_path = public, net, extensions, pg_temp
as $$
declare
  v_url text := public._swappo_email_fn_url();
begin
  if v_url is null then return new; end if;
  if new.kind not in ('swap_proposed', 'offer_received',
                      'swap_accepted', 'swap_declined',
                      'counter_offer', 'quota_low',
                      'new_message') then
    return new;
  end if;
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type','application/json'),
    body    := jsonb_build_object('notification_id', new.id)
  );
  return new;
exception when others then
  return new;
end;
$$;

-- ── 4. The "new message after 30 min" trigger ──────────────
create or replace function public.maybe_notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_prev_at     timestamptz;
  v_recipient   uuid;
  v_conv_title  text;
  v_item_id     uuid;
  v_sender_name text;
begin
  -- Ignore system messages — those have their own dedicated email kinds.
  if coalesce(new.is_system, false) then return new; end if;

  -- Safety: a message needs a sender to be a "real" user message.
  if new.sender_id is null then return new; end if;

  -- Compute the other party. conv_user1_id / conv_user2_id are
  -- denormalised onto messages by a prior trigger so we don't need
  -- an extra join.
  if new.sender_id = new.conv_user1_id then
    v_recipient := new.conv_user2_id;
  elsif new.sender_id = new.conv_user2_id then
    v_recipient := new.conv_user1_id;
  else
    -- Sender isn't one of the two parties — defensively skip.
    return new;
  end if;
  if v_recipient is null then return new; end if;

  -- Look up the previous message in this conversation (any kind,
  -- including system — we only care about the "quiet" gap).
  select max(created_at) into v_prev_at
    from public.messages
    where conversation_id = new.conversation_id
      and id <> new.id;

  -- If there IS a previous message AND it's less than 30 min old,
  -- the chat is active → don't email. First-ever real message after
  -- a long gap (or no previous message at all) triggers the email.
  if v_prev_at is not null and new.created_at - v_prev_at < interval '30 minutes' then
    return new;
  end if;

  -- Resolve the item title (for the email subject) + sender's name.
  select c.item_id into v_item_id
    from public.conversations c
    where c.id = new.conversation_id;

  select coalesce(nullif(name, ''), nullif(pseudo, ''), 'Someone')
    into v_sender_name
    from public.users where id = new.sender_id;

  -- Drop the in-app notification. The existing
  -- notifications_email_dispatch trigger fires the email.
  insert into public.notifications (user_id, kind, title, message, url, payload)
  values (
    v_recipient,
    'new_message',
    'New message',
    'You have a new message in a Swappo chat.',
    '/pages/chat.html?conv=' || new.conversation_id,
    jsonb_build_object(
      'item_id',        v_item_id,
      'conversation_id', new.conversation_id,
      'actor_name',     v_sender_name,
      'preview',        left(new.content, 140)
    )
  );

  return new;
exception when others then
  -- Never break the chat insert because the notification side failed.
  return new;
end;
$$;

revoke all on function public.maybe_notify_new_message() from public;

drop trigger if exists tr_messages_notify_new_message on public.messages;
create trigger tr_messages_notify_new_message
  after insert on public.messages
  for each row
  execute function public.maybe_notify_new_message();
