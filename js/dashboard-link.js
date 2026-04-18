/* ============================================
   Swappo — Profile shortcut in navbar (top-right, persistent)
   Renders an avatar + pseudo chip that links to the real dashboard
   (pages/profile.html). Hidden on the dashboard page itself + on auth pages.
   Displays unread-notifications badge. Hidden for anonymous visitors.
   ============================================ */
(function () {
  if (window.__SwappoDashLink) return;
  window.__SwappoDashLink = true;

  const ID = 'swp-dash-link';
  const PAGE = (location.pathname || '').split('/').pop();

  function tr(key, fallback) {
    return (typeof t === 'function') ? t(key) : (fallback || key);
  }

  function injectStyle() {
    if (document.getElementById('swp-dash-style')) return;
    const s = document.createElement('style');
    s.id = 'swp-dash-style';
    s.textContent = [
      '.swp-dash-link { display: inline-flex; align-items: center; gap: 8px; padding: 3px 12px 3px 3px; border-radius: 999px; font-family: Inter, sans-serif; font-size: 0.85rem; font-weight: 700; color: #09B1BA; background: #E6F7F8; border: 1px solid transparent; text-decoration: none; transition: background-color 0.15s, border-color 0.15s, transform 0.1s; white-space: nowrap; line-height: 1; }',
      '.swp-dash-link:hover { background: #B7EAED; border-color: #09B1BA; transform: translateY(-1px); }',
      '.swp-dash-link .swp-dash-avatar { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; background: #09B1BA; color: #fff; font-size: 12px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; text-transform: uppercase; letter-spacing: 0; }',
      '.swp-dash-link .swp-dash-pseudo { display: inline-block; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
      '.swp-dash-link .swp-dash-badge { background: #DC2626; color: #fff; font-size: 10px; font-weight: 700; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; display: none; align-items: center; justify-content: center; margin-left: 2px; line-height: 1; }',
      '.swp-dash-link .swp-dash-badge.visible { display: inline-flex; }',
      '@media (max-width: 640px) { .swp-dash-link .swp-dash-pseudo { display: none; } .swp-dash-link { padding: 3px; gap: 0; } }'
    ].join('\n');
    document.head.appendChild(s);
  }

  function mount() {
    // Skip on dashboard itself + auth pages (to avoid redundancy)
    if (PAGE === 'profile.html' || PAGE === 'login.html' || PAGE === 'reset-password.html' || PAGE === 'onboarding.html') return;
    const nav = document.querySelector('.navbar-actions');
    if (!nav || document.getElementById(ID)) return;
    injectStyle();
    const base = location.pathname.indexOf('/pages/') === 0 ? '' : 'pages/';
    const link = document.createElement('a');
    link.id = ID;
    link.className = 'swp-dash-link';
    link.href = base + 'profile.html';
    link.setAttribute('aria-label', tr('dashboard_title', 'Dashboard'));
    link.setAttribute('data-i18n-aria-label', 'dashboard_title');
    link.innerHTML =
      '<span class="swp-dash-avatar" aria-hidden="true">?</span>' +
      '<span class="swp-dash-pseudo"></span>' +
      '<span class="swp-dash-badge" aria-hidden="true">0</span>';
    link.style.display = 'none'; // hidden until auth confirmed
    // Insert as the FIRST item so it sits on the top-right of the navbar actions.
    nav.insertBefore(link, nav.firstChild);
  }

  function firstLetter(s) {
    if (!s) return '?';
    const ch = String(s).trim().charAt(0);
    return ch ? ch.toUpperCase() : '?';
  }

  function setAvatar(link, url, pseudo) {
    const current = link.querySelector('.swp-dash-avatar');
    if (!current) return;
    if (url) {
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
      link.querySelector('.swp-dash-avatar').textContent = firstLetter(pseudo);
    }
  }

  async function renderProfile(user) {
    const link = document.getElementById(ID);
    if (!link || !user) return;
    let pseudo = user.email ? user.email.split('@')[0] : 'You';
    let avatarUrl = '';
    try {
      const { data } = await window.db.from('users')
        .select('pseudo, avatar, display_name')
        .eq('id', user.id).maybeSingle();
      if (data) {
        pseudo = data.pseudo || data.display_name || pseudo;
        avatarUrl = data.avatar || '';
      }
    } catch (e) { /* fall back to email prefix */ }
    const pseudoEl = link.querySelector('.swp-dash-pseudo');
    if (pseudoEl) pseudoEl.textContent = pseudo;
    setAvatar(link, avatarUrl, pseudo);
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

  function init() {
    mount();
    setTimeout(async function () {
      if (!window.db) return;
      try {
        const res = await Promise.race([
          window.db.auth.getSession(),
          new Promise(function (resolve) { setTimeout(function () { resolve({ data: { session: null } }); }, 1500); })
        ]);
        const user = res && res.data && res.data.session ? res.data.session.user : null;
        const link = document.getElementById(ID);
        if (!link) return;
        if (!user) { link.style.display = 'none'; return; }
        link.style.display = '';
        await renderProfile(user);
        refreshBadge(user);
      } catch (e) {}
    }, 400);

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
