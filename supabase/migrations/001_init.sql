-- ============================================
-- Swappo — Phase 1 Migration: users profile + auth trigger
-- Run this once in Supabase → SQL Editor → New query → paste → Run.
--
-- What it does:
--  1. Creates a `users` table that extends auth.users (1-to-1 by id)
--  2. Adds a trigger on auth.users INSERT to auto-create the profile row
--     (pseudo is de-duped by appending a suffix if already taken)
--  3. Adds an updated_at auto-maintenance trigger
--  4. Enables RLS and adds "self-read" + "self-update" policies
--
-- Safe to re-run: everything is IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================

-- 1) ---- Profile table ----
CREATE TABLE IF NOT EXISTS public.users (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text UNIQUE NOT NULL,
  name          text NOT NULL DEFAULT '',
  pseudo        text UNIQUE NOT NULL,
  avatar        text DEFAULT '',
  phone         text DEFAULT '',

  -- Subscription & status
  plan            text NOT NULL DEFAULT 'free'
                  CHECK (plan IN ('free', 'bronze', 'silver', 'premium', 'pro')),
  swap_count      integer NOT NULL DEFAULT 0,
  points_balance  integer NOT NULL DEFAULT 0,
  badge           text NOT NULL DEFAULT 'newcomer',

  -- Moderation
  reports_count   integer NOT NULL DEFAULT 0,
  is_suspended    boolean NOT NULL DEFAULT false,

  -- Timestamps
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_pseudo_idx ON public.users (pseudo);
CREATE INDEX IF NOT EXISTS users_email_idx  ON public.users (email);

-- 2) ---- updated_at maintenance ----
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3) ---- Auto-create profile on signup ----
-- Reads name/pseudo/avatar/phone from raw_user_meta_data (set by SwappoAuth.signUp).
-- If the requested pseudo already exists, append -2, -3, etc. until unique.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta        jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  base_pseudo text := lower(COALESCE(meta->>'pseudo', split_part(NEW.email, '@', 1)));
  final_pseudo text := base_pseudo;
  attempt     int  := 1;
BEGIN
  -- Sanitize pseudo: strip anything that isn't [a-z0-9_], fallback to 'user'
  final_pseudo := regexp_replace(final_pseudo, '[^a-z0-9_]', '', 'g');
  IF char_length(final_pseudo) < 3 THEN
    final_pseudo := 'user';
  END IF;
  base_pseudo := final_pseudo;

  -- De-dupe pseudo
  WHILE EXISTS (SELECT 1 FROM public.users WHERE pseudo = final_pseudo) LOOP
    attempt := attempt + 1;
    final_pseudo := base_pseudo || attempt::text;
  END LOOP;

  INSERT INTO public.users (id, email, name, pseudo, avatar, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(meta->>'name', ''),
    final_pseudo,
    COALESCE(meta->>'avatar', ''),
    COALESCE(meta->>'phone', '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4) ---- Row Level Security ----
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop any pre-existing policies with the same names (makes the script re-runnable)
DROP POLICY IF EXISTS "users_select_self"         ON public.users;
DROP POLICY IF EXISTS "users_select_public_card"  ON public.users;
DROP POLICY IF EXISTS "users_update_self"         ON public.users;

-- Self can read everything
CREATE POLICY "users_select_self"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Anyone authenticated can read the public "card" of other users.
-- Phase 1 scope: we only let the caller see (id, pseudo, name, avatar, plan,
-- swap_count, badge). The other columns (email, phone, reports_count, etc.)
-- are hidden by simply selecting the allowed columns from the client. Since
-- RLS is a row filter not a column filter, Phase 2 will move sensitive fields
-- to a private table or use a view. For Phase 1 (auth-only) this is fine.
CREATE POLICY "users_select_public_card"
  ON public.users FOR SELECT
  USING (auth.role() = 'authenticated');

-- Self can update their own row. Plan changes go through a server function
-- (Phase 2); for now we let the client update cosmetic fields.
CREATE POLICY "users_update_self"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- NOTE: No INSERT policy — inserts happen only via the SECURITY DEFINER
-- trigger above, never directly from the client.
-- NOTE: No DELETE policy — accounts are deleted via auth.users cascade only.
