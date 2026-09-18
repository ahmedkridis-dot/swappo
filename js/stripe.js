/* ========================
   SWAPPO PAYMENTS — Stripe client
   Swappo — swappo.ae

   Stripe is used ONLY for Swappo revenue: Pro subscription + boosts.
   Swappo never moves money between users (CLAUDE.md rule #3).

   All heavy lifting happens in the stripe-checkout Edge Function; this
   file just asks it for a Checkout / Portal URL and redirects.

   window.SwappoPayment
     .subscribePro('month' | 'year')   → Stripe Checkout (subscription)
     .buyBoost(itemId[, tier])         → tier picker → Stripe Checkout (one-off)
     .manageSubscription()             → Stripe Billing Portal
     .isPro()                          → Promise<boolean>
     .handleReturn()                   → toasts on ?checkout=success|cancel (auto)

   Loads after js/supabase.js + js/toast.js + js/constants.js.
   ======================== */

(function () {
  'use strict';

  function _payT(key, fallback) {
    return (typeof t === 'function') ? t(key) : (fallback || key);
  }

  function _toast(msg, type) {
    if (window.Toast && typeof window.Toast.show === 'function') window.Toast.show(msg, type || 'info');
    else if (type === 'error') alert(msg);
  }

  function _ready() {
    return !!(window.db && window.SwappoAuth && window.SwappoAuth.isReady && window.SwappoAuth.isReady());
  }

  async function _requireUser() {
    if (!_ready()) {
      _toast(_payT('auth_service_unavailable', 'Auth service unavailable. Please refresh.'), 'error');
      return null;
    }
    var user = null;
    try { user = await window.SwappoAuth.getCurrentUser(); } catch (e) { /* no session */ }
    if (!user) {
      _toast(_payT('pay_signin_required', 'Please sign in first.'), 'warning');
      var back = encodeURIComponent(location.pathname + location.search);
      var loginPath = location.pathname.indexOf('/pages/') !== -1 ? 'login.html' : 'pages/login.html';
      setTimeout(function () { location.href = loginPath + '?redirect=' + back; }, 700);
      return null;
    }
    return user;
  }

  // Ask the Edge Function for a URL and go there.
  async function _checkout(body) {
    _toast(_payT('pay_redirecting', 'Redirecting to secure checkout…'), 'info');
    var res;
    try {
      res = await window.db.functions.invoke('stripe-checkout', { body: body });
    } catch (e) {
      _toast(e && e.message ? e.message : _payT('pay_error', 'Payment could not be started.'), 'error');
      return false;
    }
    if (res.error) {
      var msg = _payT('pay_error', 'Payment could not be started.');
      try {
        // FunctionsHttpError carries the JSON body on .context
        var ctx = res.error.context;
        if (ctx && typeof ctx.json === 'function') {
          var j = await ctx.json();
          if (j && j.error === 'already_pro') msg = _payT('pay_already_pro', 'You already have an active Pro subscription.');
          else if (j && (j.message || j.error)) msg = j.message || j.error;
        } else if (res.error.message) {
          msg = res.error.message;
        }
      } catch (e) { /* keep generic */ }
      _toast(msg, 'error');
      return false;
    }
    var url = res.data && res.data.url;
    if (!url) { _toast(_payT('pay_error', 'Payment could not be started.'), 'error'); return false; }
    location.href = url;
    return true;
  }

  // Drop the mirrored profile so is_pro / plan are re-read after a purchase.
  async function _refreshProfile(userId) {
    try { if (window.SwappoCache && userId) window.SwappoCache.set('profile_' + userId, null); } catch (e) {}
    try { if (window.SwappoAuth && window.SwappoAuth.refreshProfile) await window.SwappoAuth.refreshProfile(); } catch (e) {}
  }

  // ── Boost tier picker (small inline modal, matches other Swappo modals) ──
  // opts.pro = result of pro_boosts_status() → the included boost is offered
  // first (or a "used up" note when the monthly 3 are gone).
  function _pickBoostTier(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var tiers = window.BOOST_PRICES || {
        '24h': { price: 5,  duration: 1 },
        '3d':  { price: 10, duration: 3 },
        '7d':  { price: 25, duration: 7 }
      };
      var labels = {
        '24h': _payT('pay_boost_24h', '24-hour boost'),
        '3d':  _payT('pay_boost_3d',  '3-day boost'),
        '7d':  _payT('pay_boost_7d',  '7-day boost + featured')
      };

      var proRows = '';
      if (opts.pro && opts.pro.is_pro) {
        var pro = opts.pro;
        if ((pro.remaining || 0) > 0) {
          proRows =
            '<button type="button" data-tier="pro" style="display:block;width:100%;padding:16px;margin-bottom:8px;border:0;border-radius:14px;background:linear-gradient(135deg,#09B1BA,#0891B2);color:#fff;cursor:pointer;font-family:inherit;text-align:left;box-shadow:0 6px 16px rgba(9,177,186,0.3);">' +
              '<span style="display:block;font-size:15px;font-weight:800;">💎 ' + _payT('pay_pro_boost_btn', 'Use my Pro boost — 3 days, included') + '</span>' +
              '<span style="display:block;font-size:12px;opacity:0.9;margin-top:4px;">' + _payT('pay_pro_boost_left', '{n} of {limit} Pro boosts left this month').replace('{n}', pro.remaining).replace('{limit}', pro.limit) + '</span>' +
            '</button>' +
            '<div style="font-size:12px;color:var(--text-muted,#999);text-align:center;margin:6px 0 10px;">' + _payT('pay_pro_boost_or_buy', 'Or buy a longer boost:') + '</div>';
        } else {
          proRows = '<div style="font-size:13px;color:var(--text-secondary,#555);background:var(--primary-light,#E6F7F8);border-radius:12px;padding:10px 12px;margin:0 0 12px;text-align:center;">💎 ' +
            _payT('pay_pro_boost_exhausted', 'Your {limit} Pro boosts are used up this month — they reset on the 1st. You can still buy one:').replace('{limit}', pro.limit) + '</div>';
        }
      }
      // Give & Earn (migration 046): every 3 gifts handed over earn one free
      // 3-day boost — offered first, to Pro and Free members alike.
      var giftLeft = !!(opts.gift && (opts.gift.available || 0) > 0);
      if (giftLeft) {
        proRows =
          '<button type="button" data-tier="gift" style="display:block;width:100%;padding:16px;margin-bottom:8px;border:0;border-radius:14px;background:linear-gradient(135deg,#FF8C00,#FF6B00);color:#fff;cursor:pointer;font-family:inherit;text-align:left;box-shadow:0 6px 16px rgba(255,140,0,0.3);">' +
            '<span style="display:block;font-size:15px;font-weight:800;">🎁 ' + _payT('pay_gift_boost_btn', 'Use my free boost — 3 days, earned by giving') + '</span>' +
            '<span style="display:block;font-size:12px;opacity:0.9;margin-top:4px;">' + _payT('pay_gift_boost_left', '{n} free boost(s) from your gifts').replace('{n}', opts.gift.available) + '</span>' +
          '</button>' + proRows;
        if (!(opts.pro && opts.pro.is_pro && (opts.pro.remaining || 0) > 0)) {
          proRows += '<div style="font-size:12px;color:var(--text-muted,#999);text-align:center;margin:6px 0 10px;">' + _payT('pay_pro_boost_or_buy', 'Or buy a longer boost:') + '</div>';
        }
      }
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;';
      // A member who still has an included 3-day boost is only offered the
      // paid tiers that are LONGER than it (7 days); once the monthly Pro
      // boosts are used up, every tier comes back.
      var proLeft = giftLeft || !!(opts.pro && opts.pro.is_pro && (opts.pro.remaining || 0) > 0);
      var tierKeys = Object.keys(tiers).filter(function (key) { return !proLeft || (tiers[key].duration || 0) > 3; });
      var rows = proRows + tierKeys.map(function (key) {
        var tcfg = tiers[key];
        return '<button type="button" data-tier="' + key + '" style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:14px 16px;margin-bottom:10px;border:1px solid var(--border,#EBEBEB);border-radius:12px;background:#fff;cursor:pointer;font-family:inherit;text-align:left;">' +
          '<span style="font-size:14px;font-weight:600;color:var(--text,#171717);">' + labels[key] + '</span>' +
          '<span style="font-size:14px;font-weight:800;color:var(--primary,#09B1BA);">' + tcfg.price + ' AED</span>' +
        '</button>';
      }).join('');
      overlay.innerHTML =
        '<div style="background:#fff;border-radius:20px;padding:28px;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.25);">' +
          '<div style="font-size:40px;text-align:center;margin-bottom:8px;">🚀</div>' +
          '<h3 style="margin:0 0 6px;font-size:20px;font-weight:800;color:var(--text,#171717);text-align:center;">' + _payT('pay_choose_boost', 'Boost this listing') + '</h3>' +
          '<p style="margin:0 0 18px;font-size:13px;color:var(--text-secondary,#555);text-align:center;">' + _payT('pay_boost_hint', 'Boosted items appear at the top of the Swap Market.') + '</p>' +
          rows +
          '<button type="button" data-tier="" style="width:100%;padding:10px;border:none;background:transparent;color:var(--text-muted,#999);font-weight:600;cursor:pointer;font-family:inherit;">' + _payT('avatar_modal_cancel', 'Cancel') + '</button>' +
        '</div>';
      overlay.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-tier]');
        if (btn) { overlay.remove(); resolve(btn.getAttribute('data-tier') || null); return; }
        if (e.target === overlay) { overlay.remove(); resolve(null); }
      });
      document.body.appendChild(overlay);
    });
  }

  // ── Feature flag: FEATURES.PAYMENTS (js/constants.js) ─────
  // While false, Pro + boosts stay fully visible (prices, benefits) but every
  // payment entry point renders "Coming soon" and only toasts on click.
  function _paymentsEnabled() {
    return !!(window.FEATURES && window.FEATURES.PAYMENTS === true);
  }

  function _comingSoon() {
    _toast(_payT('pay_coming_soon_toast', 'Swappo Pro and boosts are coming soon — payments are being finalised.'), 'info');
    return false;
  }

  // Any element marked data-pay-cta="pro|boost|manage" is relabelled while
  // payments are off; data-pay-soon-note elements are un-hidden. Works for
  // static markup AND modals injected later (MutationObserver below).
  function _decorate(root) {
    if (_paymentsEnabled()) return;
    var scope = root && root.querySelectorAll ? root : document;
    var label = _payT('pay_cta_soon', 'Coming soon 🔒');
    scope.querySelectorAll('[data-pay-cta]:not([data-pay-decorated])').forEach(function (el) {
      el.setAttribute('data-pay-decorated', '1');
      el.setAttribute('aria-disabled', 'true');
      el.setAttribute('title', label);
      el.style.opacity = '0.7';
      el.style.cursor = 'not-allowed';
      el.removeAttribute('data-i18n'); // stop applyTranslations() from restoring the original label
      el.textContent = label;
      if (el.tagName === 'BUTTON') {
        el.onclick = null;
        // Capture phase + stopImmediatePropagation: wins over any other click
        // listener on the same button, whatever the registration order.
        el.addEventListener('click', function (e) {
          e.preventDefault(); e.stopImmediatePropagation(); _comingSoon();
        }, true);
      }
    });
    scope.querySelectorAll('[data-pay-soon-note]').forEach(function (el) { el.hidden = false; });
  }

  function _observe() {
    if (_paymentsEnabled() || !window.MutationObserver) return;
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          if (added[j].nodeType === 1) _decorate(added[j]);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  // ── Active boost helpers (shared by the profile + product pages) ──
  function boostActiveUntil(item) {
    if (!item || !item.is_boosted || !item.boost_expires_at) return null;
    var d = new Date(item.boost_expires_at);
    return (d.getTime() > Date.now()) ? d : null;
  }
  function boostedUntilLabel(item) {
    var d = boostActiveUntil(item);
    if (!d) return '';
    var when;
    try { when = d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { when = d.toISOString().slice(0, 16).replace('T', ' '); }
    return _payT('boosted_until', 'Boosted until {date}').replace('{date}', when);
  }

  // ── Pro included boosts (server-side: migration 035) ──────
  async function _proBoostStatus() {
    if (!window.db) return null;
    try {
      var r = await window.db.rpc('pro_boosts_status');
      return (r && !r.error && r.data) ? r.data : null;
    } catch (e) { return null; }
  }
  async function _useProBoost(itemId) {
    var r;
    try { r = await window.db.rpc('use_pro_boost', { p_item_id: itemId }); }
    catch (e) { r = { error: e }; }
    if (r && r.error) {
      var msg = String(r.error.message || '');
      if (/pro_boosts_exhausted/.test(msg)) _toast(_payT('pay_pro_boost_exhausted', 'Your Pro boosts are used up this month.').replace('{limit}', 3), 'warning');
      else if (/item_not_available/.test(msg)) _toast(_payT('pay_boost_item_unavailable', "This listing can't be boosted right now (it must be available)."), 'warning');
      else if (/pro_required/.test(msg)) _toast(_payT('pay_signin_required', 'Please sign in first.'), 'warning');
      else _toast(_payT('pay_error', 'Payment could not be started.') + ' ' + msg, 'error');
      return false;
    }
    var d = r.data || {};
    _toast(_payT('pay_pro_boost_done', 'Boost activated with your Pro plan! 🚀 {n} left this month.').replace('{n}', d.remaining != null ? d.remaining : ''), 'success');
    try { document.dispatchEvent(new CustomEvent('swappo:boosted', { detail: d })); } catch (e) {}
    setTimeout(function () { location.reload(); }, 1400);
    return true;
  }

  // ── Give & Earn boosts (server-side: migration 046) ───────
  async function _giftBoostStatus() {
    if (!window.db) return null;
    try {
      var r = await window.db.rpc('give_earn_status');
      return (r && !r.error && r.data) ? r.data : null;
    } catch (e) { return null; }
  }
  async function _useGiftBoost(itemId) {
    var r;
    try { r = await window.db.rpc('use_gift_boost', { p_item_id: itemId }); }
    catch (e) { r = { error: e }; }
    if (r && r.error) {
      var msg = String(r.error.message || '');
      if (/gift_boosts_exhausted/.test(msg)) _toast(_payT('pay_gift_boost_none', 'No free boost left — give 3 items away to earn one.'), 'warning');
      else if (/item_not_available/.test(msg)) _toast(_payT('pay_boost_item_unavailable', "This listing can't be boosted right now (it must be available)."), 'warning');
      else _toast(_payT('pay_error', 'Payment could not be started.') + ' ' + msg, 'error');
      return false;
    }
    _toast(_payT('pay_gift_boost_done', 'Boost activated — thank you for giving! 🚀'), 'success');
    try { document.dispatchEvent(new CustomEvent('swappo:boosted', { detail: r.data || {} })); } catch (e) {}
    setTimeout(function () { location.reload(); }, 1400);
    return true;
  }

  // ── Public API ────────────────────────────────────────────
  var SwappoPayment = {

    subscribePro: async function (interval) {
      if (!_paymentsEnabled()) return _comingSoon();
      var user = await _requireUser();
      if (!user) return false;
      var cur = await _proBoostStatus();
      if (cur && cur.is_pro) {
        _toast(_payT('pay_already_pro', 'You already have an active Pro subscription.'), 'info');
        return false;
      }
      return _checkout({ kind: 'pro', interval: interval === 'year' ? 'year' : 'month' });
    },

    buyBoost: async function (itemId, tier) {
      if (!_paymentsEnabled()) return _comingSoon();
      var user = await _requireUser();
      if (!user) return false;
      if (!itemId) { _toast(_payT('pay_error', 'Payment could not be started.'), 'error'); return false; }
      // Pro plan: 3 included boosts / month, applied by use_pro_boost().
      // The session user carries no plan → always ask the server
      // (pro_boosts_status reads users.is_pro / plan).
      if (!tier) {
        var both = await Promise.all([_proBoostStatus(), _giftBoostStatus()]);
        var status = both[0], gift = both[1];
        var giftLeft = !!(gift && (gift.available || 0) > 0);
        if ((status && status.is_pro) || giftLeft) {
          var choice = await _pickBoostTier({ pro: status, gift: gift });
          if (!choice) return false;
          if (choice === 'gift') return _useGiftBoost(itemId);
          if (choice === 'pro') return _useProBoost(itemId);
          tier = choice;
        }
      }
      if (!tier) tier = await _pickBoostTier();
      if (!tier) return false;
      return _checkout({ kind: 'boost', item_id: itemId, tier: tier });
    },

    manageSubscription: async function () {
      if (!_paymentsEnabled()) return _comingSoon();
      var user = await _requireUser();
      if (!user) return false;
      // No Pro subscription yet → there is nothing to manage: go straight to
      // Checkout so the user can actually pay. (The Edge Function applies the
      // same rule server-side, using Stripe as the source of truth.)
      var st = await _proBoostStatus();
      if (st && st.is_pro === false) {
        return _checkout({ kind: 'pro', interval: 'month' });
      }
      return _checkout({ kind: 'portal', return_url: location.href.split('?')[0] });
    },

    boostActiveUntil: boostActiveUntil,
    boostedUntilLabel: boostedUntilLabel,

    isPro: async function () {
      if (!_ready()) return false;
      var st = await _proBoostStatus();
      return !!(st && st.is_pro);
    },

    // Reads ?checkout=success|cancel&kind=pro|boost after Stripe redirects back.
    handleReturn: async function () {
      var params = new URLSearchParams(location.search);
      var state = params.get('checkout');
      if (!state) return;
      var kind = params.get('kind') || 'pro';

      if (state === 'success') {
        _toast(kind === 'boost'
          ? _payT('pay_success_boost', 'Boost activated! Your listing is now at the top. 🚀')
          : _payT('pay_success_pro',   'Welcome to Swappo Pro! 🛡️'), 'success');
        try {
          var u = _ready() ? await window.SwappoAuth.getCurrentUser() : null;
          await _refreshProfile(u && u.id);
        } catch (e) {}
      } else if (state === 'cancel') {
        _toast(_payT('pay_cancelled', 'Checkout cancelled — nothing was charged.'), 'info');
      }

      // Clean the URL so a refresh doesn't re-toast.
      params.delete('checkout'); params.delete('kind');
      var qs = params.toString();
      try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash); } catch (e) {}
    }
  };

  SwappoPayment.enabled = _paymentsEnabled;
  SwappoPayment.comingSoon = _comingSoon;
  window.SwappoPayment = SwappoPayment;

  function _boot() {
    _decorate(document);
    _observe();
    // Re-label in the new language when the user switches.
    document.addEventListener('languageChanged', function () {
      document.querySelectorAll('[data-pay-decorated]').forEach(function (el) { el.removeAttribute('data-pay-decorated'); });
      _decorate(document);
    });
    // Give supabase.js a beat to restore the session before we read it.
    setTimeout(function () { SwappoPayment.handleReturn(); }, 400);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _boot);
  else _boot();
})();
