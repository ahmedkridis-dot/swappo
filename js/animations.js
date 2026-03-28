/* ============================================
   Swappo — Premium Animations Module
   Vanilla JS — No dependencies
   ============================================ */

const SwappoAnimations = {

  // ---- INIT: Wire everything on DOMContentLoaded ----
  init() {
    this.initScrollReveal();
    this.initStagger();
    this.initCounters();
    this.initParallax();
    this.initNavbarScroll();
    this.initHoverEffects();
  },

  // ---- SCROLL REVEAL ----
  // Usage: <div data-animate="fade-up" data-delay="200">
  initScrollReveal() {
    const elements = document.querySelectorAll('[data-animate]');
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = parseInt(entry.target.dataset.delay || 0);
          setTimeout(() => {
            entry.target.classList.add('is-visible');
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

    elements.forEach(el => observer.observe(el));
  },

  // ---- STAGGERED GRID ANIMATION ----
  // Usage: <div data-stagger-grid> children auto-stagger
  initStagger() {
    const grids = document.querySelectorAll('[data-stagger-grid]');
    if (!grids.length) return;

    grids.forEach(grid => {
      const children = Array.from(grid.children);

      // Set initial hidden state
      children.forEach(child => {
        child.style.opacity = '0';
        child.style.transform = 'translateY(24px)';
        child.style.transition = 'opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
      });

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            children.forEach((child, i) => {
              child.style.transitionDelay = `${i * 70}ms`;
              requestAnimationFrame(() => {
                child.style.opacity = '1';
                child.style.transform = 'translateY(0)';
              });
            });
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.05 });

      observer.observe(grid);
    });
  },

  // ---- ANIMATED COUNTERS ----
  // Usage: <span data-counter="1247">0</span>
  initCounters() {
    const counters = document.querySelectorAll('[data-counter]');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(el => observer.observe(el));
  },

  animateCounter(el) {
    const target = parseInt(el.dataset.counter);
    const duration = 1500;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.floor(eased * target).toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  },

  // ---- PARALLAX ----
  // Usage: <div data-parallax="0.3"> (speed factor)
  initParallax() {
    const elements = document.querySelectorAll('[data-parallax]');
    if (!elements.length) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          elements.forEach(el => {
            const speed = parseFloat(el.dataset.parallax) || 0.3;
            const rect = el.getBoundingClientRect();
            if (rect.bottom > 0 && rect.top < window.innerHeight) {
              el.style.transform = `translateY(${scrollY * speed * 0.2}px)`;
            }
          });
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  },

  // ---- NAVBAR SCROLL EFFECT ----
  initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    let lastCheck = 0;
    const onScroll = () => {
      const now = Date.now();
      if (now - lastCheck < 50) return; // throttle
      lastCheck = now;

      if (window.scrollY > 10) {
        navbar.classList.add('navbar--scrolled');
      } else {
        navbar.classList.remove('navbar--scrolled');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initial check
  },

  // ---- HOVER MICRO-INTERACTIONS ----
  initHoverEffects() {
    // Favorite heart pulse
    document.querySelectorAll('.product-fav').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        btn.classList.toggle('is-liked');
        if (btn.classList.contains('is-liked')) {
          btn.style.animation = 'none';
          btn.offsetHeight; // force reflow
          btn.style.animation = 'heartPulse 0.4s cubic-bezier(0.34,1.56,0.64,1)';
        }
      });
    });
  },

  // ---- TOAST NOTIFICATION SYSTEM ----
  toast(message, type = 'info', duration = 4000) {
    // Remove existing toast
    document.querySelector('.toast')?.remove();

    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      info: 'fa-info-circle',
      warning: 'fa-exclamation-triangle'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <i class="fas ${icons[type] || icons.info}"></i>
      <span>${message}</span>
      <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
    `;

    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add('toast--visible');
      });
    });

    setTimeout(() => {
      toast.classList.remove('toast--visible');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  },

  // ---- CONFETTI BURST (for giveaway claims) ----
  showConfetti(originElement) {
    const rect = originElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const colors = ['#09B1BA', '#FF4B55', '#FF8C00', '#17C653', '#FFB800', '#0DD3DE'];

    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('span');
      particle.className = 'confetti-particle';
      particle.style.left = cx + 'px';
      particle.style.top = cy + 'px';
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      particle.style.setProperty('--tx', (Math.random() - 0.5) * 300 + 'px');
      particle.style.setProperty('--ty', -(Math.random() * 250 + 50) + 'px');
      particle.style.setProperty('--tr', (Math.random() * 1080 - 540) + 'deg');
      particle.style.setProperty('--dur', (0.6 + Math.random() * 0.8) + 's');
      particle.style.width = (4 + Math.random() * 6) + 'px';
      particle.style.height = (4 + Math.random() * 6) + 'px';
      particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';

      document.body.appendChild(particle);
      setTimeout(() => particle.remove(), 1500);
    }
  },

  // ---- SKELETON LOADING ----
  showSkeletons(container, count = 6) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="skeleton-card">
          <div class="skeleton skeleton-img"></div>
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line-short"></div>
        </div>
      `;
    }
    container.innerHTML = html;
  },

  hideSkeletons(container) {
    container.querySelectorAll('.skeleton-card').forEach(s => s.remove());
  },

  // ---- SMOOTH NUMBER UPDATE ----
  animateValue(element, from, to, duration = 600) {
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.floor(from + (to - from) * eased);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
};

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  SwappoAnimations.init();
});
