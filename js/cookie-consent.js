/* ========================
   COOKIE CONSENT BANNER
   Swappo — swappo.ae

   Self-injecting banner. Pages do not need to include the markup —
   this script creates `#cookie-banner` if it isn't already in the DOM.
   ======================== */

(function () {
  function _ckT(key, fallback) {
    return (typeof t === 'function') ? t(key) : (fallback || key);
  }

  function getCookiePagePath() {
    var isInPages = window.location.pathname.indexOf('/pages/') !== -1;
    return isInPages ? 'cookies.html' : 'pages/cookies.html';
  }

  function buildBanner() {
    var existing = document.getElementById('cookie-banner');
    if (existing) return existing;

    var cookiePage = getCookiePagePath();
    var banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.className = 'cookie-banner';
    banner.style.display = 'none';
    banner.innerHTML =
      '<div class="cookie-banner-content">' +
        '<p>' +
          '<span data-i18n="cookie_msg">Swappo uses cookies to enhance your experience.</span> ' +
          '<a href="' + cookiePage + '" data-i18n="cookie_learn">Learn more</a>.' +
        '</p>' +
        '<div class="cookie-banner-buttons">' +
          '<button id="cookie-decline" class="btn btn-sm" style="background:transparent;color:var(--text-secondary);border:1px solid var(--border);" data-i18n="cookie_decline">Decline</button>' +
          '<button id="cookie-accept" class="btn btn-primary btn-sm" data-i18n="cookie_accept">Accept All</button>' +
          '<button id="cookie-manage" class="btn btn-sm" style="background:transparent;color:var(--primary);border:1px solid var(--primary);" data-i18n="cookie_manage">Manage</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(banner);

    // Translate freshly-injected nodes if i18n is already loaded.
    if (typeof window.translatePage === 'function') {
      try { window.translatePage(); } catch (e) { /* ignore */ }
    }
    return banner;
  }

  function enableAnalyticsCookies() {
    // Placeholder: Initialize Google Analytics or other analytics tools here
    // Example: if (typeof gtag === 'function') { gtag('consent', 'update', { analytics_storage: 'granted' }); }
  }

  function init() {
    var banner = buildBanner();
    if (!banner) return;

    var acceptBtn = banner.querySelector('#cookie-accept');
    var declineBtn = banner.querySelector('#cookie-decline');
    var manageBtn = banner.querySelector('#cookie-manage');

    var cookieConsent = null;
    try { cookieConsent = localStorage.getItem('swappo_cookie_consent'); } catch (e) { /* private mode */ }

    if (cookieConsent) {
      banner.style.display = 'none';
      if (cookieConsent === 'all') enableAnalyticsCookies();
    } else {
      banner.style.display = 'block';
    }

    if (acceptBtn) {
      acceptBtn.addEventListener('click', function () {
        try {
          localStorage.setItem('swappo_cookie_consent', 'all');
          localStorage.setItem('swappo_cookie_consent_date', new Date().toISOString());
        } catch (e) { /* private mode */ }
        banner.style.display = 'none';
        enableAnalyticsCookies();
      });
    }

    if (declineBtn) {
      declineBtn.addEventListener('click', function () {
        try {
          localStorage.setItem('swappo_cookie_consent', 'essential_only');
          localStorage.setItem('swappo_cookie_consent_date', new Date().toISOString());
        } catch (e) { /* private mode */ }
        banner.style.display = 'none';
      });
    }

    if (manageBtn) {
      manageBtn.addEventListener('click', function () {
        window.location.href = getCookiePagePath() + '#manage-preferences';
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
