-- ============================================
-- Swappo — Complete Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for text search

-- ============================================
-- 1. USERS (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT DEFAULT 'Swapper',
  avatar_url TEXT,
  points_balance INTEGER NOT NULL DEFAULT 50, -- signup bonus
  badge_tier TEXT NOT NULL DEFAULT 'newcomer' CHECK (badge_tier IN ('newcomer','swapper','active','pro','elite','legend')),
  swap_count INTEGER NOT NULL DEFAULT 0,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  premium_expires_at TIMESTAMPTZ,
  giveaway_pass BOOLEAN NOT NULL DEFAULT FALSE,
  giveaway_pass_expires_at TIMESTAMPTZ,
  giveaway_claims_this_month INTEGER NOT NULL DEFAULT 0,
  giveaway_claims_reset_at TIMESTAMPTZ DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
  referral_code TEXT UNIQUE DEFAULT SUBSTR(MD5(RANDOM()::TEXT), 1, 8),
  referred_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for referral lookups
CREATE INDEX idx_users_referral_code ON public.users(referral_code);

-- ============================================
-- 2. ITEMS
-- ============================================
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- Structured fields (NO free text)
  category TEXT NOT NULL CHECK (category IN ('clothing','books','kids','sports','furniture','electronics','vehicles','plants','other')),
  type TEXT NOT NULL,           -- e.g. "T-Shirt", "Sofa", "iPhone"
  brand TEXT,                   -- optional brand
  model TEXT,                   -- optional model
  condition TEXT NOT NULL CHECK (condition IN ('new','like_new','good','fair','worn')),
  year INTEGER,                 -- year of purchase
  size TEXT,                    -- S/M/L/XL or dimensions
  color TEXT,
  material TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}', -- array of Storage URLs
  -- Giveaway
  is_giveaway BOOLEAN NOT NULL DEFAULT FALSE,
  -- Boost
  is_boosted BOOLEAN NOT NULL DEFAULT FALSE,
  boost_expires_at TIMESTAMPTZ,
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','swapped','reserved','suspended','deleted')),
  -- Location
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  city TEXT,
  -- Swap preference
  swap_for_categories TEXT[] DEFAULT '{}', -- what categories they want in return
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_items_user_id ON public.items(user_id);
CREATE INDEX idx_items_category ON public.items(category);
CREATE INDEX idx_items_status ON public.items(status);
CREATE INDEX idx_items_is_giveaway ON public.items(is_giveaway) WHERE is_giveaway = TRUE;
CREATE INDEX idx_items_is_boosted ON public.items(is_boosted) WHERE is_boosted = TRUE;
CREATE INDEX idx_items_created_at ON public.items(created_at DESC);
CREATE INDEX idx_items_location ON public.items(lat, lng) WHERE lat IS NOT NULL;

