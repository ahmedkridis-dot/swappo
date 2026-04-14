/* ========================
   COOKIE CONSENT BANNER
   Swappo — swappo.ae
   ======================== */

document.addEventListener('DOMContentLoaded', function() {
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;

  const acceptBtn = document.getElementById('cookie-accept');
  const declineBtn = document.getElementById('cookie-decline');
  const manageBtn = document.getElementById('cookie-manage');

  // Check if user has already made a choice
  const cookieConsent = localStorage.getItem('swappo_cookie_consent');
  if (cookieConsent) {
    banner.style.display = 'none';
    if (cookieConsent === 'all') {
      enableAnalyticsCookies();
    }
  } else {
    banner.style.display = 'block';
  }

  // Accept all cookies
  if (acceptBtn) {
    acceptBtn.addEventListener('click', function() {
      localStorage.setItem('swappo_cookie_consent', 'all');
      localStorage.setItem('swappo_cookie_consent_date', new Date().toISOString());
      banner.style.display = 'none';
      enableAnalyticsCookies();
    });
  }

  // Decline non-essential cookies
  if (declineBtn) {
    declineBtn.addEventListener('click', function() {
      localStorage.setItem('swappo_cookie_consent', 'essential_only');
      localStorage.setItem('swappo_cookie_consent_date', new Date().toISOString());
      banner.style.display = 'none';
    });
  }

  // Manage preferences — redirect to cookie policy page
  if (manageBtn) {
    manageBtn.addEventListener('click', function() {
      // Determine correct path based on current page location
      const isInPages = window.location.pathname.includes('/pages/');
      const cookiePage = isInPages ? 'cookies.html#manage-preferences' : 'pages/cookies.html#manage-preferences';
      window.location.href = cookiePage;
    });
  }

  function enableAnalyticsCookies() {
    // Placeholder: Initialize Google Analytics or other analytics tools here
    // Example: if (typeof gtag === 'function') { gtag('consent', 'update', { analytics_storage: 'granted' }); }
  }
});
