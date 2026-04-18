/* ============================================
   Swappo — Hero CTA auth-aware routing
   "Start Swapping" → catalogue for signed-in users, login for anonymous.
   ============================================ */
(function () {
  'use strict';
  if (window.__SwappoHeroCta) return;
  window.__SwappoHeroCta = true;

  function inPages() {
    return (location.pathname || '').indexOf('/pages/') === 0;
  }

  async function init() {
    var btn = document.getElementById('hero-start-btn');
    if (!btn || !window.db) return;
    try {
      var res = await Promise.race([
        window.db.auth.getSession(),
        new Promise(function (r) { setTimeout(function () { r({ data: { session: null } }); }, 1500); })
      ]);
      var user = res && res.data && res.data.session ? res.data.session.user : null;
      if (!user) return; // keep default href=login.html
      var base = inPages() ? '' : 'pages/';
      btn.href = base + 'catalogue.html';
    } catch (e) { /* keep default */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 40);
  }
})();
