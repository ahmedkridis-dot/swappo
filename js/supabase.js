/* ============================================
   Swappo — Supabase Client Configuration
   Phase 1: Auth only (signUp, signIn, signOut)
   Items + chat live in Supabase. localStorage only mirrors non-PII display state.
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
      console.warn('[Swappo] Supabase CDN not loaded — SwappoAuth will be offline until page refresh.');
    }
  } catch (e) {
    console.error('[Swappo] Supabase init failed:', e);
  }
})();

// Expose for other scripts
try { window.db = db; } catch (e) {}

// ---- FAST PATH: synchronous session + profile read ----------------------
// The Supabase SDK restores the session asynchronously AFTER createClient
// returns (see _authReady below). But the JWT + user object are already
// sitting in localStorage under `sb-<projectRef>-auth-token` as JSON.
// Every page that waits for `_authReady` takes the full 2.5 s timeout on
// cold loads — even though we could have answered "who is this user?" in
// < 1 ms by reading localStorage directly.
//
// These helpers let cold-load code paths (profile.html, chat.html, navbar
// chips) render the right shell on the first frame and fire their
// Supabase queries immediately — the SDK attaches the JWT from localStorage
// to each request automatically, so the queries authenticate correctly
// even before `_authReady` has resolved.
//
// Caveat: a stale/expired token in localStorage will make the fast path
// return a "user" that Supabase will then 401 on. We gate on `expires_at`
// to avoid that, and any failed query falls back to the normal auth flow.

function _getSupabaseStorageKey() {
  // Supabase derives its storage key from the project URL's host prefix.
  try {
    var ref = String(SUPABASE_URL).replace(/^https?:\/\//, '').split('.')[0];
    return 'sb-' + ref + '-auth-token';
  } catch (e) { return null; }
}

function _readFastSession() {
  try {
    var key = _getSupabaseStorageKey();
    if (!key) return null;
    var raw = localStorage.getItem(key);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (!parsed || !parsed.user || !parsed.user.id) return null;
    // expires_at is seconds since epoch. Give 30 s buffer so a request
    // that lands just before expiry doesn't 401 halfway through.
    var exp = Number(parsed.expires_at || 0);
    if (exp && (Date.now() / 1000) > (exp - 30)) return null;
    return parsed;
  } catch (e) { return null; }
}

/**
 * Synchronous user accessor for cold-load code paths. Returns the user
 * object from localStorage (id + email + user_metadata) when the JWT is
 * present and not expired, else null. Never awaits, never touches the
 * network.
 */
function getFastUser() {
  var s = _readFastSession();
  return s && s.user ? s.user : null;
}
try { window.getFastUser = getFastUser; } catch (e) {}

// ---- SwappoCache: tiny localStorage wrapper (stale-while-revalidate) -----
// Used to survive cold reloads: pages paint from cache on the first frame
// then refresh in the background. Keys are versioned so we can invalidate
// the whole cache by bumping _CACHE_VERSION when the shape changes.
var _CACHE_VERSION = 1;
var _CACHE_PREFIX = 'swp_cache_v' + _CACHE_VERSION + '_';

var SwappoCache = {
  get: function (key, maxAgeMs) {
    try {
      var raw = localStorage.getItem(_CACHE_PREFIX + key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.t !== 'number') return null;
      if (maxAgeMs && (Date.now() - parsed.t) > maxAgeMs) return null;
      return parsed.v;
    } catch (e) { return null; }
  },
  getWithAge: function (key) {
    try {
      var raw = localStorage.getItem(_CACHE_PREFIX + key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.t !== 'number') return null;
      return { value: parsed.v, ageMs: Date.now() - parsed.t };
    } catch (e) { return null; }
  },
  set: function (key, value) {
    try {
      localStorage.setItem(_CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), v: value }));
    } catch (e) { /* quota — ignore */ }
  },
  remove: function (key) {
    try { localStorage.removeItem(_CACHE_PREFIX + key); } catch (e) {}
  },
  clearAll: function () {
    try {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(_CACHE_PREFIX) === 0) keys.push(k);
      }
      keys.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
  }
};
try { window.SwappoCache = SwappoCache; } catch (e) {}

