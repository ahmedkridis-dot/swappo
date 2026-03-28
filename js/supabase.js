/* ============================================
   Swappo — Supabase Client Configuration
   ============================================ */

// ⚠️ REPLACE these with your real Supabase project credentials
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// Import from CDN (loaded via <script> tag in HTML)
const { createClient } = supabase;

// Singleton client
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true  // for OAuth redirects
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// ---- Session helpers ----

async function getCurrentUser() {
  const { data: { user } } = await db.auth.getUser();
  return user;
}

async function getCurrentSession() {
  const { data: { session } } = await db.auth.getSession();
  return session;
}

async function getUserProfile(userId) {
  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) return null;

  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('id', uid)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
}

function isLoggedIn() {
  return getCurrentUser().then(u => !!u);
}

// ---- Navbar auth state ----

async function updateNavbarAuth() {
  const user = await getCurrentUser();
  const profile = user ? await getUserProfile(user.id) : null;

  // Elements that exist on every page
  const joinBtn = document.querySelector('a[href*="login.html"]');
  const creditsEl = document.querySelector('.navbar-credits span');
  const profileIcon = document.querySelector('a[href*="profile.html"]');
  const chatIcon = document.querySelector('a[href*="chat.html"]');

  if (user && profile) {
    // Logged in
    if (joinBtn) joinBtn.style.display = 'none';
    if (creditsEl) creditsEl.textContent = profile.points_balance;
    if (profileIcon) profileIcon.style.opacity = '1';
    if (chatIcon) chatIcon.style.opacity = '1';
  } else {
    // Guest
    if (joinBtn) joinBtn.style.display = '';
    if (creditsEl) creditsEl.textContent = '0';
    if (profileIcon) profileIcon.style.opacity = '0.5';
    if (chatIcon) chatIcon.style.opacity = '0.5';
  }
}

// ---- Auth state listener ----

db.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event);
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
    updateNavbarAuth();
  }
});

// Init navbar on page load
document.addEventListener('DOMContentLoaded', () => {
  updateNavbarAuth();
});

// ---- Category costs (mirrors SQL function) ----

const CATEGORY_COSTS = {
  clothing: 10,
  books: 10,
  kids: 10,
  sports: 12,
  other: 12,
  furniture: 15,
  electronics: 20,
  vehicles: 40
};

function getCategoryCost(category) {
  return CATEGORY_COSTS[category] || 12;
}

// ---- Badge tier thresholds ----

const BADGE_TIERS = [
  { tier: 'legend',   min: 75, emoji: '👑' },
  { tier: 'elite',    min: 30, emoji: '🏆' },
  { tier: 'pro',      min: 15, emoji: '💎' },
  { tier: 'active',   min: 5,  emoji: '🔥' },
  { tier: 'swapper',  min: 1,  emoji: '⭐' },
  { tier: 'newcomer', min: 0,  emoji: '🌱' }
];

function getBadgeEmoji(tier) {
  const badge = BADGE_TIERS.find(b => b.tier === tier);
  return badge ? badge.emoji : '🌱';
}

function getTierForCount(swapCount) {
  for (const b of BADGE_TIERS) {
    if (swapCount >= b.min) return b;
  }
  return BADGE_TIERS[BADGE_TIERS.length - 1];
}
