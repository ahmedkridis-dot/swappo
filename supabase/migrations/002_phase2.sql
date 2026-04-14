-- ============================================
-- Swappo — Phase 2 Migration: items, swaps, chat, favorites, reports, storage
-- Run once in Supabase → SQL Editor → New query → paste → Run.
--
-- Depends on: 001_init.sql (public.users table + handle_new_user trigger).
--
-- What it does:
--   1. items           — user listings (swap / sale / gift)
--   2. favorites       — user wishlists
--   3. swaps           — swap proposals + status machine
--   4. conversations   — 1-to-1 chat threads (pre- or post-accept)
--   5. messages        — chat messages with is_system flag
--   6. reports         — abuse reports (auto-suspend at 3)
--   7. notifications   — push/email queue
--   8. Storage bucket  — item-photos (public read, auth write)
--   9. RLS policies    — safe defaults, identity-reveal gate
--  10. Realtime        — enable publication on messages + swaps
--
-- Safe to re-run (idempotent: IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS).
-- ============================================

-- ========== 1. ITEMS ==========
CREATE TABLE IF NOT EXISTS public.items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Categorization (structured fields only — no free text, per business rule #3)
  category       text NOT NULL,
  subcategory    text DEFAULT '',
  type           text DEFAULT '',
  brand          text DEFAULT '',
  model          text DEFAULT '',
  condition      text DEFAULT '',
  year           text DEFAULT '',
  size           text DEFAULT '',
  color          text DEFAULT '',

  -- Photos (array of public storage URLs, max 5 enforced client-side)
  photos         text[] NOT NULL DEFAULT '{}',

  -- Listing type
  is_giveaway    boolean NOT NULL DEFAULT false,
  price          numeric(10,2) DEFAULT 0,

  -- Boost
  is_boosted     boolean NOT NULL DEFAULT false,
  boost_expires_at timestamptz,

  -- Location (optional, from browser GPS)
  lat            double precision,
  lng            double precision,
  city           text DEFAULT '',
  emirate        text DEFAULT '',

  -- Status machine: 'available' -> 'reserved' (in swap) -> 'swapped' | 'sold' | 'removed'
  status         text NOT NULL DEFAULT 'available'
                 CHECK (status IN ('available', 'reserved', 'swapped', 'sold', 'removed')),

  -- Counters (denormalized for speed; updated via triggers)
  favorites_count integer NOT NULL DEFAULT 0,
  views_count    integer NOT NULL DEFAULT 0,

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS items_user_id_idx      ON public.items(user_id);
CREATE INDEX IF NOT EXISTS items_status_idx       ON public.items(status);
CREATE INDEX IF NOT EXISTS items_category_idx     ON public.items(category);
CREATE INDEX IF NOT EXISTS items_is_giveaway_idx  ON public.items(is_giveaway) WHERE is_giveaway = true;
CREATE INDEX IF NOT EXISTS items_is_boosted_idx   ON public.items(is_boosted)  WHERE is_boosted = true;
CREATE INDEX IF NOT EXISTS items_created_at_idx   ON public.items(created_at DESC);

DROP TRIGGER IF EXISTS items_set_updated_at ON public.items;
CREATE TRIGGER items_set_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ========== 2. FAVORITES ==========
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_id   uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS favorites_item_id_idx ON public.favorites(item_id);

-- Keep items.favorites_count in sync
CREATE OR REPLACE FUNCTION public.bump_favorites_count()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.items SET favorites_count = favorites_count + 1 WHERE id = NEW.item_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.items SET favorites_count = GREATEST(favorites_count - 1, 0) WHERE id = OLD.item_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS favorites_count_ins ON public.favorites;
DROP TRIGGER IF EXISTS favorites_count_del ON public.favorites;
CREATE TRIGGER favorites_count_ins
  AFTER INSERT ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.bump_favorites_count();
CREATE TRIGGER favorites_count_del
  AFTER DELETE ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.bump_favorites_count();


-- ========== 3. SWAPS ==========
-- Status machine:
--   pending → accepted → completed | cancelled
--   pending → declined
--   accepted → cancelled
CREATE TABLE IF NOT EXISTS public.swaps (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  proposer_item_id  uuid REFERENCES public.items(id) ON DELETE SET NULL,
  receiver_item_id  uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,

  -- Cash balancing + sale-only flag
  cash_amount       numeric(10,2) DEFAULT 0,
  cash_direction    text CHECK (cash_direction IN ('proposer_pays', 'receiver_pays', 'none'))
                    DEFAULT 'none',
  is_purchase       boolean NOT NULL DEFAULT false,   -- pure cash buy (no proposer_item)
  is_giveaway_claim boolean NOT NULL DEFAULT false,   -- Gift Corner claim

  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'completed', 'expired')),

  -- QR-confirmation flow (both parties must confirm in person)
  proposer_confirmed boolean NOT NULL DEFAULT false,
  receiver_confirmed boolean NOT NULL DEFAULT false,
  confirmation_code  text,  -- short 6-char code shown in QR

  -- Ratings (1-5)
  proposer_rating   smallint CHECK (proposer_rating BETWEEN 1 AND 5),
  receiver_rating   smallint CHECK (receiver_rating BETWEEN 1 AND 5),

  created_at        timestamptz NOT NULL DEFAULT now(),
  accepted_at       timestamptz,
  completed_at      timestamptz,
  expires_at        timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS swaps_proposer_idx ON public.swaps(proposer_id);