// ---- Auth-ready gate ------------------------------------------------------
// The Supabase JS SDK restores persisted sessions asynchronously AFTER
// createClient returns. If any page calls SwappoAuth.getCurrentUser() before
// that restoration finishes, getSession() returns null and the page wrongly
// redirects the user to login. Symptom: "site jumps from profile → login →
// home → profile → login ..." as each page hits the race.
//
// Fix: expose a promise that resolves as soon as the SDK has emitted its
// first auth-state event (INITIAL_SESSION / SIGNED_IN / SIGNED_OUT). Callers
// that need a reliable session read should `await _authReady` first.
let _authReadyResolve = null;
const _authReady = new Promise((resolve) => { _authReadyResolve = resolve; });
// Safety: resolve after 2.5s even if no event arrives (some browsers skip
// INITIAL_SESSION when storage is empty). Bumped from 1.5s → 2.5s on
// 2026-04-18 after Ahmed reported iOS Safari cold-starts bouncing
// freshly-logged-in users back to login — a 1.5s timeout fired before
// the SDK finished rehydrating the JWT on slow connections. 2.5s is
// still well under the 3s per-query timeout downstream.
setTimeout(() => { if (_authReadyResolve) { _authReadyResolve(null); _authReadyResolve = null; } }, 2500);

// ---- legacy-auth mirror helpers ----
// SwappoAuth writes the authenticated user into localStorage.swappo_current_user
// in the shape that existing legacy-auth consumers expect. This lets the rest of
// the app (catalogue, product, chat, profile, navbar) keep calling
// legacy-auth.getCurrentUser() without any change while passwords live only in
// Supabase (never in localStorage).

function _mirrorFromSupabase(user, profile) {
  if (!user) return null;
  const meta = user.user_metadata || {};
  // B-016: NEVER mirror PII (email, phone, raw name) into localStorage — XSS risk.
  // Sensitive fields must be read fresh from Supabase each session via getCurrentUser()
  // and getUserProfile(). The mirror is strictly for non-PII display state.
  const swapperId = (user.id || '').replace(/-/g,'').slice(0,4).toUpperCase() || 'USER';
  const displayName = (profile && profile.display_name) || (profile && profile.pseudo) || meta.pseudo || ('Swapper#' + swapperId);
  const mirrored = {
    id: user.id,
    display_name: displayName,
    pseudo: (profile && profile.pseudo) || meta.pseudo || '',
    swapper_id: swapperId,
    avatar: (profile && profile.avatar) || meta.avatar || '',
    plan: (profile && profile.plan) || 'free',
    swap_count: (profile && profile.swap_count) || 0,
    badge: (profile && profile.badge) || 'newcomer',
    is_pro: !!(profile && profile.is_pro),
    rating_avg: (profile && profile.rating_avg) || 0,
    rating_count: (profile && profile.rating_count) || 0,
    created_at: user.created_at || new Date().toISOString()
  };
  try {
    localStorage.setItem('swappo_current_user', JSON.stringify(mirrored));
  } catch (e) { /* quota — ignore */ }
  return mirrored;
}

