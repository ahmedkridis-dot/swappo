-- 009_pipeline_schema_alignment.sql
-- Applied via MCP apply_migration during the P1-P4 pipeline.
-- Captures all schema additions needed by the P1A/P1B/P2/P3/P4A/P4B missions.

-- Keep this file idempotent so it can be re-applied safely in fresh envs.

-- ─── USERS: display_name, is_pro, deletion, ratings, recovery, decay ────────
alter table public.users add column if not exists display_name text;
alter table public.users add column if not exists is_pro boolean default false;
alter table public.users add column if not exists is_deleted boolean default false;
alter table public.users add column if not exists deleted_at timestamptz;
alter table public.users add column if not exists rating_avg numeric(3,2) default 0;
alter table public.users add column if not exists rating_count int default 0;
alter table public.users add column if not exists recovery_email text;
alter table public.users add column if not exists recovery_phone text;
alter table public.users add column if not exists badge_last_activity_at timestamptz default now();
alter table public.users add column if not exists emirate text default '';

-- ─── NOTIFICATIONS: unify legacy (kind/payload) with new (type/title/…) ─────
alter table public.notifications add column if not exists type text;
alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists url text;
alter table public.notifications add column if not exists read_at timestamptz;

update public.notifications set type = coalesce(type, kind) where type is null;
update public.notifications set read_at = now() where is_read = true and read_at is null;

create or replace function public.sync_notification_read()
returns trigger language plpgsql as $$
begin
  if new.read_at is not null and (old is null or old.read_at is null) then
    new.is_read = true;
  end if;
  if new.is_read = true and new.read_at is null then
    new.read_at = now();
  end if;
  return new;
end; $$;

drop trigger if exists trg_sync_notification_read on public.notifications;
create trigger trg_sync_notification_read
before insert or update on public.notifications
for each row execute procedure public.sync_notification_read();

-- ─── SWAPS: payment selector + offer threading ─────────────────────────────
alter table public.swaps add column if not exists payment_method text;
alter table public.swaps add column if not exists payer_confirmed_at timestamptz;
alter table public.swaps add column if not exists payee_confirmed_at timestamptz;
alter table public.swaps add column if not exists parent_offer_id uuid references public.swaps(id) on delete set null;

do $$ begin
  if not exists (
    select 1 from information_schema.constraint_column_usage
    where constraint_name = 'swaps_payment_method_check'
  ) then
    alter table public.swaps add constraint swaps_payment_method_check
      check (payment_method is null or payment_method in ('cash_meetup','aani','cod'));
  end if;
end $$;

create index if not exists idx_swaps_parent_offer on public.swaps(parent_offer_id);

-- ─── ITEMS: neighborhood + auto-decline + shipping ─────────────────────────
alter table public.items add column if not exists location_lat double precision;
alter table public.items add column if not exists location_lng double precision;
alter table public.items add column if not exists auto_decline_enabled boolean default false;
alter table public.items add column if not exists auto_decline_pct int default 80;
alter table public.items add column if not exists shipping_enabled boolean default false;

update public.items set location_lat = lat where location_lat is null and lat is not null;
update public.items set location_lng = lng where location_lng is null and lng is not null;

-- ─── STORIES: Depop-style 24h stories (Pro feature) ────────────────────────
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  item_id uuid references public.items(id) on delete cascade,
  media_url text not null,
  caption text default '',
  views_count int default 0,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours')
);

alter table public.stories enable row level security;
drop policy if exists stories_read   on public.stories;
create policy stories_read   on public.stories for select using (expires_at > now());
drop policy if exists stories_write  on public.stories;
create policy stories_write  on public.stories for insert with check (auth.uid() = user_id);
drop policy if exists stories_delete on public.stories;
create policy stories_delete on public.stories for delete using (auth.uid() = user_id);

create index if not exists idx_stories_expires on public.stories(expires_at);
create index if not exists idx_stories_user    on public.stories(user_id);

-- ─── REVIEWS: 3 for Khalid + 15 for Fatima (seeded separately) ─────────────
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.users(id) on delete cascade,
  target_id   uuid not null references public.users(id) on delete cascade,
  swap_id     uuid references public.swaps(id) on delete set null,
  rating smallint not null check (rating >= 1 and rating <= 5),
  comment text default '',
  created_at timestamptz default now()
);

alter table public.reviews enable row level security;
drop policy if exists reviews_read   on public.reviews;
create policy reviews_read   on public.reviews for select using (true);
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert with check (auth.uid() = reviewer_id);

create index if not exists idx_reviews_target on public.reviews(target_id);

-- ─── users_public VIEW: read-only profile data for profile-public.html ─────
create or replace view public.users_public as
  select id,
         coalesce(nullif(display_name, ''), pseudo,
                  'Swapper#'||upper(substring(replace(id::text,'-',''),1,4))) as display_name,
         pseudo, avatar, plan, is_pro, swap_count, badge,
         coalesce(rating_avg, 0)   as rating_avg,
         coalesce(rating_count, 0) as rating_count,
         created_at
  from public.users
  where coalesce(is_deleted,    false) = false
    and coalesce(is_suspended,  false) = false;

grant select on public.users_public to anon, authenticated;
