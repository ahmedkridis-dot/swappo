-- ============================================================
-- 020 — Stories Pro views counter: structural fix.
--
-- Problem: stories.js bumped stories.views_count via direct UPDATE.
-- The stories RLS had no UPDATE policy → RLS silently blocked every
-- write. views_count stayed at 0 for every story, for every user,
-- forever. Plus the client-side ++ pattern has a race condition on
-- concurrent viewers anyway (lost updates).
--
-- Structural fix:
--   1. Dedicated story_views (story_id, viewer_id) table. UNIQUE
--      constraint = one view per viewer per story. Deletable by
--      cascade when story or user is deleted.
--   2. RLS: viewer can INSERT their own view only (auth.uid=viewer_id).
--      Read: viewer sees their own rows, story owner sees everyone's
--      views on their own stories (for "who watched" analytics).
--   3. Trigger AFTER INSERT/DELETE keeps stories.views_count in sync.
--   4. RPC record_story_view(p_story_id) = single entry point the
--      frontend calls. Validates: authenticated, story not expired,
--      not own story, then INSERT ... ON CONFLICT DO NOTHING.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS story_views_story_idx  ON public.story_views(story_id);
CREATE INDEX IF NOT EXISTS story_views_viewer_idx ON public.story_views(viewer_id);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS story_views_insert ON public.story_views;
CREATE POLICY story_views_insert ON public.story_views
  FOR INSERT WITH CHECK (auth.uid() = viewer_id);

DROP POLICY IF EXISTS story_views_read ON public.story_views;
CREATE POLICY story_views_read ON public.story_views
  FOR SELECT USING (
    auth.uid() = viewer_id
    OR EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = story_views.story_id AND s.user_id = auth.uid()
    )
  );

-- Trigger: keep stories.views_count in sync.
CREATE OR REPLACE FUNCTION public.sync_story_views_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.stories SET views_count = views_count + 1 WHERE id = NEW.story_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.stories SET views_count = GREATEST(views_count - 1, 0) WHERE id = OLD.story_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS story_views_sync_count ON public.story_views;
CREATE TRIGGER story_views_sync_count
  AFTER INSERT OR DELETE ON public.story_views
  FOR EACH ROW EXECUTE FUNCTION public.sync_story_views_count();

-- RPC: single call the frontend uses. Validates + dedupes.
CREATE OR REPLACE FUNCTION public.record_story_view(p_story_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_story public.stories%rowtype;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode = '28000'; END IF;
  SELECT * INTO v_story FROM public.stories WHERE id = p_story_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'story_not_found' USING errcode = 'P0002'; END IF;
  IF v_story.expires_at IS NOT NULL AND v_story.expires_at <= now() THEN
    RAISE EXCEPTION 'story_expired' USING errcode = 'P0001';
  END IF;
  -- Don't count the owner viewing their own story.
  IF v_uid = v_story.user_id THEN
    RETURN jsonb_build_object('success', true, 'counted', false, 'reason', 'own_story');
  END IF;
  INSERT INTO public.story_views (story_id, viewer_id)
    VALUES (p_story_id, v_uid)
    ON CONFLICT (story_id, viewer_id) DO NOTHING;
  RETURN jsonb_build_object('success', true, 'counted', FOUND);
END;
$$;
