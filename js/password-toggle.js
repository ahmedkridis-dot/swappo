/* ============================================
   Swappo — Show / hide password toggle
   Adds an eye button to every <input type="password"> on the page
   (login, reset-password, profile settings…). Works for inputs added
   later (verify card, modals) through a MutationObserver, and follows
   the active language for the accessible label.

   Usage: just load the script — nothing to call.
   ============================================ */
(function () {
  'use strict';

  var ATTR = 'data-pwd-toggle';

  function _t(key, fallback) {
    return (typeof window.t === 'function') ? window.t(key) : fallback;
  }
  function _label(shown) {
    return shown ? _t('auth_hide_password', 'Hide password') : _t('auth_show_password', 'Show password');
  }

  function decorate(input) {
    if (!input || input.getAttribute(ATTR) || input.type !== 'password') return;
    input.setAttribute(ATTR, '1');

    // Wrap so the button can sit inside the field without touching the
    // page's own input styles (width / border / radius stay as they are).
    var wrap = document.createElement('span');
    wrap.className = 'swp-pwd-wrap';
    wrap.style.cssText = 'position:relative;display:block;width:100%;';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    input.style.paddingInlineEnd = '44px';
    input.style.width = '100%';
    input.style.boxSizing = 'border-box';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swp-pwd-eye';
    btn.setAttribute('aria-label', _label(false));
    btn.setAttribute('aria-pressed', 'false');
    btn.tabIndex = -1; // the field itself stays the tab stop; the eye is a pointer helper
    btn.style.cssText = 'position:absolute;top:0;bottom:0;inset-inline-end:4px;width:38px;margin:auto 0;height:36px;border:0;background:transparent;color:#9CA3AF;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;border-radius:8px;padding:0;';
    btn.innerHTML = '<i class="fas fa-eye" aria-hidden="true"></i>';
    btn.addEventListener('mousedown', function (e) { e.preventDefault(); }); // keep focus in the field
    btn.addEventListener('click', function () {
      var show = input.type === 'password';
      var pos = null;
      try { pos = input.selectionStart; } catch (e) {}
      input.type = show ? 'text' : 'password';
      btn.innerHTML = '<i class="fas ' + (show ? 'fa-eye-slash' : 'fa-eye') + '" aria-hidden="true"></i>';
      btn.style.color = show ? '#09B1BA' : '#9CA3AF';
      btn.setAttribute('aria-label', _label(show));
      btn.setAttribute('aria-pressed', show ? 'true' : 'false');
      try { input.focus(); if (pos != null) input.setSelectionRange(pos, pos); } catch (e) {}
    });
    wrap.appendChild(btn);
  }

  function scan(root) {
    var list = (root && root.querySelectorAll) ? root.querySelectorAll('input[type="password"]') : [];
    for (var i = 0; i < list.length; i++) decorate(list[i]);
    if (root && root.matches && root.matches('input[type="password"]')) decorate(root);
  }

  function init() {
    scan(document);
    if (window.MutationObserver) {
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var added = muts[i].addedNodes;
          for (var j = 0; j < added.length; j++) if (added[j].nodeType === 1) scan(added[j]);
        }
      }).observe(document.body, { childList: true, subtree: true });
    }
    // Language switch → refresh the accessible labels
    document.addEventListener('languageChanged', function () {
      var eyes = document.querySelectorAll('.swp-pwd-eye');
      for (var i = 0; i < eyes.length; i++) {
        eyes[i].setAttribute('aria-label', _label(eyes[i].getAttribute('aria-pressed') === 'true'));
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
