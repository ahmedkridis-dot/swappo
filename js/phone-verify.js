/* ========================
   SWAPPO PHONE VERIFICATION — window.SwappoPhone
   Swappo — swappo.ae

   Adds a verified phone to an EXISTING email account (trust badge).
   The phone is never a login identifier and is never shown to others.

   Dormant while FEATURES.PHONE_VERIFICATION === false: nothing is
   rendered, no network call is made. Flip the flag in js/constants.js
   once Twilio Phone Auth is enabled in Supabase → Auth → Providers.

   Flow (Supabase "phone change" OTP):
     sendCode(phone)         → db.auth.updateUser({ phone })  → SMS OTP
     verifyCode(phone, code) → db.auth.verifyOtp({ phone, token, type: 'phone_change' })
                             → db.rpc('confirm_phone_verified')  (migration 027)
   ======================== */

(function () {
  'use strict';

  var COUNTRIES = {
    ae: { prefix: '+971', pattern: /^5[0-9]{8}$/,      digits: 9 },
    sa: { prefix: '+966', pattern: /^5[0-9]{8}$/,      digits: 9 },
    om: { prefix: '+968', pattern: /^[79][0-9]{7}$/,   digits: 8 },
    qa: { prefix: '+974', pattern: /^[3-7][0-9]{7}$/,  digits: 8 },
    bh: { prefix: '+973', pattern: /^[36][0-9]{7}$/,   digits: 8 },
    kw: { prefix: '+965', pattern: /^[569][0-9]{7}$/,  digits: 8 }
  };

  var BANNER_DISMISS_KEY = 'swappo_verify_banner_dismissed_until';
  var BANNER_DISMISS_DAYS = 7;

  function enabled() {
    return !!(window.FEATURES && window.FEATURES.PHONE_VERIFICATION === true);
  }

  function _t(key, fallback) {
    return (typeof t === 'function') ? t(key) : (fallback || key);
  }

  function _toast(msg, type) {
    if (window.Toast && typeof window.Toast.show === 'function') window.Toast.show(msg, type || 'info');
  }

  function _ready() {
    return !!(window.db && window.SwappoAuth && window.SwappoAuth.isReady && window.SwappoAuth.isReady());
  }

  // Map Supabase Auth error messages to i18n keys (structural, not per-message hacks).
  function _friendly(err) {
    var m = String((err && err.message) || err || '').toLowerCase();
    if (m.indexOf('expired') !== -1)                              return _t('err_code_expired', 'This code has expired. Request a new one.');
    if (m.indexOf('rate') !== -1 || m.indexOf('too many') !== -1) return _t('err_too_many_attempts', 'Too many attempts. Please wait a few minutes.');
    if (m.indexOf('invalid') !== -1 || m.indexOf('token') !== -1) return _t('err_code_invalid', 'Incorrect code. Check the SMS and try again.');
    if (m.indexOf('phone_taken') !== -1 || m.indexOf('already') !== -1) return _t('err_phone_taken', 'This number is already verified on another account.');
    if (m.indexOf('phone') !== -1)                                return _t('err_phone_invalid', 'Please enter a valid mobile number.');
    return _t('err_verify_generic', 'Verification failed. Please try again.');
  }

  function normalize(country, local) {
    var c = COUNTRIES[country] || COUNTRIES.ae;
    var digits = String(local || '').replace(/\D/g, '').replace(/^0+/, '');
    if (!c.pattern.test(digits)) return null;
    return c.prefix + digits;
  }

  var SwappoPhone = {
    enabled: enabled,
    COUNTRIES: COUNTRIES,
    normalize: normalize,

    /** Ask Supabase to send the OTP for a phone change. Returns E.164 on success. */
    sendCode: async function (e164) {
      if (!enabled()) return { success: false, error: 'disabled' };
      if (!_ready())  return { success: false, error: _t('auth_service_unavailable', 'Auth service unavailable. Please refresh.') };
      if (!e164)      return { success: false, error: _t('err_phone_invalid', 'Please enter a valid mobile number.') };
      try {
        var res = await window.db.auth.updateUser({ phone: e164 });
        if (res.error) return { success: false, error: _friendly(res.error) };
        return { success: true, phone: e164 };
      } catch (e) {
        return { success: false, error: _friendly(e) };
      }
    },

    /** Verify the 6-digit code, then let the DB stamp the badge. */
    verifyCode: async function (e164, token) {
      if (!enabled()) return { success: false, error: 'disabled' };
      if (!_ready())  return { success: false, error: _t('auth_service_unavailable', 'Auth service unavailable. Please refresh.') };
      if (!/^[0-9]{6}$/.test(String(token || ''))) return { success: false, error: _t('err_code_invalid', 'Incorrect code. Check the SMS and try again.') };
      try {
        var v = await window.db.auth.verifyOtp({ phone: e164, token: String(token), type: 'phone_change' });
        if (v.error) return { success: false, error: _friendly(v.error) };

        // Server-side stamp (SECURITY DEFINER, trusts auth.users.phone_confirmed_at).
        var r = await window.db.rpc('confirm_phone_verified');
        if (r.error) return { success: false, error: _friendly(r.error) };

        try { if (window.SwappoAuth.refreshProfile) await window.SwappoAuth.refreshProfile(); } catch (e) {}
        try { localStorage.removeItem(BANNER_DISMISS_KEY); } catch (e) {}
        document.dispatchEvent(new CustomEvent('swappo:phone-verified', { detail: r.data || null }));
        return { success: true, profile: r.data || null };
      } catch (e) {
        return { success: false, error: _friendly(e) };
      }
    },

    /** Reusable chip markup — same style as the tier chips. */
    badgeHTML: function (opts) {
      opts = opts || {};
      var label = _t('badge_verified', 'Verified');
      var size = opts.small ? 'font-size:0.68rem;padding:2px 8px;' : 'font-size:12px;padding:3px 10px;';
      return '<span class="swp-chip swp-chip-verified" title="' + label + '" style="' + size +
             'border-radius:999px;font-weight:700;background:var(--primary-light,#E6F7F8);color:var(--primary-dark,#078A91);display:inline-flex;align-items:center;gap:4px;">✓ ' + label + '</span>';
    },

    // ── Dashboard UI (profile.html) ─────────────────────────
    _bannerDismissed: function () {
      try {
        var until = parseInt(localStorage.getItem(BANNER_DISMISS_KEY) || '0', 10);
        return until > Date.now();
      } catch (e) { return false; }
    },

    dismissBanner: function () {
      try { localStorage.setItem(BANNER_DISMISS_KEY, String(Date.now() + BANNER_DISMISS_DAYS * 86400000)); } catch (e) {}
      var b = document.getElementById('verify-banner');
      if (b) b.hidden = true;
    },

    /** Wire the hidden dashboard block + banner. No-op when the flag is off. */
    mountDashboard: async function () {
      if (!enabled()) return;
      var section = document.querySelector('[data-feature="phone_verification"]');
      var banner  = document.getElementById('verify-banner');
      if (!section && !banner) return;

      var user = null;
      try { user = _ready() ? await window.SwappoAuth.getCurrentUser() : null; } catch (e) {}
      if (!user) return;

      var verified = !!user.is_verified;
      if (section) section.hidden = false;
      if (banner)  banner.hidden = verified || SwappoPhone._bannerDismissed();

      var form      = section && section.querySelector('#verify-form');
      var doneBox   = section && section.querySelector('#verify-done');
      var country   = section && section.querySelector('#verify-country');
      var input     = section && section.querySelector('#verify-phone');
      var codeWrap  = section && section.querySelector('#verify-code-wrap');
      var codeInput = section && section.querySelector('#verify-code');
      var sentTo    = section && section.querySelector('#verify-sent-to');
      var btn       = section && section.querySelector('#verify-submit');
      var resend    = section && section.querySelector('#verify-resend');
      var headerSlot = document.getElementById('verified-badge-slot');

      function showVerified() {
        if (form)    form.hidden = true;
        if (doneBox) doneBox.hidden = false;
        if (banner)  banner.hidden = true;
        if (headerSlot) headerSlot.innerHTML = SwappoPhone.badgeHTML();
      }
      if (verified) { showVerified(); return; }

      var pending = null; // E.164 waiting for its code

      async function onSubmit(ev) {
        if (ev) ev.preventDefault();
        if (!btn) return;
        btn.disabled = true;
        try {
          if (!pending) {
            var e164 = normalize(country ? country.value : 'ae', input ? input.value : '');
            if (!e164) { _toast(_t('err_phone_invalid', 'Please enter a valid mobile number.'), 'error'); return; }
            var s = await SwappoPhone.sendCode(e164);
            if (!s.success) { _toast(s.error, 'error'); return; }
            pending = e164;
            if (sentTo)   sentTo.textContent = e164;
            if (codeWrap) codeWrap.hidden = false;
            btn.textContent = _t('verify_button', 'Verify');
            _toast(_t('verify_code_sent_to', 'Code sent to') + ' ' + e164, 'info');
            setTimeout(function () { if (codeInput) codeInput.focus(); }, 50);
          } else {
            var v = await SwappoPhone.verifyCode(pending, codeInput ? codeInput.value.trim() : '');
            if (!v.success) { _toast(v.error, 'error'); return; }
            _toast(_t('verify_success', '✓ Your number is verified'), 'success');
            showVerified();
          }
        } finally {
          btn.disabled = false;
        }
      }

      if (form)   form.addEventListener('submit', onSubmit);
      if (resend) resend.addEventListener('click', async function (ev) {
        ev.preventDefault();
        if (!pending) return;
        var s = await SwappoPhone.sendCode(pending);
        _toast(s.success ? _t('auth_code_resent', 'Code resent.') : s.error, s.success ? 'info' : 'error');
      });

      var bannerCta = banner && banner.querySelector('[data-verify-cta]');
      if (bannerCta) bannerCta.addEventListener('click', function (ev) {
        ev.preventDefault();
        var tab = document.querySelector('[data-tab=settings]');
        if (tab) tab.click();
        setTimeout(function () {
          if (section) section.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (input) input.focus();
        }, 150);
      });
      var bannerClose = banner && banner.querySelector('[data-verify-dismiss]');
      if (bannerClose) bannerClose.addEventListener('click', function (ev) { ev.preventDefault(); SwappoPhone.dismissBanner(); });

      // Deep link from the launch email: profile.html#verify
      if (location.hash === '#verify' && bannerCta) bannerCta.click();
    }
  };

  window.SwappoPhone = SwappoPhone;

  function _boot() {
    if (!enabled()) return;
    var tries = 0;
    (function poll() {
      if (_ready()) SwappoPhone.mountDashboard();
      else if (tries++ < 50) setTimeout(poll, 100);
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _boot);
  else _boot();
})();
