/* ============================================
   Swappo — Facebook-style Neighborhood Feed Tabs
   4 tabs above the catalogue grid: Trending / Around You / Latest / For You.
   "Around You" asks for GPS and filters items within 5 km (falls back to the
   user's emirate when geolocation is denied). Each card in "Around You"
   gains a distance badge ("📍 2.3 km").
   ============================================ */
(function () {
  if (window.SwappoFeedTabs) return;

  const TABS = [
    { key: 'trending', icon: '🔥', i18n: 'tab_trending',  label: 'Trending' },
    { key: 'around',   icon: '📍', i18n: 'tab_around',    label: 'Around You' },
    { key: 'latest',   icon: '🕐', i18n: 'tab_latest',    label: 'Latest' },
    { key: 'foryou',   icon: '🎯', i18n: 'tab_for_you',   label: 'For You' }
  ];

  function tr(key, fallback) { return (typeof t === 'function') ? t(key) : (fallback || key); }

  function injectStyle() {
    if (document.getElementById('swp-tabs-style')) return;
    const s = document.createElement('style');
    s.id = 'swp-tabs-style';
    s.textContent = [
      '.swp-feed-tabs { display: flex; gap: 6px; overflow-x: auto; padding: 10px 0; border-bottom: 1px solid #E5E7EB; margin-bottom: 14px; font-family: Inter, sans-serif; }',
      '.swp-feed-tabs::-webkit-scrollbar { display: none; }',
      '.swp-feed-tabs button { flex-shrink: 0; padding: 8px 14px; border: 1.5px solid #E5E7EB; background: #fff; border-radius: 999px; font-size: 0.85rem; font-weight: 600; color: #555; cursor: pointer; transition: all 0.15s; font-family: inherit; }',
      '.swp-feed-tabs button.active { border-color: #09B1BA; background: #E6F7F8; color: #078A91; }',
      '.swp-feed-tabs button:hover { border-color: #09B1BA; }',
      '.swp-geo-hint { margin: 6px 0 10px; padding: 8px 12px; background: #FEF3C7; color: #92400E; border-radius: 10px; font-size: 0.82rem; }',
      '.swp-distance-badge { position: absolute; top: 8px; left: 8px; background: rgba(9,177,186,0.9); color: #fff; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 999px; z-index: 2; }'
    ].join('\n');
    document.head.appendChild(s);
  }

  let activeTab = 'latest';
  let geo = null; // { lat, lng } once resolved
  const listeners = [];

  function renderTabs(container) {
    injectStyle();
    const el = (typeof container === 'string') ? document.querySelector(container) : container;
    if (!el) return;
    el.classList.add('swp-feed-tabs');
    el.innerHTML = TABS.map(function (t) {
      return '<button data-tab="' + t.key + '" class="' + (t.key === activeTab ? 'active' : '') + '">' +
               t.icon + ' ' + tr(t.i18n, t.label) +
             '</button>';
    }).join('');
    Array.prototype.forEach.call(el.querySelectorAll('button'), function (btn) {
      btn.addEventListener('click', function () {
        setActive(btn.getAttribute('data-tab'), el);
      });
    });
  }

  function setActive(key, container) {
    activeTab = key;
    if (container) {
      Array.prototype.forEach.call(container.querySelectorAll('button'), function (b) {
        b.classList.toggle('active', b.getAttribute('data-tab') === key);
      });
    }
    if (key === 'around') requestGeo();
    listeners.forEach(function (fn) { try { fn({ tab: key, geo: geo }); } catch (e) {} });
  }

  function onChange(fn) { if (typeof fn === 'function') listeners.push(fn); }
  function getActive() { return activeTab; }

  function requestGeo() {
    if (geo) return Promise.resolve(geo);
    return new Promise(function (resolve) {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(function (pos) {
        geo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        resolve(geo);
        listeners.forEach(function (fn) { try { fn({ tab: activeTab, geo: geo }); } catch (e) {} });
      }, function () {
        if (window.Toast) Toast.warning(tr('geo_denied', 'Location blocked — showing emirate-wide results.'));
        resolve(null);
      }, { timeout: 4000, enableHighAccuracy: false });
    });
  }

  function haversineKm(a, b) {
    if (!a || !b || a.lat == null || b.lat == null) return null;
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180;
    const x = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLng/2) * Math.sin(dLng/2) * Math.cos(la1) * Math.cos(la2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  /**
   * Filter + sort a list of items according to the active tab.
   * Each item should expose lat/lng (or location_lat/location_lng).
   */
  function applyFilter(items) {
    const list = (items || []).slice();
    const now = Date.now();
    switch (activeTab) {
      case 'trending':
        return list.sort(function (a, b) {
          const af = (a.favorites_count || 0) * 3 + (a.views_count || 0);
          const bf = (b.favorites_count || 0) * 3 + (b.views_count || 0);
          return bf - af;
        }).slice(0, 60);
      case 'around':
        if (!geo) return list;
        const MAX_KM = 5;
        return list.map(function (it) {
          const lat = it.location_lat != null ? it.location_lat : it.lat;
          const lng = it.location_lng != null ? it.location_lng : it.lng;
          const km = haversineKm(geo, { lat: lat, lng: lng });
          return { ...it, _distance_km: km };
        }).filter(function (it) { return it._distance_km != null && it._distance_km <= MAX_KM; })
          .sort(function (a, b) { return a._distance_km - b._distance_km; });
      case 'foryou':
        // Rough personalised feed: Pro items > boosted > rest.
        return list.sort(function (a, b) {
          const aS = (a.is_pro ? 10 : 0) + (a.is_boosted ? 5 : 0) + (a.favorites_count || 0);
          const bS = (b.is_pro ? 10 : 0) + (b.is_boosted ? 5 : 0) + (b.favorites_count || 0);
          return bS - aS;
        });
      case 'latest':
      default:
        return list.sort(function (a, b) {
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });
    }
  }

  window.SwappoFeedTabs = {
    render: renderTabs,
    onChange: onChange,
    getActive: getActive,
    applyFilter: applyFilter,
    haversineKm: haversineKm,
    requestGeo: requestGeo
  };
})();
