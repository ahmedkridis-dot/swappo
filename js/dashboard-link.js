/* ============================================
   Swappo — Dashboard shortcut in navbar (top-right, persistent)
   Adds a "Dashboard" icon-button to .navbar-actions on every page when
   the user is logged in. Click → /pages/profile.html (the real dashboard).
   Hidden on the dashboard page itself + on auth pages.
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
      '.swp-dash-link { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 10px; font-family: Inter, sans-serif; font-size: 0.85rem; font-weight: 700; color: #09B1BA; background: #E6F7F8; border: 1px solid transparent; text-decoration: none; transition: background-color 0.15s, border-color 0.15s, transform 0.1s; white-space: nowrap; }',
      '.swp-dash-link:hover { background: #B7EAED; border-color: #09B1BA; transform: translateY(-1px); }',
      '.swp-dash-link i { font-size: 14px; }',
      '.swp-dash-link .swp-dash-badge { background: #DC2626; color: #fff; font-size: 10px; font-weight: 700; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; display: none; align-items: center; justify-content: center; margin-left: 2px; line-height: 1; }',
      '.swp-dash-link .swp-dash-badge.visible { display: inline-flex; }',
      '@media (max-width: 640px) { .swp-dash-link span.label { display: none; } .swp-dash-link { padding: 7px 9px; } }'
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
    link.innerHTML = '<i class="fas fa-gauge-high" aria-hidden="true"></i><span class="label" data-i18n="dashboard_title">Dashboard</span><span class="swp-dash-badge" aria-hidden="true">0</span>';
    // Insert as the FIRST item so it sits on the top-right of the navbar actions.
    nav.insertBefore(link, nav.firstChild);
  }

  async function refreshBadge() {
    const link = document.getElementById(ID);
    if (!link || !window.db) return;
    try {
      const { data: { user } } = await window.db.auth.getUser();
      if (!user) return;
      // Count unread notifications + pending offers
      const notifRes = await window.db.from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).is('read_at', null);
      const count = notifRes.count || 0;
      const badge = link.querySelector('.swp-dash-badge');
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.classList.toggle('visible', count > 0);
    } catch (e) { /* silent */ }
  }

  function init() {
    mount();
    // Hide the link when user is anonymous — no dashboard to link to.
    setTimeout(async function () {
      if (!window.db) return;
      try {
        const { data: { user } } = await window.db.auth.getUser();
        const link = document.getElementById(ID);
        if (!link) return;
        if (!user) link.style.display = 'none';
        else { link.style.display = ''; refreshBadge(); }
      } catch (e) {}
    }, 400);

    // Refresh badge when a new notification lands
    if (window.db) {
      window.db.auth.onAuthStateChange(function () { refreshBadge(); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 40);
  }
})();
