-- ============================================================
-- 050_email_events.sql
-- What happened to each email after we handed it to Resend: delivered,
-- bounced, marked as spam, opened, clicked. Filled by the Edge Function
-- resend-webhook (Resend → Webhooks), so delivery can be followed from the
-- database without any Resend API key.
-- ============================================================
create table if not exists public.email_events (
  id           bigint generated always as identity primary key,
  svix_id      text unique,                 -- webhook delivery id (idempotence)
  type         text not null,               -- email.sent | email.delivered | email.bounced | email.complained | email.opened | email.clicked | email.delivery_delayed | email.failed
  email_id     text,                        -- Resend email id (same id as in net._http_response)
  recipient    text,
  subject      text,
  kind         text,                        -- our tag: notification kind (gift_claimed, publish_nudge, …); null for signup confirmations
  detail       jsonb,
  occurred_at  timestamptz,
  received_at  timestamptz not null default now()
);
create index if not exists idx_email_events_type_time on public.email_events (type, occurred_at desc);
create index if not exists idx_email_events_email on public.email_events (email_id);
alter table public.email_events enable row level security;   -- no policy: service role / SQL editor only

create or replace function public.admin_email_stats(p_days int default 7)
returns table (day date, kind text, sent bigint, delivered bigint, bounced bigint, complained bigint, opened bigint, clicked bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  select (occurred_at at time zone 'Asia/Dubai')::date as day,
         coalesce(kind, 'auth / other') as kind,
         count(distinct email_id) filter (where type = 'email.sent')       as sent,
         count(distinct email_id) filter (where type = 'email.delivered')  as delivered,
         count(distinct email_id) filter (where type = 'email.bounced')    as bounced,
         count(distinct email_id) filter (where type = 'email.complained') as complained,
         count(distinct email_id) filter (where type = 'email.opened')     as opened,
         count(distinct email_id) filter (where type = 'email.clicked')    as clicked
    from public.email_events
   where occurred_at > now() - make_interval(days => greatest(p_days, 1))
   group by 1, 2 order by 1 desc, 3 desc
$$;
revoke all on function public.admin_email_stats(int) from public, anon, authenticated;
