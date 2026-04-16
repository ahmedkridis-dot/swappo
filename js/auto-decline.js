/* ============================================
   Swappo — eBay-style Auto-Decline (Pro feature)
   Each Pro listing can enable an auto-decline rule: offers below X% of the
   asking price are automatically declined with a polite system message.
   Free users see a greyed-out "Pro feature" control.

   Schema: public.items (auto_decline_enabled boolean, auto_decline_pct int).
   ============================================ */
(function () {
  if (window.SwappoAutoDecline) return;

  function tr(key, fallback) { return (typeof t === 'function') ? t(key) : (fallback || key); }

  function injectStyle() {
    if (document.getElementById('swp-auto-style')) return;
    const s = document.createElement('style');
    s.id = 'swp-auto-style';
    s.textContent = [
      '.swp-auto { background: #F0FDFA; border: 1px solid #A7F3D0; border-radius: 12px; padding: 14px 16px; margin: 10px 0; font-family: Inter, sans-serif; }',
      '.swp-auto-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }',
      '.swp-auto-title { font-weight: 700; color: #065F46; font-size: 0.9rem; }',
      '.swp-auto-pro-flag { background: #FCE7F3; color: #BE185D; padding: 2px 8px; border-radius: 999px; font-size: 0.7rem; font-weight: 700; }',
      '.swp-auto-row { display: flex; align-items: center; gap: 10px; margin-top: 8px; }',
      '.swp-auto-switch { width: 40px; height: 22px; background: #D1D5DB; border-radius: 999px; position: relative; cursor: pointer; transition: background 0.15s; border: 0; }',
      '.swp-auto-switch::after { content: ""; width: 18px; height: 18px; background: #fff; border-radius: 50%; position: absolute; top: 2px; left: 2px; transition: transform 0.15s; }',
      '.swp-auto-switch.on { background: #10B981; }',
      '.swp-auto-switch.on::after { transform: translateX(18px); }',
      '.swp-auto-switch:disabled { opacity: 0.5; cursor: not-allowed; }',
      '.swp-auto-slider { flex: 1; }',
      '.swp-auto-value { font-weight: 700; color: #065F46; min-width: 48px; text-align: right; }',
      '.swp-auto-hint { font-size: 0.78rem; color: #555; margin-top: 6px; }'
    ].join('\n');
    document.head.appendChild(s);
  }

  /**
   * Attach the auto-decline control to an element.
   * @param {HTMLElement} container
   * @param {object} item — expects { id, price, auto_decline_enabled, auto_decline_pct }
   * @param {boolean} isPro — whether the current user is Pro.
   */
  function render(container, item, isPro) {
    injectStyle();
    container.classList.add('swp-auto');
    const pct = (item.auto_decline_pct != null) ? item.auto_decline_pct : 80;
    const enabled = !!item.auto_decline_enabled && isPro;
    const itemId = item.id;

    container.innerHTML =
      '<div class="swp-auto-head">' +
        '<div class="swp-auto-title">⚙️ ' + tr('auto_decline_title', 'Auto-decline low offers') + '</div>' +
        (isPro ? '' : '<span class="swp-auto-pro-flag">' + tr('auto_decline_pro_only', 'Pro feature') + '</span>') +
      '</div>' +
      '<div class="swp-auto-row">' +
        '<button type="button" class="swp-auto-switch' + (enabled ? ' on' : '') + '"' + (isPro ? '' : ' disabled') + ' aria-label="Toggle auto-decline"></button>' +
        '<span style="font-size:0.85rem;color:#065F46;font-weight:600;">' + tr('auto_decline_toggle', 'Enable auto-decline') + '</span>' +
      '</div>' +
      '<div class="swp-auto-row">' +
        '<span style="font-size:0.8rem;color:#065F46;">' + tr('auto_decline_threshold', 'Decline offers below') + '</span>' +
        '<input type="range" min="40" max="100" step="5" value="' + pct + '" class="swp-auto-slider"' + (isPro ? '' : ' disabled') + '>' +
        '<span class="swp-auto-value">' + pct + '%</span>' +
      '</div>' +
      '<div class="swp-auto-hint">' + tr('auto_decline_msg', 'Thanks for your offer — it\'s below what I can accept right now.') + '</div>';

    const sw = container.querySelector('.swp-auto-switch');
    const slider = container.querySelector('.swp-auto-slider');
    const valueEl = container.querySelector('.swp-auto-value');

    if (!isPro) return;

    sw.addEventListener('click', async function () {
      const next = !sw.classList.contains('on');
      sw.classList.toggle('on', next);
      if (window.db) {
        try {
          await window.db.from('items').update({ auto_decline_enabled: next }).eq('id', itemId);
          if (window.Toast) Toast.success(next ? 'Auto-decline enabled' : 'Auto-decline disabled');
        } catch (e) { console.warn('[auto-decline.update]', e); }
      }
    });

    slider.addEventListener('input', function () { valueEl.textContent = slider.value + '%'; });
    slider.addEventListener('change', async function () {
      if (!window.db) return;
      try {
        await window.db.from('items').update({ auto_decline_pct: Number(slider.value) }).eq('id', itemId);
        if (window.Toast) Toast.success('Threshold saved');
      } catch (e) { console.warn('[auto-decline.threshold]', e); }
    });
  }

  /**
   * Should an incoming offer be auto-declined?
   * @param {object} listing — { price, auto_decline_enabled, auto_decline_pct }
   * @param {number} offerAmount
   * @returns {boolean}
   */
  function shouldDecline(listing, offerAmount) {
    if (!listing || !listing.auto_decline_enabled) return false;
    const pct = listing.auto_decline_pct || 80;
    const threshold = (listing.price || 0) * (pct / 100);
    return Number(offerAmount || 0) < threshold;
  }

  window.SwappoAutoDecline = { render: render, shouldDecline: shouldDecline };
})();
