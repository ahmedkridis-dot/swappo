/**
 * Swappo — Service Worker registration (shared across every page).
 * Fixes M-5: SW was previously only registered on the landing page.
 */
(function () {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function () {
    // Compute the correct path to /sw.js depending on whether we're in /pages/ or not
    var inPages = window.location.pathname.indexOf('/pages/') !== -1;
    var swPath = inPages ? '../sw.js' : 'sw.js';
    // Absolute path preferred when served from root
    if (window.location.pathname.charAt(0) === '/') swPath = '/sw.js';
    try {
      navigator.serviceWorker.register(swPath).catch(function () {});
    } catch (e) {}
  });
})();