CREATE INDEX IF NOT EXISTS swaps_receiver_idx ON public.swaps(receiver_id);
CREATE INDEX IF NOT EXISTS swaps_status_idx   ON public.swaps(status);
CREATE INDEX IF NOT EXISTS swaps_proposer_item_idx ON public.swaps(proposer_item_id);
CREATE INDEX IF NOT EXISTS swaps_receiver_item_idx ON public.swaps(receiver_item_id);


-- ========== 4. CONVERSATIONS ==========
-- 1 row per (userA, userB, item) triple. We normalize so user1_id < user2_id lex.
CREATE TABLE IF NOT EXISTS public.conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user2_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_id     uuid REFERENCES public.items(id) ON DELETE SET NULL,
  swap_id     uuid REFERENCES public.swaps(id) ON DELETE SET NULL,

  -- Gates chat opening; identity reveal happens when swap is mutually accepted
  identity_revealed boolean NOT NULL DEFAULT false,

  last_message_at   timestamptz NOT NULL DEFAULT now(),
  last_message_preview text DEFAULT '',

  created_at  timestamptz NOT NULL DEFAULT now(),

  CHECK (user1_id <> user2_id),
  UNIQUE (user1_id, user2_id, item_id)
);

CREATE INDEX IF NOT EXISTS conversations_user1_idx ON public.conversations(user1_id);
CREATE INDEX IF NOT EXISTS conversations_user2_idx ON public.conversations(user2_id);
CREATE INDEX IF NOT EXISTS conversations_last_msg_idx ON public.conversations(last_message_at DESC);


-- ========== 5. MESSAGES ==========
CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  content         text NOT NULL,
  is_system       boolean NOT NULL DEFAULT false,  -- for "Swap accepted", "Counter-offer", etc
  read_by_other   boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conv_idx       ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS messages_sender_idx     ON public.messages(sender_id);

-- Bump conversation preview on new message
CREATE OR REPLACE FUNCTION public.bump_conversation_preview()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.conversations
    SET last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 120)
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_bump_preview ON public.messages;
CREATE TRIGGER messages_bump_preview
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_preview();


-- ========== 6. REPORTS ==========
CREATE TABLE IF NOT EXISTS public.reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_user  uuid REFERENCES public.users(id) ON DELETE CASCADE,
  target_item  uuid REFERENCES public.items(id) ON DELETE CASCADE,
  reason       text NOT NULL,
  details      text DEFAULT '',
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed','actioned')),
  created_at   timestamptz NOT NULL DEFAULT now(),

  CHECK (target_user IS NOT NULL OR target_item IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS reports_target_user_idx ON public.reports(target_user);
CREATE INDEX IF NOT EXISTS reports_target_item_idx ON public.reports(target_item);
CREATE INDEX IF NOT EXISTS reports_status_idx      ON public.reports(status);

-- Auto-increment users.reports_count + auto-suspend at 3
CREATE OR REPLACE FUNCTION public.apply_report_to_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.target_user IS NOT NULL THEN
    UPDATE public.users
      SET reports_count = reports_count + 1,
          is_suspended = CASE WHEN reports_count + 1 >= 3 THEN true ELSE is_suspended END
      WHERE id = NEW.target_user;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reports_apply ON public.reports;
CREATE TRIGGER reports_apply
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.apply_report_to_user();


-- ========== 7. NOTIFICATIONS ==========
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind       text NOT NULL,     -- swap_proposal, swap_accepted, new_message, boost_expiring, ...
  payload    jsonb NOT NULL DEFAULT '{}',
  is_read    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notif_user_created_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notif_unread_idx ON public.notifications(user_id) WHERE is_read = false;


-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- ---------- ITEMS ----------
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS items_select_all     ON public.items;
DROP POLICY IF EXISTS items_insert_self    ON public.items;
DROP POLICY IF EXISTS items_update_owner   ON public.items;
DROP POLICY IF EXISTS items_delete_owner   ON public.items;

-- Guest teaser model (business rule #7): everyone can browse.
-- We hide the last 2 photos client-side for guests — RLS stays permissive on read.
CREATE POLICY items_select_all ON public.items
  FOR SELECT USING (true);

CREATE POLICY items_insert_self ON public.items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY items_update_owner ON public.items
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY items_delete_owner ON public.items
  FOR DELETE USING (auth.uid() = user_id);


-- ---------- FAVORITES ----------
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fav_select_self ON public.favorites;
DROP POLICY IF EXISTS fav_insert_self ON public.favorites;
DROP POLICY IF EXISTS fav_delete_self ON public.favorites;

CREATE POLICY fav_select_self ON public.favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY fav_insert_self ON public.favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY fav_delete_self ON public.favorites
  FOR DELETE USING (auth.uid() = user_id);


-- ---------- SWAPS ----------
ALTER TABLE public.swaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS swaps_select_party  ON public.swaps;
DROP POLICY IF EXISTS swaps_insert_proposer ON public.swaps;
DROP POLICY IF EXISTS swaps_update_party  ON public.swaps;

CREATE POLICY swaps_select_party ON public.swaps
  FOR SELECT USING (auth.uid() = proposer_id OR auth.uid() = receiver_id);

CREATE POLICY swaps_insert_proposer ON public.swaps
  FOR INSERT WITH CHECK (auth.uid() = proposer_id);

CREATE POLICY swaps_update_party ON public.swaps
  FOR UPDATE USING (auth.uid() = proposer_id OR auth.uid() = receiver_id)
            WITH CHECK (auth.uid() = proposer_id OR auth.uid() = receiver_id);


-- ---------- CONVERSATIONS ----------
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conv_select_party ON public.conversations;
DROP POLICY IF EXISTS conv_insert_party ON public.conversations;
DROP POLICY IF EXISTS conv_update_party ON public.conversations;

CREATE POLICY conv_select_party ON public.conversations
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY conv_insert_party ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY conv_update_party ON public.conversations
  FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id)
            WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);


