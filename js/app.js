/* ============================================
   Swappo — Main Application JS
   ============================================ */

// ---- GEOLOCATION (auto GPS like FB Marketplace) ----

let userLat = null;
let userLng = null;
let currentRadius = 5; // default 5km

document.addEventListener('DOMContentLoaded', () => {
  initGeolocation();
  initFavorites();
  initMobileMenu();
});

function initGeolocation() {
  const locationEl = document.getElementById('locationName');
  if (!locationEl) return;

  if (!navigator.geolocation) {
    locationEl.innerHTML = '<i class="fas fa-exclamation-circle" style="color:var(--warning);"></i> GPS not available';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    // Success — got GPS coords
    (position) => {
      userLat = position.coords.latitude;
      userLng = position.coords.longitude;

      // Reverse geocode using OpenStreetMap Nominatim (free, no API key)
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}&zoom=16&addressdetails=1`)
        .then(res => res.json())
        .then(data => {
          const addr = data.address;
          // Try to get neighborhood, suburb, or city
          const area = addr.neighbourhood || addr.suburb || addr.city_district || addr.town || addr.city || 'Your area';
          const city = addr.city || addr.town || addr.state || '';

          locationEl.innerHTML = `<strong>${area}</strong>${city && city !== area ? ', ' + city : ''}`;

          // Update distances on product cards based on real position
          updateProductDistances();
        })
        .catch(() => {
          locationEl.innerHTML = `<strong>${userLat.toFixed(2)}, ${userLng.toFixed(2)}</strong>`;
        });
    },
    // Error — GPS denied or failed
    (error) => {
      let msg = '';
      switch(error.code) {
        case error.PERMISSION_DENIED:
          msg = 'Location access denied';
          break;
        case error.POSITION_UNAVAILABLE:
          msg = 'Location unavailable';
          break;
        case error.TIMEOUT:
          msg = 'Location timeout';
          break;
        default:
          msg = 'Location error';
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

  // Update active button
  document.querySelectorAll('.radius-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Filter products by distance
  filterProductsByDistance(km);
}

function filterProductsByDistance(maxKm) {
  const cards = document.querySelectorAll('.product-card');
  cards.forEach(card => {
    const locEl = card.querySelector('.product-location');
    if (!locEl) return;

    if (maxKm === 0) {
      // "All UAE" — show everything
      card.style.display = '';
      return;
    }

    // Extract distance from text (e.g., "3.2 km — JBR")
    const match = locEl.textContent.match(/([\d.]+)\s*km/);
    if (match) {
      const dist = parseFloat(match[1]);
      card.style.display = dist <= maxKm ? '' : 'none';
    }
  });
}

// Simulated distances for prototype (in production, calculated from GPS coords)
function updateProductDistances() {
  // In production: calculate real distance between user coords and product coords
  // For prototype: distances are already hardcoded in HTML
  console.log('User position:', userLat, userLng);
}

// Calculate distance between two GPS points (Haversine formula)
// Ready for production use
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
          <i class="fas fa-handshake"></i> Swappo
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
