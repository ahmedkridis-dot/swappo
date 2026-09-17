/* ============================================
   Swappo — closed-account guard (users.is_banned)
   A banned member can still sign in and read notifications, but cannot
   publish, claim, offer or message. This script (loaded on publier,
   product, giveaway and chat) shows the banner, disables the action
   controls and sets window.__swpBanned for the page scripts. The
   database enforces the same rule through RLS (migration 040) — this
   is the explanation layer, not the security layer.
   ============================================ */
(function () {
  'use strict';
  var SELECTORS = [
    '#btnPublish', '#action-buttons button', '#action-buttons a.btn-primary',
    '.giveaway-card-button', '#chatInput', '#sendBtn', '#claim-btn'
  ];
  function _t(key, fallback) { return (typeof window.t === 'function') ? window.t(key) : fallback; }

  function applyBanned() {
    window.__swpBanned = true;
    document.documentElement.classList.add('swp-banned');
    if (!document.getElementById('swp-banned-banner')) {
      var b = document.createElement('div');
      b.id = 'swp-banned-banner';
      b.setAttribute('role', 'alert');
      b.style.cssText = 'background:#FEE2E2;color:#991B1B;border-bottom:1px solid #FCA5A5;padding:12px 16px;font:600 14px Inter,sans-serif;text-align:center;';
      b.textContent = '⛔ ' + _t('banned_banner', 'This account has been closed. Contact contact@swappo.ae.');
      var nav = document.querySelector('.navbar');
      if (nav && nav.parentNode) nav.parentNode.insertBefore(b, nav.nextSibling); else document.body.insertBefore(b, document.body.firstChild);
    }
    disableControls();
    // Pages render their buttons after data loads → keep disabling.
    if (window.MutationObserver) new MutationObserver(disableControls).observe(document.body, { childList: true, subtree: true });
  }
  function disableControls() {
    document.querySelectorAll(SELECTORS.join(',')).forEach(function (el) {
      if (el.dataset.bannedDone) return;
      el.dataset.bannedDone = '1';
      el.setAttribute('disabled', 'disabled');
      el.setAttribute('aria-disabled', 'true');
      el.style.opacity = '0.45';
      el.style.pointerEvents = 'none';
      if (el.tagName === 'INPUT') el.placeholder = _t('banned_banner', 'This account has been closed.');
    });
  }
  async function check() {
    var tries = 0;
    while (!(window.SwappoAuth && window.SwappoAuth.isReady && window.SwappoAuth.isReady()) && tries++ < 40) {
      await new Promise(function (r) { setTimeout(r, 100); });
    }
    if (!(window.SwappoAuth && window.SwappoAuth.getCurrentUser)) return;
    var u = null;
    try { u = await window.SwappoAuth.getCurrentUser(); } catch (e) {}
    if (!u) return;
    var row = null;
    try { row = window.SwappoAuth.getUserProfile ? await window.SwappoAuth.getUserProfile(u.id, { force: true }) : null; } catch (e) {}
    if (row && row.is_banned === true) applyBanned();
  }
  window.SwappoBannedGuard = { check: check, applyBanned: applyBanned };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', check); else check();
})();
