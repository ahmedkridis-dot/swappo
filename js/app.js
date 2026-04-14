/* ============================================
   Swappo — Main Application JS
   ============================================ */

// ---- GEOLOCATION (auto GPS like FB Marketplace) ----
// Persists across pages via localStorage so distance shows immediately
// on every product card (catalogue, giveaway, landing, etc.).

const LS_KEYS = {
  LAT: 'swappo_user_lat',
  LNG: 'swappo_user_lng',
  AREA: 'swappo_user_area',
  RADIUS: 'swappo_radius'
};

// Restore from localStorage immediately so any render() call sees them
let userLat = parseFloat(localStorage.getItem(LS_KEYS.LAT)) || null;
let userLng = parseFloat(localStorage.getItem(LS_KEYS.LNG)) || null;
let userArea = localStorage.getItem(LS_KEYS.AREA) || null;
let currentRadius = parseInt(localStorage.getItem(LS_KEYS.RADIUS), 10);
if (isNaN(currentRadius)) currentRadius = 5;

// Public namespace so other scripts (DemoItems.renderCard etc) can reach helpers
window.Swappo = window.Swappo || {};
Swappo.userLat = () => userLat;
Swappo.userLng = () => userLng;
Swappo.userArea = () => userArea;
Swappo.currentRadius = () => currentRadius;

document.addEventListener('DOMContentLoaded', () => {
  // If we already have cached coords, paint the location bar without waiting
  hydrateLocationBarFromCache();
  hydrateRadiusButtons();
  initGeolocation();
  initFavorites();
  initMobileMenu();
  // Apply saved radius filter on every page load (after a tick so cards render)
  setTimeout(() => { if (currentRadius > 0) filterProductsByDistance(currentRadius); }, 250);
});

function hydrateLocationBarFromCache() {
  const locationEl = document.getElementById('locationName');
  if (!locationEl) return;
  if (userArea) {
    locationEl.innerHTML = `<strong>${userArea}</strong>`;
  }
}

