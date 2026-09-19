/* ============================================
   Swappo — where did this visitor come from?
   First touch of the visit, kept in sessionStorage (same tab only, no
   cookie, nothing sent anywhere) and attached to the signup metadata by
   SwappoAuth.signUp → auth raw_user_meta_data.signup_src → users.signup_source
   (migration 049). It survives the in-app browser → Safari switch of the
   email confirmation because it is saved at signup time, not at login.

     utm_source / utm_medium / utm_campaign   from the ad link
     app    in-app browser: tiktok | instagram | facebook | snapchat
     ref    referrer host (other than swappo.ae)
     land   first page of the visit

   API:  SwappoSource.get() → { … } (never throws)
   ============================================ */
(function () {
  'use strict';
  var KEY = 'swp_src';
  function clean(v, max) { return String(v == null ? '' : v).replace(/[^\w .:\/\-]/g, '').slice(0, max || 60); }
  function inApp() {
    var ua = navigator.userAgent || '';
    if (/musical_ly|BytedanceWebview|TikTok|trill/i.test(ua)) return 'tiktok';
    if (/Instagram/i.test(ua)) return 'instagram';
    if (/FBAN|FBAV/i.test(ua)) return 'facebook';
    if (/Snapchat/i.test(ua)) return 'snapchat';
    return '';
  }
  function compute() {
    var q = new URLSearchParams(location.search);
    var ref = '';
    try { if (document.referrer) { var h = new URL(document.referrer).hostname; if (!/(^|\.)swappo\.ae$/i.test(h) && h !== location.hostname) ref = h; } } catch (e) {}
    var src = {
      utm_source: clean(q.get('utm_source'), 40),
      utm_medium: clean(q.get('utm_medium'), 40),
      utm_campaign: clean(q.get('utm_campaign'), 60),
      app: inApp(),
      ref: clean(ref, 60),
      land: clean(location.pathname, 80)
    };
    // Ad click ids prove the channel even when the link has no utm.
    if (!src.utm_source) {
      if (q.get('ttclid')) src.utm_source = 'tiktok';
      else if (q.get('fbclid')) src.utm_source = src.app === 'instagram' ? 'instagram' : 'facebook';
      else if (q.get('gclid')) src.utm_source = 'google';
    }
    return src;
  }
  function get() {
    try {
      var saved = sessionStorage.getItem(KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    var src = compute();
    try { sessionStorage.setItem(KEY, JSON.stringify(src)); } catch (e) {}
    return src;
  }
  window.SwappoSource = { get: get };
  get();
})();