// PII accessors — always hit Supabase, never cache email/phone.
async function getAuthPII() {
  if (!db) return { email: '', phone: '' };
  try {
    const { data } = await db.auth.getUser();
    if (!data || !data.user) return { email: '', phone: '' };
    return { email: data.user.email || '', phone: data.user.phone || '' };
  } catch (e) { return { email: '', phone: '' }; }
}
try { window.getAuthPII = getAuthPII; } catch (e) {}

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
      // Auto-confirmed: mirror into localStorage for legacy-auth compat.
      // Profile fetch is non-blocking — if it stalls (network hiccup) we
      // still complete the signup flow and redirect the user.
      try {
        const profile = await Promise.race([
          _fetchProfile(data.user.id),
          new Promise((r) => setTimeout(() => r(null), 3000))
        ]);
        _mirrorFromSupabase(data.user, profile);
      } catch (e) {
        console.warn('[signUp] profile mirror skipped:', e.message || e);
        _mirrorFromSupabase(data.user, null);
      }
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
      // Profile fetch is non-blocking so login UI doesn't get stuck on a
      // slow SELECT users query. If it times out, we still complete the
      // login and mirror minimal user_metadata into localStorage.
      try {
        const profile = await Promise.race([
          _fetchProfile(data.user.id),
          new Promise((r) => setTimeout(() => r(null), 3000))
        ]);
        _mirrorFromSupabase(data.user, profile);
      } catch (e) {
        console.warn('[signIn] profile mirror skipped:', e.message || e);
        _mirrorFromSupabase(data.user, null);
      }
      return { success: true, user: data.user };
    } catch (e) {
      return { success: false, error: e.message || 'Login failed.' };
    }
  },

  /** Sign out: clears Supabase session + the mirror. */
  signOut: async function () {
    try { if (db) await db.auth.signOut(); } catch (e) {}
    _clearMirror();
    return { success: true };
  },

  /**
   * Send an OTP SMS to a UAE phone (signup OR login — Supabase handles both).
   * @param {string} phone — E.164 format, e.g. '+971501234567'
   * @returns {Promise<{success:boolean, error?:string, notConfigured?:boolean}>}
   *   notConfigured=true when Supabase has no SMS provider set up yet (expected
   *   in dev; UI should show "SMS verification coming soon" instead of erroring).
   */
  signInWithPhone: async function (phone) {
    if (!db) return { success: false, error: 'Auth service unavailable.' };
    if (!phone) return { success: false, error: 'Phone number required.' };
    try {
      const { error } = await db.auth.signInWithOtp({ phone: phone });
      if (error) {
        // Detect "SMS provider not configured" — Supabase returns a specific
        // message when no Twilio/MessageBird credentials are set.
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('sms') && (msg.includes('provider') || msg.includes('not configured') || msg.includes('not enabled'))) {
          return { success: false, notConfigured: true, error: 'SMS verification coming soon — please use email for now.' };
        }
        return { success: false, error: error.message || 'Could not send OTP.' };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'OTP send failed.' };
    }
  },

  /**
   * Verify the 6-digit OTP code for a phone sign-in.
   * @param {string} phone — E.164
   * @param {string} token — 6-digit code from SMS
   */
  verifyPhoneOtp: async function (phone, token) {
    if (!db) return { success: false, error: 'Auth service unavailable.' };
    if (!phone || !token) return { success: false, error: 'Phone and code required.' };
    try {
      const { data, error } = await db.auth.verifyOtp({
        phone: phone,
        token: token,
        type: 'sms'
      });
      if (error) return { success: false, error: error.message || 'Invalid code.' };
      // Mirror session user (profile fetch non-blocking — pseudo may be null at
      // this point since phone-only users set it during onboarding).
      try {
        const profile = await Promise.race([
          _fetchProfile(data.user.id),
          new Promise((r) => setTimeout(() => r(null), 3000))
        ]);
        _mirrorFromSupabase(data.user, profile);
      } catch (e) { _mirrorFromSupabase(data.user, null); }
      return { success: true, user: data.user };
    } catch (e) {
      return { success: false, error: e.message || 'OTP verification failed.' };
    }
  },

  /**
   * Check if a pseudo is available (case-insensitive, strict charset).
   * Uses RPC is_pseudo_available which is SECURITY DEFINER so any client
   * can check without leaking the full users table via SELECT.
   */
  isPseudoAvailable: async function (candidate) {
    if (!db || !candidate) return false;
    try {
      const { data, error } = await db.rpc('is_pseudo_available', { candidate: candidate });
      if (error) { console.warn('[isPseudoAvailable]', error.message); return false; }
      return data === true;
    } catch (e) { return false; }
  },

  /**
   * Update the current user's profile (pseudo / avatar / name / city / bio).
   * Uses RLS policy users_update_self — will fail for other users' rows.
   * Returns the updated profile row on success.
   */
  updateProfile: async function (updates) {
    if (!db) return { success: false, error: 'Auth service unavailable.' };
    const u = await SwappoAuth.getCurrentUser();
    if (!u) return { success: false, error: 'Not signed in.' };
    const payload = {};
    ['pseudo', 'avatar', 'name', 'city', 'bio', 'phone'].forEach((k) => {
      if (typeof updates[k] !== 'undefined') payload[k] = updates[k];
    });
    if (!Object.keys(payload).length) return { success: false, error: 'Nothing to update.' };
    try {
      const { data, error } = await db.from('users').update(payload).eq('id', u.id).select('*').single();
      if (error) return { success: false, error: error.message || 'Update failed.' };
      // Write back into the shared profile cache so any module that reads
      // it afterwards (avatar chip, bell popup, chat header) sees the new
      // values without another round-trip.
      _profileCache.set(u.id, data);
      _profileInflight.delete(u.id);
      _mirrorFromSupabase(u, data);
      return { success: true, profile: data };
    } catch (e) {
      return { success: false, error: e.message || 'Update failed.' };
    }
  },

  /**
   * Returns true if the current user must be redirected to onboarding.html
   * (i.e., signed in but no pseudo yet).
   */
  needsOnboarding: async function () {
    const u = await SwappoAuth.getCurrentUser();
    if (!u) return false;
    const profile = await _fetchProfile(u.id);
    return !profile || !profile.pseudo;
  },

  /**
   * OAuth sign-in via a third-party provider (google / apple / facebook).
   * Deprecated for Swappo launch — kept in code in case providers are added later.
   *
   * @param {'google'|'apple'|'facebook'} provider
   * @param {string} redirectTo — absolute URL to land on after approval
   */
  signInWithOAuth: async function (provider, redirectTo) {
    if (!db) return { success: false, error: 'Auth service unavailable.' };
    if (!provider) return { success: false, error: 'Provider required.' };
    try {
      const { error } = await db.auth.signInWithOAuth({
        provider: provider,
        options: redirectTo ? { redirectTo: redirectTo } : {}
      });
      if (error) return { success: false, error: error.message || 'OAuth failed.' };
      // On success the browser navigates away — caller will not run further code.
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'OAuth failed.' };
    }
  },

  /**
   * Send a password reset email. User clicks the link and lands on the
   * redirect URL with `type=recovery` in the hash — Supabase auto-sets
   * a one-time session allowing updateUser({ password: ... }).
   */
  resetPassword: async function (email, redirectTo) {
    if (!db) return { success: false, error: 'Auth service unavailable.' };
    if (!email) return { success: false, error: 'Email required.' };
    try {
      const { error } = await db.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo || (window.location.origin + '/pages/login.html?reset=true')
      });
      if (error) return { success: false, error: error.message || 'Reset email failed.' };
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Reset email failed.' };
    }
  },

  /**
   * Returns the currently authenticated Supabase user, or null.
   * Uses getSession() (local read of cached JWT) rather than getUser()
   * which makes a network roundtrip and can hang indefinitely if the
   * /auth/v1/user endpoint is slow or blocked. Wrapped in a 3s timeout
   * as a belt-and-braces safety.
   */
  getCurrentUser: async function () {
    if (!db) return null;
    // Wait for the SDK to finish its initial session restoration before
    // asking for the session — this eliminates the "page jumps to login"
    // race that happens on cold page loads.
    try { await _authReady; } catch (e) {}
    try {
      const res = await Promise.race([
        db.auth.getSession(),
        new Promise((resolve) => setTimeout(
          () => resolve({ data: { session: null } }), 3000
        ))
      ]);
      return res && res.data && res.data.session ? res.data.session.user : null;
    } catch (e) {
      console.warn('[SwappoAuth.getCurrentUser] error (returning null):', e.message || e);
      return null;
    }
  },

  /** Sync current session into the mirror. Call once on page load. */
  syncMirror: async function () {
    if (!db) return null;
    try { await _authReady; } catch (e) {}
    try {
      const res = await Promise.race([
        db.auth.getSession(),
        new Promise((resolve) => setTimeout(
          () => resolve({ data: { session: null } }), 3000
        ))
      ]);
      const sessionUser = res && res.data && res.data.session ? res.data.session.user : null;
      if (!sessionUser) { _clearMirror(); return null; }
      const profile = await _fetchProfile(sessionUser.id);
      return _mirrorFromSupabase(sessionUser, profile);
    } catch (e) {
      console.warn('[SwappoAuth.syncMirror] error (returning null):', e.message || e);
      return null;
    }
  }
};
// Expose the cached profile API so consumers (dashboard-link.js,
// messages-icon.js, notifications-bell.js, chat page init, etc.)
// share one network round-trip instead of firing redundant
// `users?id=eq.<uid>` queries during cold page boot.
SwappoAuth.getUserProfile       = getUserProfile;
SwappoAuth.getCachedProfile     = getCachedProfile;
SwappoAuth.getFastUser          = getFastUser;
SwappoAuth.invalidateProfileCache = _invalidateProfileCache;
// Promise that resolves once the SDK has finished restoring the persisted
// session (or after the 2.5 s safety-net). Consumers that normally waited
// 400 ms with setTimeout can await this instead — it fires as soon as the
// real session state is known, which on warm loads is ~10-50 ms.
SwappoAuth.whenReady            = function () { return _authReady; };
try { window.SwappoAuth = SwappoAuth; } catch (e) {}

