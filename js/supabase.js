/* ============================================
   Swappo — Supabase Client Configuration
   Phase 1: Auth only (signUp, signIn, signOut)
   Items + chat still live in DemoAuth/localStorage.
   ============================================ */

// ---- Real Supabase project credentials (swappo.ae) ----
const SUPABASE_URL = 'https://cbhdjqionkvqiflmqchu.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_aNOfDT5NUGDTN0HH5-uLuA_b58nEslu';
// Legacy alias kept for any old code that still reads SUPABASE_ANON_KEY
const SUPABASE_ANON_KEY = SUPABASE_PUBLISHABLE_KEY;

// ---- Safe boot: only create the client if the CDN lib is loaded ----
let db = null;
(function bootSupabase() {
  try {
    if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
      db = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        },
        realtime: { params: { eventsPerSecond: 10 } }
      });
    } else {
      console.warn('[Swappo] Supabase CDN not loaded — SwappoAuth will fall back to DemoAuth.');
    }
  } catch (e) {
    console.error('[Swappo] Supabase init failed:', e);
  }
})();

// Expose for other scripts
try { window.db = db; } catch (e) {}

// ---- DemoAuth mirror helpers ----
// SwappoAuth writes the authenticated user into localStorage.swappo_current_user
// in the shape that existing DemoAuth consumers expect. This lets the rest of
// the app (catalogue, product, chat, profile, navbar) keep calling
// DemoAuth.getCurrentUser() without any change while passwords live only in
// Supabase (never in localStorage).

function _mirrorFromSupabase(user, profile) {
  if (!user) return null;
  const meta = user.user_metadata || {};
  const mirrored = {
    id: user.id,
    email: user.email,
    name: (profile && profile.name) || meta.name || '',
    pseudo: (profile && profile.pseudo) || meta.pseudo || '',
    avatar: (profile && profile.avatar) || meta.avatar || '',
    phone: (profile && profile.phone) || meta.phone || user.phone || '',
    plan: (profile && profile.plan) || 'free',
    swap_count: (profile && profile.swap_count) || 0,
    badge: (profile && profile.badge) || 'newcomer',
    created_at: user.created_at || new Date().toISOString()
  };
  try {
    localStorage.setItem('swappo_current_user', JSON.stringify(mirrored));
  } catch (e) { /* quota — ignore */ }
  return mirrored;
}

function _clearMirror() {
  try { localStorage.removeItem('swappo_current_user'); } catch (e) {}
}

// ---- Client-side validation mirror of H-2 ----
function _validateSignupInput(email, password, name, extras) {
  extras = extras || {};
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email || '')) return 'Please enter a valid email address.';
  if (!password || password.length < 8) return 'Password must be at least 8 characters.';
  // Unicode-aware name check (letters/marks/space/apostrophe/hyphen, 2-50)
  try {
    const nameRe = /^[\p{L}\p{M}][\p{L}\p{M}\s'\-]{1,49}$/u;
    if (!nameRe.test(name || '')) return 'Please enter a valid name (2-50 characters).';
  } catch (e) {
    if (!name || name.length < 2 || name.length > 50) return 'Please enter a valid name.';
  }
  if (extras.pseudo && !/^[a-zA-Z0-9_]{3,20}$/.test(extras.pseudo)) {
    return 'Username must be 3-20 letters, numbers or underscores.';
  }
  if (extras.phone && !/^5[0-9]{8}$/.test(extras.phone)) {
    return 'Please enter a valid UAE mobile number (5XXXXXXXX).';
  }
  return null;
}

