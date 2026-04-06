/**
 * SWAPPO MODERN LAYER 2026
 * Trends: magnetic buttons, parallax cursor, smooth scroll,
 * stagger reveals, count-up on scroll, atomic micro-interactions.
 */

(function() {
  'use strict';

  // Respect user motion preferences
  var prefersReducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', function() {

    // ========================
    // 1. MAGNETIC BUTTONS
    // ========================
    if (!prefersReducedMotion) {
      var magneticTargets = document.querySelectorAll(
        '.btn-pill, .btn-primary, .surprise-me-btn, .auth-social-btn, .plan-cta, .pricing-cta'
      );
      magneticTargets.forEach(function(btn) {
        btn.addEventListener('mousemove', function(e) {
          var rect = btn.getBoundingClientRect();
          var x = e.clientX - rect.left - rect.width / 2;
          var y = e.clientY - rect.top - rect.height / 2;
          var strength = 0.25;
          btn.style.transform = 'translate(' + x * strength + 'px, ' + y * strength + 'px) scale(1.03)';
        });
        btn.addEventListener('mouseleave', function() {
          btn.style.transform = '';
        });
      });
    }

    // ========================
    // 2. PARALLAX HERO ELEMENTS
    // ========================
    if (!prefersReducedMotion) {
      var floatingItems = document.querySelectorAll('.hero-floating-item');
      var hero = document.querySelector('.hero-banner');
      if (hero && floatingItems.length) {
        hero.addEventListener('mousemove', function(e) {
          var rect = hero.getBoundingClientRect();
          var x = (e.clientX - rect.left) / rect.width - 0.5;
          var y = (e.clientY - rect.top) / rect.height - 0.5;

          floatingItems.forEach(function(item, i) {
            var depth = (i + 1) * 8;
            item.style.transform = 'translate(' + (x * depth) + 'px, ' + (y * depth) + 'px)';
          });
        });
        hero.addEventListener('mouseleave', function() {
          floatingItems.forEach(function(item) {
            item.style.transform = '';
          });
        });
      }
    }

    // ========================
    // 3. CARD TILT 3D EFFECT
    // ========================
    if (!prefersReducedMotion) {
      var tiltCards = document.querySelectorAll('.product-card, .plan-card, .step-card');
      tiltCards.forEach(function(card) {
        card.addEventListener('mousemove', function(e) {
          var rect = card.getBoundingClientRect();
          var x = (e.clientX - rect.left) / rect.width;
          var y = (e.clientY - rect.top) / rect.height;
          var tiltX = (y - 0.5) * 6;
          var tiltY = (x - 0.5) * -6;
          card.style.transform = 'perspective(1000px) rotateX(' + tiltX + 'deg) rotateY(' + tiltY + 'deg) translateY(-6px)';
        });
        card.addEventListener('mouseleave', function() {
          card.style.transform = '';
        });
      });
    }

    // ========================
    // 4. SMOOTH SCROLL ANCHOR LINKS
    // ========================
    document.querySelectorAll('a[href^="#"]').forEach(function(link) {
      link.addEventListener('click', function(e) {
        var href = link.getAttribute('href');
        if (href === '#' || href.length < 2) return;
        var target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
        }
      });
    });

    // ========================
    // 5. NAVBAR SHRINK ON SCROLL
    // ========================
    var navbar = document.querySelector('.navbar');
    if (navbar) {
      var lastScroll = 0;
      window.addEventListener('scroll', function() {
        var currentScroll = window.scrollY;
        if (currentScroll > 50) {
          navbar.classList.add('navbar-scrolled');
          navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
        } else {
          navbar.classList.remove('navbar-scrolled');
          navbar.style.boxShadow = '';
        }
        lastScroll = currentScroll;
      }, { passive: true });
    }

    // ========================
    // 6. ADD AMBIENT MESH TO MAJOR SECTIONS
    // ========================
    var sectionsToEnhance = document.querySelectorAll(
      '.categories-section, .pricing-section, .why-section, .testimonials-section, .swap-feed-section'
    );
    sectionsToEnhance.forEach(function(s) {
      if (!s.classList.contains('ambient-mesh')) s.classList.add('ambient-mesh');
    });

    // ========================
    // 7. RIPPLE EFFECT ON CLICK
    // ========================
    if (!prefersReducedMotion) {
      var rippleTargets = document.querySelectorAll('.btn-pill, .btn-primary, .auth-btn-primary, .pricing-cta');
      rippleTargets.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          var rect = btn.getBoundingClientRect();
          var ripple = document.createElement('span');
          var size = Math.max(rect.width, rect.height) * 2;
          ripple.style.cssText =
            'position:absolute;border-radius:50%;background:rgba(255,255,255,0.5);' +
            'width:' + size + 'px;height:' + size + 'px;' +
            'left:' + (e.clientX - rect.left - size / 2) + 'px;' +
            'top:' + (e.clientY - rect.top - size / 2) + 'px;' +
            'transform:scale(0);animation:rippleEffect 0.6s ease-out;pointer-events:none;';
          if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
          if (!btn.style.overflow) btn.style.overflow = 'hidden';
          btn.appendChild(ripple);
          setTimeout(function() { ripple.remove(); }, 600);
        });
      });
    }

    // ========================
    // 8. TYPING ANIMATION FOR HERO
    // ========================
    var heroTitle = document.querySelector('.hero-text h1');
    if (heroTitle && !heroTitle.dataset.typed && !prefersReducedMotion) {
      heroTitle.dataset.typed = 'true';
      heroTitle.style.opacity = '0';
      setTimeout(function() {
        heroTitle.style.transition = 'opacity 1s var(--ease-out-quart, ease)';
        heroTitle.style.opacity = '1';
      }, 100);
    }

    // ========================
    // 9. ENHANCED REVEAL OBSERVER
    // ========================
    if ('IntersectionObserver' in window) {
      var enhancedObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -50px 0px' });

      document.querySelectorAll('.reveal').forEach(function(el) {
        enhancedObserver.observe(el);
      });
    }
  });

  // Inject ripple keyframes
  if (!document.getElementById('modern-2026-keyframes')) {
    var style = document.createElement('style');
    style.id = 'modern-2026-keyframes';
    style.textContent =
      '@keyframes rippleEffect { to { transform: scale(2); opacity: 0; } }';
    document.head.appendChild(style);
  }
})();