// ---- Session helpers (kept for backwards compat) ----
// NOTE: these use getSession() (local read) with a 3s Promise.race guard,
// matching SwappoAuth.getCurrentUser(). Never getUser() — that endpoint
// makes a network call and can hang indefinitely.

async function getCurrentUser() {
  if (!db) return null;
  try { await _authReady; } catch (e) {}
  try {
    const res = await Promise.race([
      db.auth.getSession(),
      new Promise((resolve) => setTimeout(
        () => resolve({ data: { session: null } }), 3000
      ))
    ]);
    return res && res.data && res.data.session ? res.data.session.user : null;
  } catch (e) {
    console.warn('[getCurrentUser] error (returning null):', e.message || e);
    return null;
  }
}

async function getCurrentSession() {
  if (!db) return null;
  try { await _authReady; } catch (e) {}
  try {
    const res = await Promise.race([
      db.auth.getSession(),
      new Promise((resolve) => setTimeout(
        () => resolve({ data: { session: null } }), 3000
      ))
    ]);
    return res && res.data ? res.data.session : null;
  } catch (e) {
    console.warn('[getCurrentSession] error:', e.message || e);
    return null;
  }
}

// In-memory profile cache. Multiple modules boot in parallel
// (dashboard-link, messages-icon, notifications-bell, chat page init)
// and used to fire `users?id=eq.<uid>` 4-5× back-to-back. A shared
// Promise-per-userId coalesces the requests so the first call does
// the network work and everyone else awaits the same Promise.
const _profileCache = new Map();       // userId → resolved profile (or null)
const _profileInflight = new Map();    // userId → Promise<profile|null>

