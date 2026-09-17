-- ============================================================
-- 042_photo_checks.sql
-- AI photo check at publish time (Edge Function check-photo).
--   photo_checks       — one row per verdict (rate limit + audit; never the photo)
--   items.needs_review — set when a photo came back "unsure"
--   admin_review_queue — what Ahmed looks at: items to review + repeat offenders
-- ============================================================

create table if not exists public.photo_checks (
  id         bigserial primary key,
  user_id    uuid references public.users(id) on delete cascade,
  category   text,
  verdict    text,
  reason     text,
  confidence numeric,
  created_at timestamptz not null default now()
);
create index if not exists idx_photo_checks_user_time on public.photo_checks (user_id, created_at desc);
alter table public.photo_checks enable row level security;
-- Inserts happen only through the Edge Function (service role). Owners may read their own rows.
drop policy if exists photo_checks_select_own on public.photo_checks;
create policy photo_checks_select_own on public.photo_checks for select
  using ((select auth.uid()) = user_id);

alter table public.items add column if not exists needs_review boolean not null default false;
create index if not exists idx_items_needs_review on public.items (needs_review) where needs_review;

-- Review queue (owner only): listings flagged by the check, and members with
-- 5+ rejected photos in the last 24 h.
create or replace view public.admin_review_queue as
  select 'item'::text as kind, i.id as ref_id, i.user_id,
         coalesce(nullif(btrim(coalesce(i.brand,'') || ' ' || coalesce(i.model,'')), ''), i.type, i.category) as label,
         'needs_review · ' || i.status as detail, i.created_at as since
    from public.items i
   where i.needs_review and i.status in ('available', 'reserved')
  union all
  select 'user', u.id, u.id, coalesce(u.pseudo, u.email),
         count(*)::text || ' photos rejected in 24h', max(pc.created_at)
    from public.photo_checks pc join public.users u on u.id = pc.user_id
   where pc.verdict = 'reject' and pc.created_at > now() - interval '24 hours'
   group by u.id, u.pseudo, u.email
  having count(*) >= 5;
revoke all on public.admin_review_queue from public, anon, authenticated;