function hydrateRadiusButtons() {
  const btns = document.querySelectorAll('.radius-btn');
  if (!btns.length) return;
  btns.forEach(b => b.classList.remove('active'));
  btns.forEach(b => {
    const onclick = b.getAttribute('onclick') || '';
    const m = onclick.match(/setRadius\((\d+)/);
    if (m && parseInt(m[1], 10) === currentRadius) b.classList.add('active');
  });
}

function initGeolocation() {
  const locationEl = document.getElementById('locationName');

  if (!navigator.geolocation) {
    if (locationEl) locationEl.innerHTML = '<i class="fas fa-exclamation-circle" style="color:var(--warning);"></i> GPS not available';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    // Success — got GPS coords
    (position) => {
      userLat = position.coords.latitude;
      userLng = position.coords.longitude;
      localStorage.setItem(LS_KEYS.LAT, userLat);
      localStorage.setItem(LS_KEYS.LNG, userLng);

      // Reverse geocode using OpenStreetMap Nominatim (free, no API key)
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}&zoom=16&addressdetails=1`)
        .then(res => res.json())
        .then(data => {
          const addr = data.address || {};
          const area = addr.neighbourhood || addr.suburb || addr.city_district || addr.town || addr.city || 'Your area';
          const city = addr.city || addr.town || addr.state || '';
          const display = city && city !== area ? `${area}, ${city}` : area;

          userArea = display;
          localStorage.setItem(LS_KEYS.AREA, display);

          if (locationEl) {
            locationEl.innerHTML = `<strong>${area}</strong>${city && city !== area ? ', ' + city : ''}`;
          }
          // Re-flow distance on every visible product card
          Swappo.refreshCardDistances();
          // Re-apply current radius (now with real distances)
          if (currentRadius > 0) filterProductsByDistance(currentRadius);
        })
        .catch(() => {
          if (locationEl) locationEl.innerHTML = `<strong>${userLat.toFixed(2)}, ${userLng.toFixed(2)}</strong>`;
          Swappo.refreshCardDistances();
        });
    },
    // Error — GPS denied or failed
    (error) => {
      if (!locationEl) return;
      // If we have a cached area, keep it visible — don't replace with an error message
      if (userArea) return;
      let msg = '';
      switch(error.code) {
        case error.PERMISSION_DENIED: msg = 'Location access denied'; break;
        case error.POSITION_UNAVAILABLE: msg = 'Location unavailable'; break;
        case error.TIMEOUT: msg = 'Location timeout'; break;
        default: msg = 'Location error';
      }
      locationEl.innerHTML = `<i class="fas fa-map-marker-alt" style="color:var(--text-muted);"></i> ${msg} · <span class="location-change" onclick="retryLocation()">Try again</span>`;
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // cache for 5 min
    }
  );
}

function retryLocation() {
  const locationEl = document.getElementById('locationName');
  if (locationEl) {
    locationEl.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size:0.75rem;"></i> Detecting location...';
  }
  initGeolocation();
}

// Radius selector
function setRadius(km, btn) {
  currentRadius = km;
  localStorage.setItem(LS_KEYS.RADIUS, km);

  // Update active button
  document.querySelectorAll('.radius-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // Re-flow distances first then filter
  Swappo.refreshCardDistances();
  filterProductsByDistance(km);
}

function filterProductsByDistance(maxKm) {
  document.querySelectorAll('.product-card').forEach(card => {
    if (maxKm === 0) { card.style.display = ''; return; }

    const lat = parseFloat(card.getAttribute('data-lat'));
    const lng = parseFloat(card.getAttribute('data-lng'));

    // If we have user coords AND item coords → real distance check
    if (userLat && userLng && !isNaN(lat) && !isNaN(lng)) {
      const dist = calculateDistance(userLat, userLng, lat, lng);
      card.style.display = dist <= maxKm ? '' : 'none';
      return;
    }
    // Fallback: parse "X km" from .product-location text
    const locEl = card.querySelector('.product-location');
    if (!locEl) return;
    const match = locEl.textContent.match(/([\d.]+)\s*km/);
    if (match) {
      const dist = parseFloat(match[1]);
      card.style.display = dist <= maxKm ? '' : 'none';
    }
  });
}

// Re-render distance text on every visible card from current GPS
Swappo.refreshCardDistances = function() {
  document.querySelectorAll('.product-card').forEach(card => {
    const locEl = card.querySelector('.product-location');
    if (!locEl) return;
    const lat = parseFloat(card.getAttribute('data-lat'));
    const lng = parseFloat(card.getAttribute('data-lng'));
    const fallback = card.getAttribute('data-city') || '';
    let label = fallback;
    if (userLat && userLng && !isNaN(lat) && !isNaN(lng)) {
      const dist = calculateDistance(userLat, userLng, lat, lng);
      label = Swappo.formatDistance(dist);
    }
    locEl.innerHTML = '<i class="fas fa-map-marker-alt"></i> ' + label;
  });
};

Swappo.formatDistance = function(km) {
  if (km == null || isNaN(km)) return '';
  if (km < 1) return Math.round(km * 1000) + ' m';
  if (km < 10) return km.toFixed(1) + ' km';
  return Math.round(km) + ' km';
};

// Public helper for one-off uses (eg. product detail page)
Swappo.distanceTo = function(lat, lng) {
  if (!userLat || !userLng || !lat || !lng) return null;
  return calculateDistance(userLat, userLng, lat, lng);
};

function updateProductDistances() {
  Swappo.refreshCardDistances();
}

// Calculate distance between two GPS points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal
}


// ---- FAVORITES ----

function initFavorites() {
  document.querySelectorAll('.product-fav').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const icon = btn.querySelector('i');
      const countEl = btn.querySelector('.count');
      let count = parseInt(countEl?.textContent || '0');

      if (icon.classList.contains('far')) {
        icon.classList.remove('far');
        icon.classList.add('fas');
        icon.style.color = '#FF4B55';
        if (countEl) countEl.textContent = count + 1;
      } else {
        icon.classList.remove('fas');
        icon.classList.add('far');
        icon.style.color = '';
        if (countEl) countEl.textContent = Math.max(0, count - 1);
      }
    });
  });
}


// ---- SMOOTH SCROLL ----

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});


// ---- CATEGORY FILTER (catalogue page) ----

function filterBy(category, el) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');

  const cards = document.querySelectorAll('.product-card');
  cards.forEach(card => {
    const cats = card.getAttribute('data-category') || '';
    card.style.display = (category === 'all' || cats.includes(category)) ? '' : 'none';
  });
}


// ---- MOBILE HAMBURGER MENU ----

function initMobileMenu() {
  const toggle = document.querySelector('.navbar-toggle');
  if (!toggle) return;

  // Determine path prefix based on current page location
  const isInPages = window.location.pathname.includes('/pages/');
  const prefix = isInPages ? '../' : '';
  const pagesPrefix = isInPages ? '' : 'pages/';

  toggle.addEventListener('click', () => {
    openMobileMenu(prefix, pagesPrefix);
  });
}

function openMobileMenu(prefix, pagesPrefix) {
  // Create overlay if it doesn't exist
  let overlay = document.querySelector('.mobile-menu-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'mobile-menu-overlay';
    document.body.appendChild(overlay);
  }

  // Create drawer if it doesn't exist
  let drawer = document.querySelector('.mobile-menu');
  if (!drawer) {
    drawer = document.createElement('nav');
    drawer.className = 'mobile-menu';
    drawer.innerHTML = `
      <button class="mobile-menu-close" aria-label="Close menu">&times;</button>
      <div class="mobile-menu-logo">
        <a href="${prefix}index.html">
          <img src="assets/brand/swappo-logo-teal.png" alt="Swappo" width="32" height="32" style="vertical-align:middle;margin-right:6px;"> Swappo
        </a>
      </div>
      <ul class="mobile-menu-nav">
        <li><a href="${prefix}index.html"><i class="fas fa-home"></i> Home</a></li>
        <li><a href="${pagesPrefix}catalogue.html"><i class="fas fa-store"></i> Swap Market</a></li>
        <li><a href="${pagesPrefix}giveaway.html"><i class="fas fa-gift"></i> Gift Corner</a></li>
        <li><a href="${pagesPrefix}publier.html"><i class="fas fa-plus-circle"></i> Drop an Item</a></li>
        <li><a href="${pagesPrefix}chat.html"><i class="fas fa-comments"></i> SwapChat</a></li>
        <li><a href="${pagesPrefix}profile.html"><i class="fas fa-user"></i> My Swaps</a></li>
        <li><a href="${pagesPrefix}pricing.html"><i class="fas fa-tag"></i> Pricing</a></li>
      </ul>
      <div class="mobile-menu-footer">
        <a href="${pagesPrefix}login.html" class="btn btn-primary" style="width:100%;text-align:center;">Join the Swap</a>
      </div>
    `;
    document.body.appendChild(drawer);

    // Close button
    drawer.querySelector('.mobile-menu-close').addEventListener('click', () => {
      closeMobileMenu();
    });

    // Overlay click closes menu
    overlay.addEventListener('click', () => {
      closeMobileMenu();
    });

    // Escape key closes menu
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMobileMenu();
      }
    });
  }

  // Open
  requestAnimationFrame(() => {
    overlay.classList.add('is-open');
    drawer.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  });
}

function closeMobileMenu() {
  const overlay = document.querySelector('.mobile-menu-overlay');
  const drawer = document.querySelector('.mobile-menu');
  if (overlay) overlay.classList.remove('is-open');
  if (drawer) drawer.classList.remove('is-open');
  document.body.style.overflow = '';
}

// ─── PUBLISH GATE MODAL ─────────────────────────────────────────────────────
function checkPublishGate() {
  if (!window.DemoAuth || !DemoAuth.isLoggedIn()) return false;
  var user = DemoAuth.getCurrentUser();
  if (!user) return false;
  if (!window.DemoItems || !DemoItems.hasActiveItems) return false;
  return !DemoItems.hasActiveItems(user.id);
}

function showPublishGate() {
  if (document.getElementById('publish-gate-modal')) return;

  var overlay = document.createElement('div');
  overlay.id = 'publish-gate-modal';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';

  var pagesPrefix = window.location.pathname.includes('/pages/') ? '' : 'pages/';

  overlay.innerHTML = '<div style="background:white;border-radius:16px;padding:36px 28px;max-width:400px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.15);">' +
    '<div style="font-size:48px;margin-bottom:16px;">📦</div>' +
    '<h3 style="font-size:20px;font-weight:700;color:#171717;margin:0 0 10px;">Publish your first item to unlock swaps!</h3>' +
    '<p style="font-size:14px;color:#666;margin:0 0 24px;line-height:1.6;">Other swappers want to see what you have to offer. List at least one item to start exchanging.</p>' +
    '<a href="' + pagesPrefix + 'publier.html" style="display:block;background:#09B1BA;color:white;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;margin-bottom:12px;transition:background 0.2s;">Publish my first item</a>' +
    '<button onclick="this.closest(\'#publish-gate-modal\').remove();" style="background:none;border:none;color:#999;font-size:13px;cursor:pointer;padding:8px;">Maybe later</button>' +
  '</div>';

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}

window.checkPublishGate = checkPublishGate;
window.showPublishGate = showPublishGate;