function _invalidateProfileCache(userId) {
  if (userId) { _profileCache.delete(userId); _profileInflight.delete(userId); }
  else        { _profileCache.clear();        _profileInflight.clear(); }
}

async function _fetchProfile(userId, { force } = {}) {
  if (!db || !userId) return null;
  if (!force && _profileCache.has(userId)) return _profileCache.get(userId);
  if (!force && _profileInflight.has(userId)) return _profileInflight.get(userId);

  // Warm the in-memory cache from localStorage so subsequent sync reads
  // via getCachedProfile() return immediately, even on the very first
  // call after boot.
  if (!force && !_profileCache.has(userId)) {
    var cached = SwappoCache.get('profile_' + userId);
    if (cached) _profileCache.set(userId, cached);
  }

  const promise = (async () => {
    try {
      // 3s timeout so the whole site can't be hung by a slow profile SELECT
      const res = await Promise.race([
        db.from('users').select('*').eq('id', userId).single(),
        new Promise((resolve) => setTimeout(
          () => resolve({ data: null, error: { message: 'profile fetch timeout' } }), 3000
        ))
      ]);
      if (res.error) {
        // The 3s timeout is expected graceful degradation — not worth
        // flooding the console on every cold load. Surface real errors.
        var msg = res.error.message || String(res.error);
        if (!/timeout/i.test(msg)) console.warn('[_fetchProfile] supabase error:', msg);
        return _profileCache.get(userId) || null;
      }
      _profileCache.set(userId, res.data);
      // Mirror into localStorage for next cold load.
      SwappoCache.set('profile_' + userId, res.data);
      return res.data;
    } catch (e) {
      console.warn('[_fetchProfile] exception:', e.message || e);
      return _profileCache.get(userId) || null;
    } finally {
      _profileInflight.delete(userId);
    }
  })();
  _profileInflight.set(userId, promise);
  return promise;
}

