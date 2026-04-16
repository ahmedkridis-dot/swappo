/* ============================================
   Swappo — Airbnb-style Badge Decay
   45 days without activity → warning banner "Your badge is at risk!"
   60 days → downgrade one tier. Dashboard shows a countdown.

   Activity is tracked via users.badge_last_activity_at, updated on:
   - publishing an item, accepting a swap, sending a message,
   - completing an exchange. These writes happen elsewhere; this module
   only *reads* the field and renders the UX.
   ============================================ */
(function () {
  if (window.SwappoBadgeDecay) return;

  const TIER_ORDER = ['newcomer', 'swapper', 'active', 'pro', 'elite', 'legend'];

  function tr(key, fallback) { return (typeof t === 'function') ? t(key) : (fallback || key); }

  function injectStyle() {
    if (document.getElementById('swp-decay-style')) return;
    const s = document.createElement('style');
    s.id = 'swp-decay-style';
    s.textContent = [
      '.swp-decay { margin: 14px 0; padding: 14px 16px; border-radius: 12px; font-family: Inter, sans-serif; display: flex; align-items: center; gap: 12px; }',
      '.swp-decay.warning { background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; }',
      '.swp-decay.downgrade { background: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5; }',
      '.swp-decay.safe { background: #D1FAE5; color: #065F46; border: 1px solid #6EE7B7; }',
      '.swp-decay i { font-size: 22px; flex-shrink: 0; }',
      '.swp-decay-title { font-weight: 700; font-size: 0.95rem; }',
      '.swp-decay-body { font-size: 0.85rem; margin-top: 2px; }'
    ].join('\n');
    document.head.appendChild(s);
  }

  /**
   * @param {HTMLElement|string} container
   * @param {object} user — expects { badge, badge_last_activity_at }
   */
  function render(container, user) {
    injectStyle();
    const el = (typeof container === 'string') ? document.querySelector(container) : container;
    if (!el || !user) return null;
    const last = user.badge_last_activity_at ? new Date(user.badge_last_activity_at) : new Date();
    const days = Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));

    let kind = 'safe', title = '', body = '';
    if (days >= 60) {
      kind = 'downgrade';
      title = tr('badge_decay_downgraded', 'Badge downgraded due to inactivity.');
      body = tr('badge_decay_keep', 'Stay active to keep your tier') + ' — ' + days + ' days since last activity.';
    } else if (days >= 45) {
      kind = 'warning';
      const remaining = 60 - days;
      title = tr('badge_decay_warning', 'Your badge is at risk!');
      body = remaining + ' ' + tr('badge_decay_countdown', 'days to keep your badge') + '.';
    } else if (days >= 30) {
      kind = 'warning';
      title = tr('badge_decay_keep', 'Stay active to keep your tier');
      body = (60 - days) + ' ' + tr('badge_decay_countdown', 'days to keep your badge') + '.';
    } else {
      // Safe zone — hide entirely.
      el.innerHTML = '';
      return { daysIdle: days, state: 'safe' };
    }

    const icon = kind === 'downgrade' ? 'fa-trophy' : 'fa-clock';
    el.innerHTML =
      '<div class="swp-decay ' + kind + '">' +
        '<i class="fas ' + icon + '"></i>' +
        '<div>' +
          '<div class="swp-decay-title"></div>' +
          '<div class="swp-decay-body"></div>' +
        '</div>' +
      '</div>';
    el.querySelector('.swp-decay-title').textContent = title;
    el.querySelector('.swp-decay-body').textContent = body;
    return { daysIdle: days, state: kind };
  }

  /**
   * Returns the downgraded badge tier for `badge` if `daysIdle >= 60`,
   * otherwise `badge` unchanged.
   */
  function effectiveBadge(badge, daysIdle) {
    if (!badge || daysIdle < 60) return badge;
    const idx = TIER_ORDER.indexOf(badge);
    if (idx <= 0) return badge;
    return TIER_ORDER[idx - 1];
  }

  /** Ping the activity timestamp on the server. No-op when offline. */
  async function ping() {
    if (!window.db) return;
    try {
      const u = await window.db.auth.getUser();
      const uid = u && u.data && u.data.user ? u.data.user.id : null;
      if (!uid) return;
      await window.db.from('users').update({ badge_last_activity_at: new Date().toISOString() }).eq('id', uid);
    } catch (e) { /* swallow — best-effort */ }
  }

  window.SwappoBadgeDecay = { render: render, effectiveBadge: effectiveBadge, ping: ping };
})();
