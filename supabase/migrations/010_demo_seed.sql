-- 010_demo_seed.sql
-- P2 mission: seed 7 demo accounts, 27 items, 8 scenarios, reviews, notifications.
-- Idempotent by email — safe to re-run.

create extension if not exists pgcrypto;

-- ─── Helper: create/refresh a confirmed auth user ──────────────────────────
create or replace function public.seed_create_user(
  p_email text,
  p_password text,
  p_name text,
  p_pseudo text,
  p_display_name text default null,
  p_plan text default 'free',
  p_is_pro boolean default false,
  p_rating_avg numeric default 0,
  p_rating_count int default 0,
  p_swap_count int default 0,
  p_badge text default 'swapper',
  p_emirate text default 'Dubai',
  p_avatar text default ''
) returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  new_id uuid;
  meta jsonb := jsonb_build_object(
    'name', p_name,
    'pseudo', p_pseudo,
    'avatar', p_avatar
  );
begin
  select id into new_id from auth.users where email = p_email limit 1;
  if new_id is null then
    new_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token, is_sso_user, is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000'::uuid,
      new_id, 'authenticated', 'authenticated', p_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      meta,
      now(), now(), '', '', '', '', false, false
    );
    insert into auth.identities (
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), new_id, new_id,
      jsonb_build_object('sub', new_id::text, 'email', p_email, 'email_verified', true),
      'email', now(), now(), now()
    );
  else
    update auth.users
      set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          raw_user_meta_data = meta
      where id = new_id;
  end if;

  insert into public.users (id, email, name, pseudo, avatar, plan, is_pro,
                            rating_avg, rating_count, swap_count, badge,
                            display_name, emirate, badge_last_activity_at)
  values (new_id, p_email, p_name, p_pseudo, p_avatar, p_plan, p_is_pro,
          p_rating_avg, p_rating_count, p_swap_count, p_badge,
          coalesce(p_display_name, p_name), p_emirate, now())
  on conflict (id) do update
    set email = excluded.email,
        name = excluded.name,
        pseudo = excluded.pseudo,
        avatar = excluded.avatar,
        plan = excluded.plan,
        is_pro = excluded.is_pro,
        rating_avg = excluded.rating_avg,
        rating_count = excluded.rating_count,
        swap_count = excluded.swap_count,
        badge = excluded.badge,
        display_name = excluded.display_name,
        emirate = excluded.emirate,
        badge_last_activity_at = excluded.badge_last_activity_at;
  return new_id;
end $$;

-- ─── Create 7 demo accounts ────────────────────────────────────────────────
select public.seed_create_user('free@swappo.ae',  'free123', 'Khalid Al Mansouri','khalid_m',   null, 'free', false, 4.2, 3,  3,  'swapper', 'Dubai',           'happy');
select public.seed_create_user('pro@swappo.ae',   'pro123',  'Fatima Hassan',     'fatima_h',   null, 'pro',  true,  4.8, 15, 12, 'active',  'Abu Dhabi',       'chic');
select public.seed_create_user('omar@test.com',   'test123', 'Omar Rashid',       'omar_r',     null, 'free', false, 4.0, 5,  5,  'active',  'Sharjah',         'cool');
select public.seed_create_user('sara@test.com',   'test123', 'Sara Al Maktoum',   'sara_m',     null, 'free', false, 3.9, 2,  0,  'newcomer','Dubai',           'smart');
select public.seed_create_user('raj@test.com',    'test123', 'Raj Patel',         'raj_p',      null, 'free', false, 4.4, 4,  3,  'swapper', 'Ajman',           'gamer');
select public.seed_create_user('aisha@test.com',  'test123', 'Aisha Bin Zayed',   'aisha_bz',   null, 'free', false, 4.5, 4,  2,  'swapper', 'Abu Dhabi',       'elegant');
select public.seed_create_user('youssef@test.com','test123', 'Youssef Hamdan',    'youssef_h',  null, 'free', false, 4.1, 1,  0,  'newcomer','Ras Al Khaimah',  'happy');

-- NOTE: items / swaps / conversations / messages / reviews / notifications
-- are seeded via the live MCP pipeline run. See PIPELINE-REPORT.md for the
-- exact SQL that was executed.
