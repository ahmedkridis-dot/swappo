-- ============================================================
-- 049_publish_nudge_and_signup_source.sql
-- Traffic analysis 17–19 Sept 2026: ~12 % of UAE visitors sign up, but 106
-- of 126 new members never listed an item — so they cannot claim a gift
-- (Give-to-Unlock) and most never come back. Two tools:
--
--   1. "Day-after" nudge: a member who confirmed the email 20 h+ ago and
--      still has no listing gets ONE notification (bell + email through the
--      normal dispatch, migration 047): "list one item, your first claim
--      unlocks". Sent by pg_cron, a few per run, daytime UAE only, so the
--      backlog drains gently and the email provider's daily cap is never
--      eaten by one batch.
--   2. Signup source: the site stores where the visitor came from in the
--      signup metadata (raw_user_meta_data.signup_src — utm, in-app browser,
--      referrer). users.signup_source keeps a short label for reporting, and
--      admin_signup_sources() gives the funnel per source.
-- ============================================================

-- ── 1. Day-after nudge ───────────────────────────────────────
create or replace function public.send_publish_nudges(p_limit int default 4)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
  v_sent int := 0;
begin
  for r in
    select u.id
      from public.users u
      join auth.users a on a.id = u.id
     where a.email_confirmed_at is not null
       and a.created_at < now() - interval '20 hours'
       and a.created_at > now() - interval '7 days'
       and coalesce(u.is_banned, false) = false
       and not exists (select 1 from public.items i where i.user_id = u.id)
       and not exists (select 1 from public.notifications n where n.user_id = u.id and n.kind = 'publish_nudge')
     order by a.created_at
     limit greatest(coalesce(p_limit, 4), 0)
  loop
    insert into public.notifications (user_id, kind, type, title, message, url, payload)
    values (
      r.id, 'publish_nudge', 'system',
      'Your first gift claim is one listing away',
      'List one item — to swap, sell or give away — and your first claim unlocks instantly. It takes about a minute.',
      '/pages/publier.html',
      jsonb_build_object('reason', 'no_listing_after_signup')
    );
    v_sent := v_sent + 1;
  end loop;
  return v_sent;
end;
$$;
revoke all on function public.send_publish_nudges(int) from public, anon, authenticated;

-- Hourly, 09:00–21:00 UAE (05:00–17:00 UTC), 4 members per run (≤ 52 / day).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'publish-nudges') then
    perform cron.unschedule('publish-nudges');
  end if;
  perform cron.schedule('publish-nudges', '7 5-17 * * *', $cron$select public.send_publish_nudges(4)$cron$);
end $$;

-- ── 2. Signup source ─────────────────────────────────────────
alter table public.users add column if not exists signup_source text;

-- Short label from the metadata written by js/source-tag.js at signup.
create or replace function public._signup_source_label(p_meta jsonb)
returns text
language sql
immutable
as $$
  select nullif(left(lower(coalesce(
    nullif(p_meta->'signup_src'->>'utm_source', ''),
    nullif(p_meta->'signup_src'->>'app', ''),
    nullif(p_meta->'signup_src'->>'ref', ''),
    'direct')), 40), '')
$$;

create or replace function public.sync_signup_source()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- A reporting helper must never be able to block a signup.
  begin
    if new.raw_user_meta_data ? 'signup_src' then
      update public.users set signup_source = public._signup_source_label(new.raw_user_meta_data)
       where id = new.id and signup_source is null;
    end if;
  exception when others then
    null;
  end;
  return new;
end;
$$;

-- public.users is filled by the existing signup trigger; this one runs
-- after it (name sorts last) and on the later metadata updates.
drop trigger if exists zz_sync_signup_source on auth.users;
create trigger zz_sync_signup_source
  after insert or update of raw_user_meta_data on auth.users
  for each row execute function public.sync_signup_source();

-- Funnel per source for the dashboard / SQL editor (not exposed to members).
create or replace function public.admin_signup_sources(p_days int default 7)
returns table (source text, signups bigint, confirmed bigint, listed bigint, requested bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  select coalesce(u.signup_source,
                  case when a.raw_user_meta_data ? 'signup_src' then public._signup_source_label(a.raw_user_meta_data) end,
                  'unknown (before tracking)') as source,
         count(*) as signups,
         count(a.email_confirmed_at) as confirmed,
         count(*) filter (where exists (select 1 from public.items i where i.user_id = u.id)) as listed,
         count(*) filter (where exists (select 1 from public.swaps s where s.proposer_id = u.id)) as requested
    from public.users u join auth.users a on a.id = u.id
   where a.created_at > now() - make_interval(days => greatest(p_days, 1))
   group by 1 order by 2 desc
$$;
revoke all on function public.admin_signup_sources(int) from public, anon, authenticated;