// ---- SwappoAuth facade (Phase 1) ----
const SwappoAuth = {
  /** Returns true if the Supabase client booted successfully. */
  isReady: function () { return !!db; },

  /**
   * Sign up a new user via Supabase Auth.
   * Profile row is auto-created by the handle_new_user() DB trigger using
   * the raw_user_meta_data we send here.
   *
   * @returns {Promise<{success:boolean, error?:string, needsVerification?:boolean}>}
   */
  signUp: async function (email, password, name, extras) {
    if (!db) return { success: false, error: 'Auth service unavailable. Please refresh.' };
    const errMsg = _validateSignupInput(email, password, name, extras);
    if (errMsg) return { success: false, error: errMsg };

    extras = extras || {};
    try {
      const { data, error } = await db.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            name: name,
            pseudo: (extras.pseudo || '').toLowerCase(),
            avatar: extras.avatar || '',
            phone: extras.phone || ''
          }
        }
      });
      if (error) return { success: false, error: error.message || 'Signup failed.' };

      // If email confirmation is enabled, session is null until user confirms.
      if (!data.session) {
        return { success: true, needsVerification: true, user: data.user };
      }
      // Auto-confirmed: mirror into localStorage for DemoAuth compat
      const profile = await _fetchProfile(data.user.id);
      _mirrorFromSupabase(data.user, profile);
      return { success: true, needsVerification: false, user: data.user };
    } catch (e) {
      return { success: false, error: e.message || 'Signup failed.' };
    }
  },

  /**
   * Sign in with email + password.
   * @returns {Promise<{success:boolean, error?:string}>}
   */
  signIn: async function (email, password) {
    if (!db) return { success: false, error: 'Auth service unavailable. Please refresh.' };
    if (!email || !password) return { success: false, error: 'Email and password are required.' };
    try {
      const { data, error } = await db.auth.signInWithPassword({ email: email, password: password });
      if (error) return { success: false, error: error.message || 'Invalid credentials.' };
      const profile = await _fetchProfile(data.user.id);
      _mirrorFromSupabase(data.user, profile);
      return { success: true, user: data.user };
    } catch (e) {
      return { success: false, error: e.message || 'Login failed.' };
    }
  },

  /** Sign out: clears Supabase session + the DemoAuth mirror. */
  signOut: async function () {
    try { if (db) await db.auth.signOut(); } catch (e) {}
    _clearMirror();
    return { success: true };
  },

  /** Returns the currently authenticated Supabase user, or null. */
  getCurrentUser: async function () {
    if (!db) return null;
    try {
      const { data } = await db.auth.getUser();
      return data ? data.user : null;
    } catch (e) { return null; }
  },

  /** Sync current session into the DemoAuth mirror. Call once on page load. */
  syncMirror: async function () {
    if (!db) return null;
    try {
      const { data } = await db.auth.getUser();
      if (!data || !data.user) { _clearMirror(); return null; }
      const profile = await _fetchProfile(data.user.id);
      return _mirrorFromSupabase(data.user, profile);
    } catch (e) { return null; }
  }
};
try { window.SwappoAuth = SwappoAuth; } catch (e) {}

// ---- Session helpers (kept for backwards compat) ----

async function getCurrentUser() {
  if (!db) return null;
  const { data: { user } } = await db.auth.getUser();
  return user;
}

async function getCurrentSession() {
  if (!db) return null;
  const { data: { session } } = await db.auth.getSession();
  return session;
}

async function _fetchProfile(userId) {
  if (!db || !userId) return null;
  try {
    const { data, error } = await db.from('users').select('*').eq('id', userId).single();
    if (error) return null;
    return data;
  } catch (e) { return null; }
}

async function getUserProfile(userId) {
  const uid = userId || (await getCurrentUser())?.id;
  if (!uid) return null;
  return _fetchProfile(uid);
}

function isLoggedIn() {
  return getCurrentUser().then(u => !!u);
}

// ---- Navbar auth state ----

async function updateNavbarAuth() {
  if (!db) return;
  const user = await getCurrentUser();
  const profile = user ? await getUserProfile(user.id) : null;

  const joinBtn = document.querySelector('a[href*="login.html"]');
  const creditsEl = document.querySelector('.navbar-credits span');
  const profileIcon = document.querySelector('a[href*="profile.html"]');
  const chatIcon = document.querySelector('a[href*="chat.html"]');

  if (user && profile) {
    if (joinBtn) joinBtn.style.display = 'none';
    if (creditsEl) creditsEl.textContent = profile.points_balance || 0;
    if (profileIcon) profileIcon.style.opacity = '1';
    if (chatIcon) chatIcon.style.opacity = '1';
  } else {
    if (joinBtn) joinBtn.style.display = '';
    if (creditsEl) creditsEl.textContent = '0';
    if (profileIcon) profileIcon.style.opacity = '0.5';
    if (chatIcon) chatIcon.style.opacity = '0.5';
  }
}

// ---- Auth state listener ----

if (db) {
  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      if (session && session.user) {
        const profile = await _fetchProfile(session.user.id);
        _mirrorFromSupabase(session.user, profile);
      }
      updateNavbarAuth();
    } else if (event === 'SIGNED_OUT') {
      _clearMirror();
      updateNavbarAuth();
    }
  });
}

// Init navbar + mirror on page load
document.addEventListener('DOMContentLoaded', () => {
  if (db) {
    SwappoAuth.syncMirror().finally(updateNavbarAuth);
  }
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
