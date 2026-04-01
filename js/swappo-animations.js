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
    var counters = document.querySelectorAll('[data-target]');
    if (counters.length > 0 && 'IntersectionObserver' in window) {
      var counterObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            var el = entry.target;
            var target = parseInt(el.getAttribute('data-target'));
            var suffix = el.getAttribute('data-suffix') || '';
            var prefix = el.getAttribute('data-prefix') || '';
            if (isNaN(target)) return;

            var current = 0;
            var duration = 1500; // ms
            var steps = 60;
            var increment = target / steps;
            var stepTime = duration / steps;

            var timer = setInterval(function() {
              current += increment;
              if (current >= target) {
                current = target;
                clearInterval(timer);
              }
              el.textContent = prefix + Math.floor(current).toLocaleString() + suffix;
            }, stepTime);

            counterObserver.unobserve(el);
          }
        });
      }, { threshold: 0.3 });

      counters.forEach(function(c) {
        counterObserver.observe(c);
      });
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

  });
})();