-- ---------- MESSAGES ----------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS msg_select_party ON public.messages;
DROP POLICY IF EXISTS msg_insert_sender ON public.messages;
DROP POLICY IF EXISTS msg_update_party ON public.messages;

CREATE POLICY msg_select_party ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (auth.uid() = c.user1_id OR auth.uid() = c.user2_id)
    )
  );

CREATE POLICY msg_insert_sender ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (auth.uid() = c.user1_id OR auth.uid() = c.user2_id)
    )
  );

-- Mark-as-read updates (read_by_other) from the OTHER party only
CREATE POLICY msg_update_party ON public.messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (auth.uid() = c.user1_id OR auth.uid() = c.user2_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (auth.uid() = c.user1_id OR auth.uid() = c.user2_id)
    )
  );


-- ---------- REPORTS ----------
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reports_insert_self ON public.reports;
DROP POLICY IF EXISTS reports_select_self ON public.reports;

CREATE POLICY reports_insert_self ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY reports_select_self ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id);


-- ---------- NOTIFICATIONS ----------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notif_select_self ON public.notifications;
DROP POLICY IF EXISTS notif_update_self ON public.notifications;

CREATE POLICY notif_select_self ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY notif_update_self ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ============================================
-- STORAGE — item-photos bucket
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'item-photos',
  'item-photos',
  true,                         -- public read (photos are browseable)
  2 * 1024 * 1024,              -- 2 MB per file, client-side resize to 1600px
  ARRAY['image/webp','image/jpeg','image/png']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: anyone can read, only authenticated users can write their own folder.
-- Files are uploaded under `{auth.uid()}/...`
DROP POLICY IF EXISTS "item_photos_read_all"     ON storage.objects;
DROP POLICY IF EXISTS "item_photos_insert_self"  ON storage.objects;
DROP POLICY IF EXISTS "item_photos_update_self"  ON storage.objects;
DROP POLICY IF EXISTS "item_photos_delete_self"  ON storage.objects;

CREATE POLICY "item_photos_read_all"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'item-photos');

CREATE POLICY "item_photos_insert_self"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'item-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "item_photos_update_self"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'item-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "item_photos_delete_self"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'item-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================
-- RPC helpers for counters (called from client)
-- ============================================

-- Increment items.views_count (best-effort, no auth check needed)
CREATE OR REPLACE FUNCTION public.bump_views(item_id_in uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.items SET views_count = views_count + 1 WHERE id = item_id_in;
$$;

-- Increment users.swap_count + auto-upgrade badge tier
CREATE OR REPLACE FUNCTION public.bump_swap_count(user_id_in uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_count int;
  new_badge text;
BEGIN
  UPDATE public.users
    SET swap_count = swap_count + 1
  WHERE id = user_id_in
  RETURNING swap_count INTO new_count;

  new_badge := CASE
    WHEN new_count >= 75 THEN 'legend'
    WHEN new_count >= 30 THEN 'elite'
    WHEN new_count >= 15 THEN 'pro'
    WHEN new_count >= 5  THEN 'active'
    WHEN new_count >= 1  THEN 'swapper'
    ELSE 'newcomer'
  END;

  UPDATE public.users SET badge = new_badge WHERE id = user_id_in;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bump_views(uuid)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.bump_swap_count(uuid)  TO authenticated;


-- ============================================
-- REALTIME — enable broadcasts on messages + swaps
-- ============================================
-- Safe to run repeatedly; ALTER PUBLICATION handles duplicates gracefully.
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.swaps;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;


-- ============================================
-- DONE. Run: supabase/migrations/002_phase2.sql
-- ============================================
