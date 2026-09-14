-- ============================================
-- Swappo — Migration 028: pseudo is chosen in onboarding, never auto-derived
--
-- The live handle_new_user() had drifted from migration 003: it derived a
-- pseudo from the email local-part (falling back to 'user', 'user2', …)
-- when the signup metadata carried an empty pseudo. Because the client
-- decides "needs onboarding" by pseudo IS NULL, every new account skipped
-- the pseudo + avatar step and landed as "user2".
--
-- Rule restored: pseudo is set ONLY when signup metadata provides a
-- non-empty one; otherwise it stays NULL until onboarding.html sets it.
-- Idempotent.
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta         jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  meta_pseudo  text  := NULLIF(lower(trim(COALESCE(meta->>'pseudo', ''))), '');
  final_pseudo text  := NULL;
  base_pseudo  text;
  attempt      int   := 1;
BEGIN
  IF meta_pseudo IS NOT NULL THEN
    final_pseudo := regexp_replace(meta_pseudo, '[^a-z0-9_]', '', 'g');
    IF char_length(final_pseudo) < 3 THEN
      final_pseudo := NULL;                    -- too short → onboarding decides
    END IF;
  END IF;

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
    final_pseudo,                              -- NULL → onboarding.html fills it
    COALESCE(meta->>'avatar', '')
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

-- One-off repair: accounts that received an auto pseudo and never picked an
-- avatar go back through onboarding on their next visit.
UPDATE public.users
   SET pseudo = NULL
 WHERE pseudo ~ '^user[0-9]*$'
   AND COALESCE(avatar, '') = '';
