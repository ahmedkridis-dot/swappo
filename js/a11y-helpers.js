/* ============================================
   Swappo — A11y helpers
   Progressive enhancement : any element with onclick that isn't a native
   <button>, <a>, or <summary> becomes keyboard-activable (Enter + Space)
   and gets role="button" + tabindex="0" so screen readers announce it
   correctly. Runs on DOMContentLoaded + watches for dynamically-added
   nodes via MutationObserver (chat/feed render after page load).

   WCAG 2.1.1 (keyboard) + 4.1.2 (name, role, value) compliance.
   ============================================ */
(function () {
  if (window.__SwappoA11yHelpers) return;
  window.__SwappoA11yHelpers = true;

  const NATIVE_ROLES = new Set(['BUTTON', 'A', 'SUMMARY', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL']);

  function enhance(root) {
    root = root || document;
    // Find onclick that isn't on a natively-focusable element
    const candidates = root.querySelectorAll ? root.querySelectorAll('[onclick]') : [];
    candidates.forEach(enhanceOne);
  }

  function enhanceOne(el) {
    if (!el || el.__a11yEnhanced) return;
    if (NATIVE_ROLES.has(el.tagName)) return;
    el.__a11yEnhanced = true;

    // Set role + tabindex if not already set explicitly
    if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');

    // If no accessible name, fall back to aria-label from content (text or data-i18n key)
    if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) {
      const key = el.getAttribute('data-i18n');
      if (key && !el.textContent.trim()) {
        el.setAttribute('aria-label', key.replace(/_/g, ' '));
      }
    }

    // Enter / Space fire a click
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        // Use .click() so the existing onclick handler runs unchanged
        el.click();
      }
    });

    // Make sure cursor is pointer (some already have it, some don't)
    const cs = getComputedStyle(el);
    if (cs.cursor === 'auto' || cs.cursor === 'default') {
      el.style.cursor = 'pointer';
    }
  }

  function init() {
    enhance(document);
    // Watch for DOM mutations (chat messages, feed tabs, modal content)
    try {
      const mo = new MutationObserver(function (mutations) {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeType === 1) {
              enhanceOne(node);
              if (node.querySelectorAll) enhance(node);
            }
          }
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (e) { /* MO not available — single pass at init is enough */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Also expose for explicit call after manual innerHTML rewrites
  try { window.SwappoA11y = { enhance: enhance, enhanceOne: enhanceOne }; } catch (e) {}
})();