-- ============================================
-- 3. SWAPS
-- ============================================
CREATE TABLE public.swaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposer_id UUID NOT NULL REFERENCES public.users(id),
  receiver_id UUID NOT NULL REFERENCES public.users(id),
  proposer_items UUID[] NOT NULL,      -- 1-3 item IDs offered
  receiver_item_id UUID NOT NULL REFERENCES public.items(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','completed','cancelled')),
  -- Points tracking
  points_cost INTEGER NOT NULL DEFAULT 0,  -- cost per person (based on highest category)
  proposer_paid BOOLEAN NOT NULL DEFAULT FALSE,
  receiver_paid BOOLEAN NOT NULL DEFAULT FALSE,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_swaps_proposer ON public.swaps(proposer_id);
CREATE INDEX idx_swaps_receiver ON public.swaps(receiver_id);
CREATE INDEX idx_swaps_status ON public.swaps(status);
CREATE INDEX idx_swaps_receiver_item ON public.swaps(receiver_item_id);

-- ============================================
-- 4. MESSAGES (SwapChat)
-- ============================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swap_id UUID NOT NULL REFERENCES public.swaps(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id),
  content TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE, -- system messages (swap accepted, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_swap_id ON public.messages(swap_id);
CREATE INDEX idx_messages_created_at ON public.messages(swap_id, created_at);

-- ============================================
-- 5. RATINGS
-- ============================================
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swap_id UUID NOT NULL REFERENCES public.swaps(id),
  rater_id UUID NOT NULL REFERENCES public.users(id),
  rated_id UUID NOT NULL REFERENCES public.users(id),
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(swap_id, rater_id) -- one rating per person per swap
);

CREATE INDEX idx_ratings_rated_id ON public.ratings(rated_id);

-- ============================================
-- 6. POINTS TRANSACTIONS (ledger)
-- ============================================
CREATE TABLE public.points_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- positive = earn, negative = spend
  type TEXT NOT NULL CHECK (type IN (
    'signup', 'referral', 'reveal', 'boost',
    'giveaway_claim', 'giveaway_donate', 'purchase',
    'premium_reveal', 'refund'
  )),
  description TEXT,
  swap_id UUID REFERENCES public.swaps(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_points_user ON public.points_transactions(user_id);
CREATE INDEX idx_points_type ON public.points_transactions(type);
CREATE INDEX idx_points_created ON public.points_transactions(created_at DESC);

-- ============================================
-- 7. REPORTS
-- ============================================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES public.users(id),
  reported_user_id UUID REFERENCES public.users(id),
  item_id UUID REFERENCES public.items(id),
  reason TEXT NOT NULL CHECK (reason IN (
    'fake_item', 'inappropriate', 'scam', 'contact_info_in_chat',
    'no_show', 'counterfeit', 'banned_item', 'other'
  )),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_reported_user ON public.reports(reported_user_id);
CREATE INDEX idx_reports_item ON public.reports(item_id);

-- ============================================
-- 8. BADGES
-- ============================================
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN (
    -- Tier badges
    'newcomer', 'swapper', 'active', 'pro', 'elite', 'legend',
    -- Special badges
    'generous_heart', 'community_builder', 'speed_swapper', 'trusted_trader', 'category_expert',
    -- Premium
    'premium'
  )),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_type)
);

CREATE INDEX idx_badges_user ON public.badges(user_id);

-- ============================================
-- 9. GIVEAWAY LOCKS (anti-reseller)
-- ============================================
CREATE TABLE public.giveaway_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  locked_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_giveaway_locks_user ON public.giveaway_locks(user_id);
CREATE INDEX idx_giveaway_locks_active ON public.giveaway_locks(user_id, category) WHERE locked_until > NOW();

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Swapper')
  );

  -- Record signup bonus transaction
  INSERT INTO public.points_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 50, 'signup', 'Welcome bonus — 50 pts');

  -- Award newcomer badge
  INSERT INTO public.badges (user_id, badge_type)
  VALUES (NEW.id, 'newcomer');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update badge tier based on swap count
CREATE OR REPLACE FUNCTION public.update_badge_tier()
RETURNS TRIGGER AS $$
DECLARE
  new_tier TEXT;
  current_count INTEGER;
BEGIN
  current_count := NEW.swap_count;

  new_tier := CASE
    WHEN current_count >= 75 THEN 'legend'
    WHEN current_count >= 30 THEN 'elite'
    WHEN current_count >= 15 THEN 'pro'
    WHEN current_count >= 5  THEN 'active'
    WHEN current_count >= 1  THEN 'swapper'
    ELSE 'newcomer'
  END;

  IF new_tier != OLD.badge_tier THEN
    NEW.badge_tier := new_tier;

    -- Insert new tier badge
    INSERT INTO public.badges (user_id, badge_type)
    VALUES (NEW.id, new_tier)
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_swap_count_change
  BEFORE UPDATE OF swap_count ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_badge_tier();

-- Auto-expire boosts
CREATE OR REPLACE FUNCTION public.expire_boosts()
RETURNS void AS $$
BEGIN
  UPDATE public.items
  SET is_boosted = FALSE, boost_expires_at = NULL
  WHERE is_boosted = TRUE AND boost_expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset monthly giveaway claims
