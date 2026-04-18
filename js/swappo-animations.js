/**
 * swappo-animations.js
 * Shared animation logic for all Swappo pages:
 * - Scroll reveal (fade-in on scroll)
 * - Animated counters
 * - Fallback: force reveal after 2s if IntersectionObserver doesn't trigger
 */

(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', function() {

    // ── Scroll Reveal ──
    var revealEls = document.querySelectorAll('.reveal');
    if (revealEls.length > 0) {
      if ('IntersectionObserver' in window) {
        var revealObserver = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
            }
          });
        }, { threshold: 0.08 });

        revealEls.forEach(function(el) {
          revealObserver.observe(el);
        });
      }

      // Fallback: force all reveals visible after 2.5s
      // Handles cases where IntersectionObserver doesn't trigger (e.g. already in viewport)
      setTimeout(function() {
        revealEls.forEach(function(el) {
          if (!el.classList.contains('visible')) {
            el.classList.add('visible');
          }
        });
      }, 2500);
    }

    // ── Animated Counters ──
    // Supports: data-target (number), data-suffix, data-prefix
    //           data-format="M" → 2700000 → "2.7M"
    //           data-format="percent" → renders <span> for % suffix
    function formatCounter(value, format, prefix, suffix) {
      if (format === 'M') {
        // Format as "2.7M" — divide by 1M, 1 decimal
        var m = value / 1000000;
        return prefix + (m >= 10 ? Math.round(m) : m.toFixed(1)) + 'M' + suffix;
      }
      if (format === 'percent') {
        return prefix + Math.round(value) + '<span style="font-size:0.7em;">%</span>' + suffix;
      }
      return prefix + Math.floor(value).toLocaleString() + suffix;
    }

    function animateCounter(el) {
      if (el.dataset.counterDone === 'true') return;
      el.dataset.counterDone = 'true';

      var target = parseFloat(el.getAttribute('data-target'));
      var suffix = el.getAttribute('data-suffix') || '';
      var prefix = el.getAttribute('data-prefix') || '';
      var format = el.getAttribute('data-format') || '';
      if (isNaN(target)) return;

      var duration = 1800;
      var startTime = null;
      var completed = false;

      function setValue(value) {
        if (format) {
          el.innerHTML = formatCounter(value, format, prefix, suffix);
        } else {
          el.textContent = formatCounter(value, format, prefix, suffix);
        }
      }

      function finish() {
        if (completed) return;
        completed = true;
        // Re-read data-target in case it was updated after init
        // (e.g. by live-stats.js fetching real values from Supabase).
        var latest = parseFloat(el.getAttribute('data-target'));
        var endValue = isNaN(latest) ? target : latest;
        setValue(endValue);
        el.dataset.counterValue = endValue;
      }

      function step(ts) {
        if (completed) return;
        if (!startTime) startTime = ts;
        var progress = Math.min((ts - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        var current = eased * target;
        setValue(current);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          finish();
        }
      }
      requestAnimationFrame(step);

      // Hard fallback: if requestAnimationFrame is throttled (e.g. background
      // tab, headless browser, mobile background), force the final value
      // after 2.2s so the counter never gets stuck mid-animation.
      setTimeout(finish, 2200);
    }

    var counters = document.querySelectorAll('[data-target]');
    if (counters.length > 0) {
      // Pass 1: Immediately animate counters that are in the navbar/sticky
      // areas (eco ticker) — they are always visible at page load.
      // We classify them as "always visible" if they're inside an
      // element with class "eco-ticker", or if they're near the top of
      // the page (< 200px from top).
      counters.forEach(function(c) {
        var inEcoTicker = !!c.closest('.eco-ticker');
        var rect = c.getBoundingClientRect();
        var nearTop = rect.top < 200;
        if (inEcoTicker || nearTop) {
          animateCounter(c);
        }
      });

      // Pass 2: For all other counters, use IntersectionObserver to
      // animate them when they scroll into view.
      if ('IntersectionObserver' in window) {
        var counterObserver = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            if (entry.isIntersecting) {
              animateCounter(entry.target);
              counterObserver.unobserve(entry.target);
            }
          });
        }, { threshold: 0, rootMargin: '0px 0px -10% 0px' });

        counters.forEach(function(c) {
          if (c.dataset.counterDone !== 'true') counterObserver.observe(c);
        });
      }

      // Final safety: animate all counters after 2.5s no matter what
      setTimeout(function() {
        counters.forEach(function(c) {
          if (c.dataset.counterDone !== 'true') animateCounter(c);
        });
      }, 2500);
    }

    // ── Toggle Pills (Monthly/Annual) ──
    var toggleContainers = document.querySelectorAll('.toggle-pills, .pricing-toggle');
    toggleContainers.forEach(function(container) {
      var btns = container.querySelectorAll('button');
      btns.forEach(function(btn) {
        btn.addEventListener('click', function() {
          btns.forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
        });
      });
    });

    // ── Eco Ticker ──
    var ticker = document.getElementById('ecoTicker');
    if (ticker) {
      // Close button
      var closeBtn = document.getElementById('ecoTickerClose');
      if (closeBtn) {
        closeBtn.addEventListener('click', function() {
          ticker.classList.add('hidden');
          try { sessionStorage.setItem('ecoTickerClosed', 'true'); } catch(e) {}
        });
        try {
          if (sessionStorage.getItem('ecoTickerClosed') === 'true') {
            ticker.classList.add('hidden');
          }
        } catch(e) {}
      }

      // Live stats updates are handled by js/live-stats.js
      // (real data fetched from Supabase RPC get_live_stats).
    }

    // ── Floating Recycle Hub button — DISABLED for now (kept in code for reactivation) ──
    /*
    (function() {
      var path = location.pathname || '';
      if (path.indexOf('recycle.html') !== -1 || path.indexOf('login.html') !== -1) return;
      if (document.querySelector('.recycle-hub-btn')) return;
      var href = path.indexOf('/pages/') !== -1 ? 'recycle.html' : 'pages/recycle.html';
      var btn = document.createElement('a');
      btn.className = 'recycle-hub-btn';
      btn.href = href;
      btn.setAttribute('aria-label', 'Open Recycle Hub');
      btn.innerHTML = '<i class="fas fa-recycle"></i> <span class="recycle-hub-btn-label">Recycle Hub</span>';
      document.body.appendChild(btn);
    })();
    */


    // ── Reveal safety net — force-show all .reveal after 1.5s ──
    setTimeout(function() {
      document.querySelectorAll('.reveal').forEach(function(el) {
        if (!el.classList.contains('visible')) {
          el.classList.add('visible');
        }
      });
    }, 1500);

  });
})();
