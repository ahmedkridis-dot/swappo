/* ============================================
   Swappo — Find a Truck navbar link (always-visible)
   Injects a compact link in every page's navbar-actions so users on any
   page can jump to the transport module. Not gated behind any "coming soon".
   ============================================ */
(function () {
  if (window.__SwappoTruckLinkLoaded) return;
  window.__SwappoTruckLinkLoaded = true;

  function tr(key, fallback) {
    return (typeof t === 'function') ? t(key) : (fallback || key);
  }

  function injectStyle() {
    if (document.getElementById('swp-truck-link-style')) return;
    const s = document.createElement('style');
    s.id = 'swp-truck-link-style';
    s.textContent = [
      '.swp-truck-link { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 10px; font-size: 0.82rem; font-weight: 700; color: #9F1239; text-decoration: none; border: 1px solid transparent; transition: background 0.15s, border-color 0.15s; font-family: Inter, sans-serif; white-space: nowrap; }',
      '.swp-truck-link:hover { background: #FDF2F8; border-color: #F9A8D4; }',
      '.swp-truck-link i { color: #DB2777; }',
      '@media (max-width: 560px) { .swp-truck-link span { display: none; } .swp-truck-link { padding: 6px 8px; } }'
    ].join('\n');
    document.head.appendChild(s);
  }

  function buildLink() {
    const a = document.createElement('a');
    a.className = 'swp-truck-link';
    a.id = 'swp-truck-link';
    const base = location.pathname.includes('/pages/') ? '' : 'pages/';
    a.href = base + 'transport.html';
    a.innerHTML = '<i class="fas fa-truck"></i> <span></span>';
    a.querySelector('span').textContent = tr('truck_nav_link', '🚛 Find a Truck').replace(/^🚛\s*/, '');
    return a;
  }

  function init() {
    const mount = document.querySelector('.navbar-actions');
    if (!mount) return;
    if (document.getElementById('swp-truck-link')) return;
    injectStyle();
    mount.insertBefore(buildLink(), mount.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 60);
  }
})();