CREATE OR REPLACE FUNCTION public.reset_giveaway_claims()
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET giveaway_claims_this_month = 0,
      giveaway_claims_reset_at = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
  WHERE giveaway_claims_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-suspend user after 3 reports
CREATE OR REPLACE FUNCTION public.check_reports_threshold()
RETURNS TRIGGER AS $$
DECLARE
  report_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO report_count
  FROM public.reports
  WHERE reported_user_id = NEW.reported_user_id
    AND status = 'pending';

  IF report_count >= 3 THEN
    -- Suspend all their items
    UPDATE public.items
    SET status = 'suspended'
    WHERE user_id = NEW.reported_user_id AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_report
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.check_reports_threshold();

-- Updated_at auto-timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- CATEGORY POINTS COST LOOKUP
-- ============================================
CREATE OR REPLACE FUNCTION public.get_category_cost(cat TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE cat
    WHEN 'clothing'    THEN 10
    WHEN 'books'       THEN 10
    WHEN 'kids'        THEN 10
    WHEN 'sports'      THEN 12
    WHEN 'other'       THEN 12
    WHEN 'furniture'   THEN 15
    WHEN 'electronics' THEN 20
    WHEN 'vehicles'    THEN 40
    ELSE 12
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giveaway_locks ENABLE ROW LEVEL SECURITY;

-- USERS policies
CREATE POLICY "Users: public read (limited fields)" ON public.users
  FOR SELECT USING (TRUE);

CREATE POLICY "Users: update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ITEMS policies
CREATE POLICY "Items: public read active" ON public.items
  FOR SELECT USING (status IN ('active', 'reserved'));

CREATE POLICY "Items: insert own" ON public.items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Items: update own" ON public.items
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Items: delete own" ON public.items
  FOR DELETE USING (auth.uid() = user_id);

-- SWAPS policies
CREATE POLICY "Swaps: read own" ON public.swaps
  FOR SELECT USING (auth.uid() IN (proposer_id, receiver_id));

CREATE POLICY "Swaps: insert as proposer" ON public.swaps
  FOR INSERT WITH CHECK (auth.uid() = proposer_id);

CREATE POLICY "Swaps: update own" ON public.swaps
  FOR UPDATE USING (auth.uid() IN (proposer_id, receiver_id));

-- MESSAGES policies
CREATE POLICY "Messages: read own swap" ON public.messages
  FOR SELECT USING (
    swap_id IN (
      SELECT id FROM public.swaps
      WHERE proposer_id = auth.uid() OR receiver_id = auth.uid()
    )
  );

CREATE POLICY "Messages: insert own swap" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND swap_id IN (
      SELECT id FROM public.swaps
      WHERE (proposer_id = auth.uid() OR receiver_id = auth.uid())
        AND status = 'completed'
    )
  );

-- RATINGS policies
CREATE POLICY "Ratings: public read" ON public.ratings
  FOR SELECT USING (TRUE);

CREATE POLICY "Ratings: insert own" ON public.ratings
  FOR INSERT WITH CHECK (auth.uid() = rater_id);

-- POINTS TRANSACTIONS policies
CREATE POLICY "Points: read own" ON public.points_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- REPORTS policies
CREATE POLICY "Reports: insert own" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Reports: read own" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- BADGES policies
CREATE POLICY "Badges: public read" ON public.badges
  FOR SELECT USING (TRUE);

-- GIVEAWAY LOCKS policies
CREATE POLICY "Giveaway locks: read own" ON public.giveaway_locks
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKETS (run separately in Supabase)
-- ============================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('item-photos', 'item-photos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies for item-photos
-- CREATE POLICY "Item photos: public read" ON storage.objects FOR SELECT USING (bucket_id = 'item-photos');
-- CREATE POLICY "Item photos: auth upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'item-photos' AND auth.role() = 'authenticated');
-- CREATE POLICY "Item photos: owner delete" ON storage.objects FOR DELETE USING (bucket_id = 'item-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for avatars
-- CREATE POLICY "Avatars: public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- CREATE POLICY "Avatars: auth upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Avatars: owner delete" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