/**
 * Synchronous accessor for a profile we've already fetched (in-memory or
 * localStorage). Returns null if we have nothing cached yet. Callers use
 * this to paint on the first frame before awaiting the fresh fetch.
 */
function getCachedProfile(userId) {
  if (!userId) return null;
  if (_profileCache.has(userId)) return _profileCache.get(userId);
  var cached = SwappoCache.get('profile_' + userId);
  if (cached) { _profileCache.set(userId, cached); return cached; }
  return null;
}
try { window.getCachedProfile = getCachedProfile; } catch (e) {}

async function getUserProfile(userId, opts) {
  try {
    const uid = userId || (await getCurrentUser())?.id;
    if (!uid) return null;
    return _fetchProfile(uid, opts);
  } catch (e) {
    console.warn('[getUserProfile] error:', e.message || e);
    return null;
  }
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
    // Resolve the auth-ready gate on the first event we see from the SDK.
    // INITIAL_SESSION fires once persisted-session restoration is complete;
    // SIGNED_IN / SIGNED_OUT cover the other possible first events.
    if (_authReadyResolve) {
      _authReadyResolve(session || null);
      _authReadyResolve = null;
    }
    // IMPORTANT: only re-fetch the profile on events that can actually CHANGE
    // the profile state — SIGNED_IN (fresh login) and INITIAL_SESSION (cold
    // page load with a restored session). We deliberately DO NOT re-fetch on
    // TOKEN_REFRESHED because the Supabase SDK fires that event every ~3s
    // while a token is live, which caused a GET /rest/v1/users polling loop
    // (reported by Cowork 2026-04-15). The JWT refresh does not touch the
    // users table, so mirroring stays valid across refreshes.
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      if (session && session.user) {
        const profile = await _fetchProfile(session.user.id);
        _mirrorFromSupabase(session.user, profile);
      }
      updateNavbarAuth();
    } else if (event === 'TOKEN_REFRESHED') {
      // No profile fetch. The mirrored user stays valid because the
      // underlying profile row hasn't changed; only the JWT was rotated.
      // Navbar also doesn't need a refresh on token rotation.
    } else if (event === 'SIGNED_OUT') {
      _clearMirror();
      // Drop all localStorage caches so the next user (or the login page
      // itself) never sees a snapshot of the old user's dashboard.
      try { SwappoCache.clearAll(); } catch (e) {}
      _invalidateProfileCache();
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
// Renamed from BADGE_TIERS to _SWAPPO_BADGE_TIERS to avoid collision with
// the legacy fixtures file which also declares a (different-shape) BADGE_TIERS const.

const _SWAPPO_BADGE_TIERS = [
  { tier: 'legend',   min: 75, emoji: '👑' },
  { tier: 'elite',    min: 30, emoji: '🏆' },
  { tier: 'pro',      min: 15, emoji: '💎' },
  { tier: 'active',   min: 5,  emoji: '🔥' },
  { tier: 'swapper',  min: 1,  emoji: '⭐' },
  { tier: 'newcomer', min: 0,  emoji: '🌱' }
];

function getBadgeEmoji(tier) {
  const badge = _SWAPPO_BADGE_TIERS.find(b => b.tier === tier);
  return badge ? badge.emoji : '🌱';
}

function getTierForCount(swapCount) {
  for (const b of _SWAPPO_BADGE_TIERS) {
    if (swapCount >= b.min) return b;
  }
  return _SWAPPO_BADGE_TIERS[_SWAPPO_BADGE_TIERS.length - 1];
}
