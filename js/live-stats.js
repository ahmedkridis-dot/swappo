/* ============================================
   Swappo — Live Stats (eco ticker)
   Fetches real numbers from Supabase RPC get_live_stats()
   and updates the eco-ticker counters. Polls every 30s.
   CO2 methodology: ADEME Base Carbone factors per category
   (see table public.co2_factors).
   ============================================ */
(function () {
  'use strict';

  var POLL_MS = 30000;
  // Counter order in the eco-ticker markup:
  //   0 → CO2 kg saved       (suffix " kg")
  //   1 → items swapped
  //   2 → gifts today
  //   3 → items sold today   (homepage only, optional)
  var KEY_BY_INDEX = ['co2_kg_saved', 'items_swapped', 'gifts_today', 'sold_today'];

  function formatLiveLabel(n) {
    if (!n || n < 0) n = 0;
    return '+' + n + ' in the last hour';
  }

  function applyStats(stats) {
    var ticker = document.getElementById('ecoTicker');
    if (!ticker || !stats) return;

    var nums = ticker.querySelectorAll('.eco-ticker-number');
    nums.forEach(function (el, i) {
      var key = el.getAttribute('data-live-key') || KEY_BY_INDEX[i];
      if (!key) return;
      var value = Number(stats[key]);
      if (!isFinite(value)) value = 0;

      el.setAttribute('data-target', String(value));
      el.dataset.counterValue = String(value);
      var suffix = el.getAttribute('data-suffix') || '';
      el.textContent = Math.floor(value).toLocaleString() + suffix;
    });

    var liveEl = document.getElementById('ecoTickerLive');
    if (liveEl) liveEl.textContent = formatLiveLabel(stats.items_last_hour);
  }

  async function fetchStats() {
    try {
      if (!window.db || !window.db.rpc) return null;
      var res = await window.db.rpc('get_live_stats');
      if (res && res.error) {
        console.warn('[live-stats] RPC error:', res.error.message);
        return null;
      }
      return (res && res.data) || null;
    } catch (e) {
      console.warn('[live-stats] fetch failed:', e);
      return null;
    }
  }

  async function tick() {
    var stats = await fetchStats();
    if (stats) applyStats(stats);
  }

  function start() {
    if (!document.getElementById('ecoTicker')) return;

    // First fetch — retry briefly while window.db boots
    (function waitForDb(attempts) {
      if (window.db && window.db.rpc) { tick(); return; }
      if (attempts > 0) setTimeout(function () { waitForDb(attempts - 1); }, 200);
    })(25);

    setInterval(tick, POLL_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
