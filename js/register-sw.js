/**
 * Swappo — Service Worker registration (shared across every page).
 * Fixes M-5: SW was previously only registered on the landing page.
 *
 * Scripts and styles are served cache-first, so right after a deploy the
 * first page view still ran the previous JS (Ahmed, 2026-09-21: the home
 * cards did not show a price drop that the product page already showed).
 * When an UPDATED worker takes control we reload once — only in the first
 * seconds of the visit and only if the visitor has not touched the page,
 * so nobody loses a form or a message being typed.
 */
(function () {
  if (!('serviceWorker' in navigator)) return;

  var hadController = !!navigator.serviceWorker.controller;   // false on a first visit: nothing stale to replace
  var interacted = false;
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, function () { interacted = true; }, { capture: true, passive: true, once: true });
  });
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!hadController || interacted) return;
    if (window.performance && performance.now() > 15000) return;
    try {
      var last = Number(sessionStorage.getItem('swp_sw_reload') || 0);
      if (Date.now() - last < 60000) return;                   // never loop
      sessionStorage.setItem('swp_sw_reload', String(Date.now()));
    } catch (e) { return; }
    window.location.reload();
  });

  window.addEventListener('load', function () {
    // Compute the correct path to /sw.js depending on whether we're in /pages/ or not
    var inPages = window.location.pathname.indexOf('/pages/') !== -1;
    var swPath = inPages ? '../sw.js' : 'sw.js';
    // Absolute path preferred when served from root
    if (window.location.pathname.charAt(0) === '/') swPath = '/sw.js';
    try {
      navigator.serviceWorker.register(swPath).then(function (reg) {
        // Ask for a fresh sw.js on every visit instead of waiting for the browser's own schedule.
        try { reg.update(); } catch (e) {}
      }).catch(function () {});
    } catch (e) {}
  });
})();
