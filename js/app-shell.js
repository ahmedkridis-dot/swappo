/* ============================================
   Swappo — app shell (inside the Capacitor wrapper only)
   The site is loaded as-is by the iOS / Android app. This file makes it
   feel like an app instead of a website in a frame:
     · bottom tab bar — Home · Market · Drop · Gifts · My Swaps
       (hidden on full-screen tasks: product, chat, publish, sign-in)
     · no cookie banner (nothing to consent to in the app), no duplicate
       "Drop an Item" button in the header
     · notch / home-indicator safe areas, status bar style
     · "No connection" screen instead of a browser error page
     · Android back button → history
   Activates when window.Capacitor says we are native. For a browser test:
   ?app=1 on any page turns the simulation on, ?app=0 turns it off.
   Web visitors never see any of this.
   ============================================ */
(function () {
  'use strict';
  if (window.SwappoAppShell) return;

  var cap = window.Capacitor;
  var native = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  var platform = native && typeof cap.getPlatform === 'function' ? cap.getPlatform() : 'web';
  try {
    var q = new URLSearchParams(location.search);
    if (q.get('app') === '1') localStorage.setItem('swp_app_sim', '1');
    if (q.get('app') === '0') localStorage.removeItem('swp_app_sim');
  } catch (e) {}
  var sim = false;
  try { sim = localStorage.getItem('swp_app_sim') === '1'; } catch (e) {}
  if (!native && !sim) return;

  var html = document.documentElement;
  html.classList.add('swp-app');
  if (native) html.classList.add('swp-native', 'swp-' + platform);

  var inPages = /\/pages\//.test(location.pathname);
  var P = inPages ? '' : 'pages/';
  var HOME = inPages ? '../index.html' : 'index.html';
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var FULLSCREEN = ['product.html', 'chat.html', 'publier.html', 'login.html', 'onboarding.html', 'confirm.html', 'reset-password.html'];
  var showTabs = FULLSCREEN.indexOf(page) === -1;

  function tr(key, fallback) {
    if (typeof window.t !== 'function') return fallback;
    var v = window.t(key);
    return (v && v !== key) ? v : fallback;
  }
  function signedIn() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && /^sb-[\w-]+-auth-token$/.test(k) && localStorage.getItem(k)) return true;
      }
    } catch (e) {}
    return false;
  }

  // ── Viewport: let the page extend under the notch, we pad it ourselves ──
  var vp = document.querySelector('meta[name="viewport"]');
  if (vp && !/viewport-fit/.test(vp.content)) vp.content += ', viewport-fit=cover';

  // ── Styles (only under html.swp-app — nothing leaks to the web) ──
  var css =
    'html.swp-app .cookie-banner{display:none!important}' +
    'html.swp-app .navbar-actions .btn-primary{display:none!important}' +
    'html.swp-native .navbar{padding-top:env(safe-area-inset-top)}' +
    'html.swp-native .mobile-menu{padding-top:env(safe-area-inset-top)}' +
    'html.swp-app.swp-tabs body{padding-bottom:calc(66px + env(safe-area-inset-bottom))}' +
    '.swp-tabbar{position:fixed;left:0;right:0;bottom:0;z-index:1150;background:#fff;border-top:1px solid #EBEBEB;display:flex;justify-content:space-around;align-items:flex-end;padding:6px 4px calc(6px + env(safe-area-inset-bottom));font-family:Inter,sans-serif;box-shadow:0 -4px 16px rgba(0,0,0,.04)}' +
    '.swp-tab{flex:1 1 0;display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 0;font-size:10.5px;font-weight:600;color:#9CA3AF;text-decoration:none;-webkit-tap-highlight-color:transparent;min-width:0}' +
    '.swp-tab i{font-size:20px;line-height:1}' +
    '.swp-tab.on{color:#09B1BA}' +
    '.swp-tab-drop{color:#09B1BA}' +
    '.swp-tab-big{width:52px;height:52px;border-radius:26px;background:#09B1BA;color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;margin-top:-28px;box-shadow:0 8px 18px rgba(9,177,186,.35);border:4px solid #fff;line-height:1}' +
    '.swp-tab-badge{position:absolute;top:-4px;inset-inline-end:-8px;min-width:16px;height:16px;border-radius:8px;background:#FF4B55;color:#fff;font-size:10px;font-weight:700;display:none;align-items:center;justify-content:center;padding:0 4px}' +
    '.swp-tab .swp-tab-ico{position:relative}' +
    '.swp-offline{position:fixed;inset:0;z-index:9700;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:32px;font-family:Inter,sans-serif}' +
    '.swp-offline .ico{font-size:52px;margin-bottom:14px}' +
    '.swp-offline h2{font:800 20px Poppins,Inter,sans-serif;color:#171717;margin:0 0 8px}' +
    '.swp-offline p{color:#555;font-size:14px;margin:0 0 22px;line-height:1.5}' +
    '.swp-offline button{min-height:46px;padding:12px 28px;border:0;border-radius:12px;background:#09B1BA;color:#fff;font:700 15px Inter,sans-serif;cursor:pointer}';
  var st = document.createElement('style'); st.id = 'swp-app-shell-style'; st.textContent = css; document.head.appendChild(st);

  // ── Tab bar ──
  function renderTabs() {
    if (!showTabs || document.querySelector('.swp-tabbar')) return;
    html.classList.add('swp-tabs');
    var me = signedIn();
    var tabs = [
      { key: 'home',   href: HOME,                                   icon: 'fas fa-house',  i18n: 'tab_home',   label: 'Home',     match: ['index.html', ''] },
      { key: 'market', href: P + 'catalogue.html',                   icon: 'fas fa-store',  i18n: 'tab_market', label: 'Market',   match: ['catalogue.html'] },
      { key: 'drop',   href: me ? P + 'publier.html' : P + 'login.html?redirect=' + encodeURIComponent('/pages/publier.html'), icon: '', i18n: 'tab_drop', label: 'Drop', match: [] },
      { key: 'gifts',  href: P + 'giveaway.html',                    icon: 'fas fa-gift',   i18n: 'tab_gifts',  label: 'Gifts',    match: ['giveaway.html'] },
      { key: 'me',     href: me ? P + 'profile.html' : P + 'login.html', icon: 'far fa-user', i18n: 'my_swaps', label: 'My Swaps', match: ['profile.html', 'login.html'] }
    ];
    var bar = document.createElement('nav');
    bar.className = 'swp-tabbar';
    bar.setAttribute('aria-label', 'Swappo');
    bar.innerHTML = tabs.map(function (tb) {
      var on = tb.match.indexOf(page) !== -1 ? ' on' : '';
      var ico = tb.key === 'drop'
        ? '<span class="swp-tab-big" aria-hidden="true">+</span>'
        : '<span class="swp-tab-ico"><i class="' + tb.icon + '" aria-hidden="true"></i><span class="swp-tab-badge" data-tab-badge="' + tb.key + '"></span></span>';
      return '<a class="swp-tab' + (tb.key === 'drop' ? ' swp-tab-drop' : '') + on + '" href="' + tb.href + '" data-tab="' + tb.key + '"' + (on ? ' aria-current="page"' : '') + '>' +
        ico + '<span data-i18n="' + tb.i18n + '">' + tr(tb.i18n, tb.label) + '</span></a>';
    }).join('');
    document.body.appendChild(bar);
  }

  // ── Offline screen ──
  var offlineEl = null;
  function showOffline() {
    if (offlineEl) return;
    offlineEl = document.createElement('div');
    offlineEl.className = 'swp-offline';
    offlineEl.setAttribute('role', 'alert');
    offlineEl.innerHTML = '<div class="ico" aria-hidden="true">📡</div>' +
      '<h2>' + tr('app_offline_title', 'No connection') + '</h2>' +
      '<p>' + tr('app_offline_text', 'Check your internet connection and try again.') + '</p>' +
      '<button type="button">' + tr('app_retry', 'Retry') + '</button>';
    offlineEl.querySelector('button').addEventListener('click', function () {
      if (navigator.onLine) { hideOffline(); location.reload(); }
    });
    document.body.appendChild(offlineEl);
  }
  function hideOffline() { if (offlineEl) { offlineEl.remove(); offlineEl = null; } }
  window.addEventListener('offline', showOffline);
  window.addEventListener('online', hideOffline);

  // ── Native plugins (present only in the app) ──
  function wireNative() {
    if (!native || !cap.Plugins) return;
    try {
      var sb = cap.Plugins.StatusBar;
      if (sb) {
        if (sb.setStyle) sb.setStyle({ style: 'LIGHT' }).catch(function () {});       // dark icons on the white header
        if (sb.setBackgroundColor && platform === 'android') sb.setBackgroundColor({ color: '#FFFFFF' }).catch(function () {});
      }
    } catch (e) {}
    try {
      var app = cap.Plugins.App;
      if (app && app.addListener) {
        app.addListener('backButton', function (ev) {
          var atRoot = page === 'index.html' || page === '';
          if (ev && ev.canGoBack && !atRoot) history.back();
          else if (atRoot && app.exitApp) app.exitApp();
          else location.href = HOME;
        });
      }
    } catch (e) {}
  }

  function init() {
    renderTabs();
    if (!navigator.onLine) showOffline();
    wireNative();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.SwappoAppShell = { native: native, platform: platform, simulated: sim && !native, tabs: showTabs };
})();
