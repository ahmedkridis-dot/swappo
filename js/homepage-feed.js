/* ============================================
   Swappo — Homepage dynamic feed
   Replaces the fake "Happening Right Now" swap cards and "What our
   community says" testimonials with real rows from Supabase via the
   get_homepage_feed() RPC. Sections with no data are hidden.
   ============================================ */
(function () {
  'use strict';
  if (window.__SwappoHomeFeed) return;
  window.__SwappoHomeFeed = true;

  var AVATAR_COLORS = ['#10B981', '#09B1BA', '#8B5CF6', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#14B8A6'];

  function escapeHTML(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function safeImgUrl(u) {
    if (!u) return '';
    var s = String(u).trim();
    if (/^(https?:|data:image\/)/i.test(s)) return s;
    return '';
  }

  function initial(s) {
    if (!s) return '?';
    return String(s).replace(/^@/, '').charAt(0).toUpperCase() || '?';
  }

  function timeAgo(iso) {
    if (!iso) return '';
    var diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + ' h ago';
    return Math.floor(diff / 86400) + ' d ago';
  }

  function colorFor(seed) {
    var sum = 0;
    var s = String(seed || '');
    for (var i = 0; i < s.length; i++) sum = (sum + s.charCodeAt(i)) % AVATAR_COLORS.length;
    return AVATAR_COLORS[sum];
  }

  function renderAvatar(url, pseudo, bg) {
    var img = safeImgUrl(url);
    if (img) {
      return '<img src="' + escapeHTML(img) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" loading="lazy">';
    }
    return escapeHTML(initial(pseudo));
  }

  function verbFor(eventType) {
    if (eventType === 'gift') return '<i class="fas fa-gift" aria-hidden="true"></i>';
    if (eventType === 'purchase') return '<i class="fas fa-shopping-bag" aria-hidden="true"></i>';
    return '<i class="fas fa-exchange-alt" aria-hidden="true"></i>';
  }

  function renderSwapCard(s) {
    var proposerName = s.proposer_pseudo ? '@' + s.proposer_pseudo : '@anonymous';
    var receiverName = s.receiver_pseudo ? '@' + s.receiver_pseudo : '@anonymous';
    // Display the RECEIVER as the headline swapper (the one whose item drove the swap).
    var headlinePseudo = s.receiver_pseudo || s.proposer_pseudo || 'anonymous';
    var headlineName = '@' + headlinePseudo;
    var headlineAvatar = s.receiver_avatar || s.proposer_avatar;
    var bg = colorFor(headlinePseudo);

    var itemLeft = s.event_type === 'gift' ? s.receiver_item : s.proposer_item;
    var itemRight = s.event_type === 'gift' ? '' : s.receiver_item;

    return '<div class="swap-card card-hover">' +
      '<div class="swap-card-header">' +
        '<div class="swap-avatar" style="background:' + bg + ';overflow:hidden;">' +
          renderAvatar(headlineAvatar, headlinePseudo, bg) +
        '</div>' +
        '<div><div class="swap-user-name">' + escapeHTML(headlineName) + '</div>' +
          '<div class="swap-time">' + escapeHTML(timeAgo(s.created_at)) + '</div></div>' +
      '</div>' +
      '<div class="swap-items">' +
        '<span class="swap-item-name">' + escapeHTML(itemLeft || 'Item') + '</span>' +
        (itemRight ? '<span class="swap-arrow">' + verbFor(s.event_type) + '</span>' +
                     '<span class="swap-item-name">' + escapeHTML(itemRight) + '</span>'
                   : '<span class="swap-arrow">' + verbFor(s.event_type) + '</span>') +
      '</div>' +
    '</div>';
  }

  function renderTestimonial(t) {
    var pseudo = t.pseudo || 'swapper';
    var bg = colorFor(pseudo);
    var badge = t.is_pro || t.plan === 'pro' || t.plan === 'premium' ? 'Pro Member' : 'Member';
    var badgeCls = t.plan === 'premium' ? 'badge-premium' : (t.is_pro || t.plan === 'pro' ? 'badge-silver' : 'badge-bronze');
    var stars = '';
    var rating = Math.max(0, Math.min(5, Number(t.rating) || 5));
    for (var i = 0; i < rating; i++) stars += '\u2605';

    return '<div class="testimonial-card card-hover">' +
      '<div class="testimonial-header">' +
        '<div class="testimonial-avatar" style="background:' + bg + ';overflow:hidden;">' +
          renderAvatar(t.avatar, pseudo, bg) +
        '</div>' +
        '<div><div class="testimonial-name">@' + escapeHTML(pseudo) + '</div>' +
          '<div class="testimonial-badge ' + badgeCls + '">' + escapeHTML(badge) + '</div></div>' +
      '</div>' +
      '<div class="testimonial-stars">' + stars + '</div>' +
      '<p class="testimonial-text">' + escapeHTML(t.comment || '') + '</p>' +
    '</div>';
  }

  function findSection() {
    return document.querySelector('.swap-feed-section');
  }

  function apply(feed) {
    var section = findSection();
    if (!section) return;

    var swaps = Array.isArray(feed && feed.recent_swaps) ? feed.recent_swaps : [];
    var testimonials = Array.isArray(feed && feed.testimonials) ? feed.testimonials : [];

    var grid = section.querySelector('.swap-feed-grid');
    var tHeading = Array.prototype.find.call(section.querySelectorAll('h3'),
      function (el) { return el.getAttribute('data-i18n') === 'community_loves'; });
    var tGrid = section.querySelector('.testimonials-grid');

    // --- Recent swaps ---
    if (grid) {
      if (swaps.length) {
        grid.innerHTML = swaps.map(renderSwapCard).join('');
        grid.style.display = '';
      } else {
        grid.style.display = 'none';
      }
    }

    // --- Testimonials ---
    if (tGrid) {
      if (testimonials.length) {
        tGrid.innerHTML = testimonials.map(renderTestimonial).join('');
        tGrid.style.display = '';
        if (tHeading) tHeading.style.display = '';
      } else {
        tGrid.style.display = 'none';
        if (tHeading) tHeading.style.display = 'none';
      }
    }

    // Hide the entire section if both buckets are empty
    if (!swaps.length && !testimonials.length) {
      section.style.display = 'none';
    } else {
      section.style.display = '';
    }
  }

  async function fetchFeed() {
    if (!window.db || !window.db.rpc) return null;
    try {
      var res = await window.db.rpc('get_homepage_feed');
      if (res && res.error) {
        console.warn('[homepage-feed] rpc error', res.error.message);
        return null;
      }
      return res && res.data;
    } catch (e) {
      console.warn('[homepage-feed] fetch failed', e);
      return null;
    }
  }

  async function start() {
    if (!findSection()) return;
    (function waitForDb(attempts) {
      if (window.db && window.db.rpc) {
        fetchFeed().then(function (data) { if (data) apply(data); });
        return;
      }
      if (attempts > 0) setTimeout(function () { waitForDb(attempts - 1); }, 200);
    })(25);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
