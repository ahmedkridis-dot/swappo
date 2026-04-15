-- ============================================
-- Swappo — Migration 003: Phone-first auth (UAE)
-- Ahmed's decision 2026-04-15: drop Google/Apple/Facebook OAuth,
-- phone OTP as primary, email as secondary.
--
-- Key schema changes:
--   1. email is now NULLABLE (phone-only users don't have one)
--   2. pseudo is now NULLABLE (set during onboarding, not signup)
--   3. handle_new_user trigger now tolerates both paths:
--        - email path  → raw_user_meta_data may have pseudo OR we skip it
--        - phone path  → pseudo stays null until onboarding
--   4. New helper RPC is_pseudo_available(candidate) for unique check UI
--
-- Safe to re-run: all changes are idempotent.
-- ============================================

-- 1) Relax NOT NULL constraints
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN pseudo DROP NOT NULL;

-- 2) Make the pseudo UNIQUE constraint tolerate NULL (Postgres already does
--    this by default — multiple NULLs are allowed in a UNIQUE index — but
--    we verify here).
-- users_pseudo_idx already exists; it's a non-unique index. The UNIQUE
-- constraint comes from the column definition. Nothing to do.

-- 3) Rewrite handle_new_user: phone-path aware + no forced pseudo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta        jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  meta_pseudo text  := NULLIF(lower(COALESCE(meta->>'pseudo', '')), '');
  final_pseudo text := NULL;
  base_pseudo  text;
  attempt      int  := 1;
BEGIN
  -- Pseudo is ONLY set if the signup explicitly provides one in metadata.
  -- Phone-only signups go through onboarding.html to set it later.
  IF meta_pseudo IS NOT NULL THEN
    -- Sanitize: strip anything that isn't [a-z0-9_]
    final_pseudo := regexp_replace(meta_pseudo, '[^a-z0-9_]', '', 'g');
    IF char_length(final_pseudo) < 3 THEN
      final_pseudo := NULL;  -- fall back to NULL, user will set in onboarding
    END IF;
  END IF;

  -- De-dupe pseudo if needed
  IF final_pseudo IS NOT NULL THEN
    base_pseudo := final_pseudo;
    WHILE EXISTS (SELECT 1 FROM public.users WHERE pseudo = final_pseudo) LOOP
      attempt := attempt + 1;
      final_pseudo := base_pseudo || attempt::text;
    END LOOP;
  END IF;

  INSERT INTO public.users (id, email, phone, name, pseudo, avatar)
  VALUES (
    NEW.id,
    NULLIF(NEW.email, ''),
    NULLIF(NEW.phone, ''),
    COALESCE(meta->>'name', ''),
    final_pseudo,                            -- may be NULL → onboarding fills it
    COALESCE(meta->>'avatar', '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger re-bind (drop + create for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4) RPC helper for onboarding: check pseudo availability without exposing
-- the whole users table to the client via RLS workarounds.
CREATE OR REPLACE FUNCTION public.is_pseudo_available(candidate text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean text := lower(regexp_replace(coalesce(candidate, ''), '[^a-z0-9_]', '', 'g'));
BEGIN
  IF char_length(clean) < 3 OR char_length(clean) > 20 THEN RETURN false; END IF;
  RETURN NOT EXISTS (SELECT 1 FROM public.users WHERE pseudo = clean);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_pseudo_available(text) TO anon, authenticated;

-- 5) Done.
