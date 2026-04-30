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
  // Cross-page cache: stats are aggregate counters that don't move much
  // in 30 s. Skip the RPC on a fresh navigation if we already pulled
  // recent numbers in this browser session.
  var STATS_CACHE_KEY = 'swp_live_stats_cache';
  var STATS_TTL_MS = 30000;
  function _readStatsCache() {
    try {
      var raw = sessionStorage.getItem(STATS_CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.t !== 'number') return null;
      if ((Date.now() - parsed.t) > STATS_TTL_MS) return null;
      return parsed.v;
    } catch (e) { return null; }
  }
  function _writeStatsCache(stats) {
    try { sessionStorage.setItem(STATS_CACHE_KEY, JSON.stringify({ t: Date.now(), v: stats })); } catch (e) {}
  }
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

  function writeCounter(el, rawValue) {
    var divisor = parseFloat(el.getAttribute('data-live-divisor') || '1');
    var value = Number(rawValue);
    if (!isFinite(value)) value = 0;
    var scaled = divisor && divisor !== 1 ? value / divisor : value;
    var suffix = el.getAttribute('data-suffix') || '';
    var prefix = el.getAttribute('data-prefix') || '';
    el.setAttribute('data-target', String(scaled));
    el.dataset.counterValue = String(scaled);
    el.textContent = prefix + Math.floor(scaled).toLocaleString() + suffix;
  }

  function applyStats(stats) {
    if (!stats) return;

    var ticker = document.getElementById('ecoTicker');
    if (ticker) {
      ticker.querySelectorAll('.eco-ticker-number').forEach(function (el, i) {
        var key = el.getAttribute('data-live-key') || KEY_BY_INDEX[i];
        if (!key) return;
        writeCounter(el, stats[key]);
      });
      var liveEl = document.getElementById('ecoTickerLive');
      if (liveEl) liveEl.textContent = formatLiveLabel(stats.items_last_hour);
    }

    // Any other counter on the page (e.g. Swappo Effect) that opts in via
    // data-live-key. Skip elements already handled inside the eco-ticker.
    document.querySelectorAll('[data-live-key]').forEach(function (el) {
      if (el.closest && el.closest('#ecoTicker')) return;
      var key = el.getAttribute('data-live-key');
      if (!key) return;
      writeCounter(el, stats[key]);
    });
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
    if (stats) {
      applyStats(stats);
      _writeStatsCache(stats);
    }
  }

  function start() {
    if (!document.getElementById('ecoTicker')) return;

    // 1) Paint from sessionStorage immediately — zero network on a warm
    //    in-session navigation.
    var cached = _readStatsCache();
    if (cached) applyStats(cached);

    // 2) If cache was fresh, skip the first RPC and let the poll handle
    //    the next refresh in (POLL_MS - cache_age). Otherwise fetch now.
    if (!cached) {
      (function waitForDb(attempts) {
        if (window.db && window.db.rpc) { tick(); return; }
        if (attempts > 0) setTimeout(function () { waitForDb(attempts - 1); }, 200);
      })(25);
    }

    setInterval(tick, POLL_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
