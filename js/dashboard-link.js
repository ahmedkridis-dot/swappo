/* ============================================
   Swappo — Profile shortcut in navbar (top-right, persistent)
   Populates an avatar + pseudo chip that links to the real dashboard
   (pages/profile.html). The placeholder lives in each page's HTML so
   the chip paints in final shape on the first frame; this script only
   fills in the real pseudo / avatar / badge once auth resolves.
   Legacy pages without a placeholder still work — we fall back to
   injecting the node into .navbar-actions, and the chip styles already
   live in css/style.css.
   ============================================ */
(function () {
  if (window.__SwappoDashLink) return;
  window.__SwappoDashLink = true;

  const ID = 'swp-dash-link';
  const PAGE = (location.pathname || '').split('/').pop();

  function tr(key, fallback) {
    return (typeof t === 'function') ? t(key) : (fallback || key);
  }

  function createFallbackNode() {
    const base = location.pathname.indexOf('/pages/') === 0 ? '' : 'pages/';
    const link = document.createElement('a');
    link.id = ID;
    link.className = 'swp-dash-link';
    link.href = base + 'profile.html';
    link.setAttribute('aria-label', tr('dashboard_title', 'Dashboard'));
    link.setAttribute('data-i18n-aria-label', 'dashboard_title');
    link.innerHTML =
      '<span class="swp-dash-avatar swp-skel swp-skel-avatar" aria-hidden="true">A</span>' +
      '<span class="swp-dash-pseudo swp-skel swp-skel-text">username</span>' +
      '<span class="swp-dash-badge" aria-hidden="true">0</span>';
    return link;
  }

  function mount() {
    // Skip on dashboard itself + auth pages (to avoid redundancy)
    if (PAGE === 'profile.html' || PAGE === 'login.html' || PAGE === 'reset-password.html' || PAGE === 'onboarding.html') return;
    // Placeholder already in HTML → nothing to do.
    if (document.getElementById(ID)) return;
    // Fallback: legacy pages without the placeholder.
    const nav = document.querySelector('.navbar-actions');
    if (!nav) return;
    nav.insertBefore(createFallbackNode(), nav.firstChild);
  }

  function firstLetter(s) {
    if (!s) return '?';
    const ch = String(s).trim().charAt(0);
    return ch ? ch.toUpperCase() : '?';
  }

  // js/avatars.js is only on a few pages; pull it in when the value is a
  // preset key so the chip can draw the SVG instead of a letter.
  function ensureAvatarLib() {
    if (window.SwappoAvatar) return Promise.resolve(true);
    return new Promise(function (resolve) {
      const base = location.pathname.indexOf('/pages/') !== -1 ? '../js/' : 'js/';
      const sc = document.createElement('script');
      sc.src = base + 'avatars.js';
      sc.onload = function () { resolve(!!window.SwappoAvatar); };
      sc.onerror = function () { resolve(false); };
      document.head.appendChild(sc);
    });
  }
  function looksLikePresetKey(v) { return !!v && /^[a-z0-9_]+$/i.test(String(v)); }

  async function setAvatar(link, url, pseudo) {
    const current = link.querySelector('.swp-dash-avatar');
    if (!current) return;
    if (looksLikePresetKey(url) && await ensureAvatarLib()) {
      const span = document.createElement('span');
      span.className = 'swp-dash-avatar';
      span.setAttribute('aria-hidden', 'true');
      span.style.background = 'transparent';
      span.style.overflow = 'hidden';
      span.innerHTML = window.SwappoAvatar.html(url, pseudo);
      link.querySelector('.swp-dash-avatar').replaceWith(span);
      return;
    }
    if (url && !looksLikePresetKey(url)) {
      const img = new Image();
      img.className = 'swp-dash-avatar';
      img.alt = pseudo || '';
      img.src = url;
      img.onerror = function () {
        const fallback = document.createElement('span');
        fallback.className = 'swp-dash-avatar';
        fallback.setAttribute('aria-hidden', 'true');
        fallback.textContent = firstLetter(pseudo);
        img.replaceWith(fallback);
      };
      current.replaceWith(img);
    } else {
      // Ensure it's a span (in case a previous render used <img>)
      if (current.tagName !== 'SPAN') {
        const span = document.createElement('span');
        span.className = 'swp-dash-avatar';
        span.setAttribute('aria-hidden', 'true');
        current.replaceWith(span);
      }
      const avatarEl = link.querySelector('.swp-dash-avatar');
      // Strip skeleton classes once real content lands.
      avatarEl.className = 'swp-dash-avatar';
      avatarEl.setAttribute('aria-hidden', 'true');
      avatarEl.textContent = firstLetter(pseudo);
    }
  }

  async function renderProfile(user) {
    const link = document.getElementById(ID);
    if (!link || !user) return;
    let pseudo = user.email ? user.email.split('@')[0] : 'You';
    let avatarUrl = '';
    let profileData = null;
    // Use the shared SwappoAuth profile cache — other modules booting in
    // parallel (bell, messages icon, chat init) hit the same endpoint,
    // so coalesce to a single round-trip.
    try {
      const data = (window.SwappoAuth && window.SwappoAuth.getUserProfile)
        ? await window.SwappoAuth.getUserProfile(user.id)
        : null;
      profileData = data;
      if (data) {
        pseudo = data.pseudo || data.display_name || pseudo;
        avatarUrl = data.avatar || '';
      }
    } catch (e) { /* fall back to email prefix */ }
    const pseudoEl = link.querySelector('.swp-dash-pseudo');
    if (pseudoEl) {
      pseudoEl.textContent = pseudo;
      pseudoEl.classList.remove('swp-skel', 'swp-skel-text');
    }
    await setAvatar(link, avatarUrl, pseudo);
    // Badge bubble on the avatar: Swappo Pro shield first, else the earned
    // tier emoji (nothing for a newcomer).
    try {
      const isPro = !!(profileData && (profileData.is_pro || profileData.plan === 'pro'));
      const tiers = (window.BADGE_TIERS || []).reduce(function (m, b) { m[b.tier] = b.emoji; return m; }, {});
      const tier = profileData && profileData.badge;
      const emoji = isPro ? '🛡️' : ((tier && tier !== 'newcomer' && tiers[tier]) || '');
      const old = link.querySelector('.swp-dash-tier');
      if (old) old.remove();
      if (emoji) {
        link.style.position = 'relative';
        const bubble = document.createElement('span');
        bubble.className = 'swp-dash-tier';
        bubble.title = isPro ? ((typeof t === 'function') ? t('badge_swappo_pro') : 'Swappo Pro') : String(tier);
        bubble.setAttribute('aria-label', bubble.title);
        bubble.textContent = emoji;
        bubble.style.cssText = 'position:absolute;left:21px;top:19px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.25);font-size:10px;line-height:16px;text-align:center;pointer-events:none;';
        link.appendChild(bubble);
      }
    } catch (e) { /* cosmetic */ }
  }

  async function refreshBadge(user) {
    const link = document.getElementById(ID);
    if (!link || !window.db || !user) return;
    try {
      const notifRes = await window.db.from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).is('read_at', null);
      const count = notifRes.count || 0;
      const badge = link.querySelector('.swp-dash-badge');
      if (!badge) return;
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.classList.toggle('visible', count > 0);
    } catch (e) { /* silent */ }
  }

  function fastPaintFromCache() {
    // Synchronous path: read the JWT's user object + cached profile from
    // localStorage and paint the chip on the very first frame. Avoids
    // waiting for the SDK's async session restoration (~2.5 s on cold).
    try {
      const link = document.getElementById(ID);
      if (!link) return null;
      const fastUser = (window.SwappoAuth && window.SwappoAuth.getFastUser)
        ? window.SwappoAuth.getFastUser() : null;
      if (!fastUser) return null;
      const cached = (window.SwappoAuth && window.SwappoAuth.getCachedProfile)
        ? window.SwappoAuth.getCachedProfile(fastUser.id) : null;
      const meta = fastUser.user_metadata || {};
      const pseudo = (cached && (cached.pseudo || cached.display_name))
        || meta.pseudo
        || (fastUser.email ? fastUser.email.split('@')[0] : 'You');
      const avatarUrl = (cached && cached.avatar) || meta.avatar || '';
      const pseudoEl = link.querySelector('.swp-dash-pseudo');
      if (pseudoEl) {
        pseudoEl.textContent = pseudo;
        pseudoEl.classList.remove('swp-skel', 'swp-skel-text');
      }
      setAvatar(link, avatarUrl, pseudo);
      return fastUser;
    } catch (e) { return null; }
  }

  function init() {
    mount();
    // 1) Paint from cache immediately — no await, no network.
    const fastUser = fastPaintFromCache();

    // 2) In the background, refresh from Supabase so any stale pseudo /
    //    avatar / badge count lands as soon as the real data is there.
    (async function () {
      if (!window.db) return;
      try {
        if (window.SwappoAuth && window.SwappoAuth.whenReady) {
          await window.SwappoAuth.whenReady();
        }
        const res = await Promise.race([
          window.db.auth.getSession(),
          new Promise(function (resolve) { setTimeout(function () { resolve({ data: { session: null } }); }, 1500); })
        ]);
        const user = res && res.data && res.data.session ? res.data.session.user : null;
        const link = document.getElementById(ID);
        if (!link) return;
        if (!user) {
          // `swp-auth-in` was a false positive (expired token in localStorage).
          // Hide via inline style so it wins over the auth-in CSS rule.
          link.style.display = 'none';
          return;
        }
        link.style.display = '';
        // Only re-render profile if we didn't already paint from cache, or
        // if the cached data came from a different user. Otherwise keep the
        // synchronous fast paint — re-rendering would strip + restore the
        // same DOM and cause a brief flicker.
        if (!fastUser || fastUser.id !== user.id) {
          await renderProfile(user);
        } else {
          // Refresh in the background (writes-through to cache) without
          // repainting if nothing changed — the setAvatar / pseudo calls
          // are idempotent on identical values.
          renderProfile(user);
        }
        refreshBadge(user);
      } catch (e) {}
    })();

    if (window.db && window.db.auth && window.db.auth.onAuthStateChange) {
      window.db.auth.onAuthStateChange(function (_event, session) {
        const link = document.getElementById(ID);
        if (!link) return;
        const user = session ? session.user : null;
        if (!user) { link.style.display = 'none'; return; }
        link.style.display = '';
        renderProfile(user);
        refreshBadge(user);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 40);
  }
})();
