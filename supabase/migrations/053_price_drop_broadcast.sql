-- ============================================================
-- 053_price_drop_broadcast.sql
-- Ahmed, 2026-09-21: a price drop is announced to ALL members, not only to
-- those who saved the item or made an offer.
--
-- One price drop = one notification per member = a few hundred emails at
-- once, while the email provider accepts ~2 per second. So broadcast emails
-- no longer leave in the insert trigger: they are queued
-- (notifications.email_queued) and a pg_cron job sends 15 every 10 seconds
-- (≈ 1.5 / s). Every other notification still leaves immediately.
--
-- Guard rails, so the broadcast stays an event and not a spam channel:
--   · the drop must be at least 5 % — a smaller one still shows the old
--     price and still notifies the interested members (052 behaviour);
--   · at most 3 broadcasts per seller per 24 h — beyond that, interested
--     members only;
--   · one notice per member and item per 24 h (unchanged).
-- ============================================================
alter table public.notifications add column if not exists email_queued boolean not null default false;
create index if not exists idx_notifications_email_queue
  on public.notifications (created_at) where email_queued and emailed_at is null;

-- ── 1. Dispatch: broadcast kinds are queued, the rest leaves now ─
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

  -- Broadcast kinds: paced by drain_email_queue() (pg_cron 'email-queue').
  if new.kind in ('price_drop') then
    update public.notifications set email_queued = true where id = new.id;
    return new;
  end if;

  -- Anti-burst, chat messages only: one email per conversation per 10 min.
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
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    body    := jsonb_build_object('notification_id', new.id)
  );
  return new;
end;
$$;

-- ── 2. The paced sender ──────────────────────────────────────
create or replace function public.drain_email_queue(p_limit int default 15)
returns int
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_url text := public._swappo_email_fn_url();
  v_key text := coalesce(public._swappo_service_role_key(), public._swappo_anon_key());
  r record;
  v_sent int := 0;
begin
  if v_url is null or v_key is null then return 0; end if;
  for r in
    select id, user_id, kind from public.notifications
     where email_queued and emailed_at is null
     order by created_at
     limit greatest(coalesce(p_limit, 15), 0)
     for update skip locked
  loop
    update public.notifications set email_queued = false where id = r.id;
    if public.should_email_user(r.user_id, r.kind) then
      perform net.http_post(
        url     := v_url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
        body    := jsonb_build_object('notification_id', r.id));
      v_sent := v_sent + 1;
    end if;
  end loop;
  return v_sent;
end;
$$;
revoke all on function public.drain_email_queue(int) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'email-queue') then perform cron.unschedule('email-queue'); end if;
  perform cron.schedule('email-queue', '10 seconds', $cron$select public.drain_email_queue(15)$cron$);
  -- A job every 10 s writes 8 640 log rows a day: keep two days.
  if exists (select 1 from cron.job where jobname = 'cron-log-purge') then perform cron.unschedule('cron-log-purge'); end if;
  perform cron.schedule('cron-log-purge', '17 1 * * *', $cron$delete from cron.job_run_details where end_time < now() - interval '2 days'$cron$);
end $$;

-- ── 3. Price drop → every member ─────────────────────────────
create or replace function public.items_notify_price_drop()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  MIN_DROP_PCT       constant numeric := 5;   -- broadcast only from −5 %
  MAX_PER_SELLER_DAY constant int     := 3;   -- broadcasts per seller per 24 h
  v_title     text;
  v_pct       numeric;
  v_recent    int;
  v_broadcast boolean;
begin
  if new.price is not distinct from old.price then return new; end if;
  if not (coalesce(old.price, 0) > 0 and coalesce(new.price, 0) > 0 and new.price < old.price) then return new; end if;
  if new.status <> 'available' or coalesce(new.is_giveaway, false) then return new; end if;

  v_title := coalesce(nullif(trim(
    (case when coalesce(new.brand, '') ~* '^(other|n/a)$' then '' else coalesce(new.brand, '') end)
    || ' ' || coalesce(new.model, '')), ''), nullif(new.type, ''), 'An item');
  v_pct := round((1 - new.price / old.price) * 100, 1);

  select count(distinct n.payload->>'item_id') into v_recent
    from public.notifications n
   where n.kind = 'price_drop' and n.payload->>'seller_id' = new.user_id::text
     and coalesce((n.payload->>'broadcast')::boolean, false)
     and n.created_at > now() - interval '24 hours'
     and n.payload->>'item_id' <> new.id::text;
  v_broadcast := v_pct >= MIN_DROP_PCT and v_recent < MAX_PER_SELLER_DAY;

  insert into public.notifications (user_id, kind, type, title, message, url, payload)
  select u.id, 'price_drop', 'item',
         'Price drop: ' || v_title,
         v_title || ' is now ' || trim(to_char(new.price, 'FM999G999G999')) || ' AED (was '
           || trim(to_char(old.price, 'FM999G999G999')) || ' AED).',
         '/pages/product.html?id=' || new.id,
         jsonb_build_object('item_id', new.id, 'item_title', v_title, 'old_price', old.price,
                            'new_price', new.price, 'seller_id', new.user_id, 'broadcast', v_broadcast)
    from public.users u
   where u.id <> new.user_id
     and coalesce(u.is_banned, false) = false
     and coalesce(u.is_deleted, false) = false
     and (v_broadcast
          or exists (select 1 from public.favorites f where f.item_id = new.id and f.user_id = u.id)
          or exists (select 1 from public.swaps s where s.receiver_item_id = new.id and s.proposer_id = u.id
                        and s.status in ('pending', 'declined', 'cancelled', 'expired')))
     and not exists (
        select 1 from public.notifications n
         where n.user_id = u.id and n.kind = 'price_drop'
           and n.payload->>'item_id' = new.id::text
           and n.created_at > now() - interval '24 hours');
  return new;
end;
$$;
