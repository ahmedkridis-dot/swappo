/* ============================================
   Swappo — Native platform detection
   When the site runs inside the Capacitor wrapper (iOS / Android), the
   native shell injects window.Capacitor with the plugin bridge. On the
   web, that global is absent. This file exposes a tiny vanilla helper
   so the rest of the codebase can branch on `Swappo.isNative` without
   any ESM imports or build step.
   ============================================ */
(function () {
  if (window.Swappo && typeof window.Swappo.isNative !== 'undefined') return;

  window.Swappo = window.Swappo || {};

  // Capacitor exposes:
  //   - window.Capacitor.isNativePlatform() → true on iOS / Android
  //   - window.Capacitor.getPlatform()      → 'ios' | 'android' | 'web'
  //   - window.Capacitor.Plugins.<Name>     → registered plugin handles
  // The web build of Capacitor (if it ever loads) returns 'web' from
  // getPlatform(), which we treat the same as no Capacitor at all.
  var hasCap = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function');
  Swappo.isNative = hasCap ? window.Capacitor.isNativePlatform() : false;
  Swappo.platform = hasCap ? window.Capacitor.getPlatform() : 'web';

  // Convenience: hide elements meant for "download our app" CTAs when
  // we ARE the app, and reveal "in-app only" elements vice versa.
  function applyVisibilityClasses() {
    document.documentElement.classList.toggle('swp-native', Swappo.isNative);
    document.documentElement.classList.toggle('swp-web', !Swappo.isNative);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyVisibilityClasses);
  } else {
    applyVisibilityClasses();
  }
})();
