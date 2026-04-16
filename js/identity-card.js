/* ============================================
   Swappo — Identity Card (anonymous-first)
   Render a compact user card used in offers, chat header, Deal Tracker,
   notification dropdown and anywhere else where we display another user.

   Anonymity rule: before both parties have accepted, we NEVER show the real
   name/avatar — only `Swapper#XXXX` + badge + rating + swaps count.
   ============================================ */
(function () {
  if (window.SwappoIdentityCard) return;

  const AVATAR_SIZE = 48;

  function tr(key, fallback) {
    return (typeof t === 'function') ? t(key) : (fallback || key);
  }

  function hashLabel(userId) {
    const clean = (userId || '').replace(/-/g, '').toUpperCase();
    return 'Swapper#' + (clean.slice(0, 4) || 'USER');
  }

  function tierEmoji(badge) {
    const map = {
      newcomer: '🌱', swapper: '⭐', active: '🔥', pro: '💎',
      elite: '🏆', legend: '👑'
    };
    return map[badge] || '⭐';
  }

  function injectStyles() {
    if (document.getElementById('swp-identity-style')) return;
    const style = document.createElement('style');
    style.id = 'swp-identity-style';
    style.textContent = [
      '.swp-identity { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 14px; background: #F8F9FA; border: 1px solid #EBEBEB; font-family: Inter, sans-serif; }',
      '.swp-identity.compact { padding: 6px 8px; border-radius: 10px; gap: 10px; background: transparent; border: none; }',
      '.swp-identity .swp-av { width: ' + AVATAR_SIZE + 'px; height: ' + AVATAR_SIZE + 'px; border-radius: 50%; background: #E5E7EB; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #9CA3AF; overflow: hidden; }',
      '.swp-identity .swp-av img { width: 100%; height: 100%; object-fit: cover; }',
      '.swp-identity .swp-info { flex: 1; min-width: 0; }',
      '.swp-identity .swp-line1 { font-size: 0.92rem; font-weight: 700; color: #171717; display: flex; align-items: center; gap: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
      '.swp-identity .swp-rating { color: #F59E0B; font-size: 0.85rem; font-weight: 600; flex-shrink: 0; }',
      '.swp-identity .swp-line2 { font-size: 0.78rem; color: #555; margin-top: 2px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }',
      '.swp-identity .swp-line2 .swp-chip { background: #E6F7F8; color: #078A91; padding: 2px 8px; border-radius: 999px; font-size: 0.72rem; font-weight: 600; }',
      '.swp-identity .swp-line3 { font-size: 0.72rem; color: #999; margin-top: 2px; }',
      '.swp-identity .swp-view { color: #09B1BA; font-size: 0.82rem; font-weight: 700; white-space: nowrap; flex-shrink: 0; text-decoration: none; background: transparent; border: 0; cursor: pointer; padding: 6px 8px; }',
      '.swp-identity .swp-view:hover { text-decoration: underline; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  async function fetchPublicProfile(userId) {
    if (!userId || !window.db) return null;
    try {
      const res = await window.db.from('users_public')
        .select('id,display_name,avatar,plan,is_pro,swap_count,badge,rating_avg,rating_count,created_at')
        .eq('id', userId).maybeSingle();
      if (res.error || !res.data) {
        // Fallback: read the raw users row if we are allowed.
        const raw = await window.db.from('users')
          .select('id,display_name,pseudo,avatar,plan,is_pro,swap_count,badge,rating_avg,rating_count,created_at')
          .eq('id', userId).maybeSingle();
        if (raw.error || !raw.data) return null;
        return {
          ...raw.data,
          display_name: raw.data.display_name || raw.data.pseudo || hashLabel(userId)
        };
      }
      return res.data;
    } catch (e) {
      console.warn('[identity-card.fetch]', e.message || e);
      return null;
    }
  }

  function fmtMemberSince(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return tr('identity_member_since', 'Member since') + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  /**
   * Render an identity card into `container`.
   * @param {HTMLElement|string} container Target element or selector.
   * @param {string} userId  User id to display.
   * @param {object} opts
   *   opts.isRevealed {boolean} true once both parties accepted — show real photo/name.
   *   opts.compact    {boolean} smaller, border-less layout.
   *   opts.showViewLink {boolean} default true, show "View →"
   *   opts.onClickView {function} optional override for the view-profile click.
   *   opts.profile    {object} pre-fetched users_public row (skips network fetch).
   */
  async function render(container, userId, opts) {
    opts = opts || {};
    injectStyles();
    const el = (typeof container === 'string') ? document.querySelector(container) : container;
    if (!el) return null;

    el.classList.add('swp-identity');
    if (opts.compact) el.classList.add('compact');
    el.innerHTML = '<div class="swp-av" aria-hidden="true">👤</div>' +
                   '<div class="swp-info">' +
                     '<div class="swp-line1"></div>' +
                     '<div class="swp-line2"></div>' +
                     '<div class="swp-line3"></div>' +
                   '</div>';
    if (opts.showViewLink !== false) {
      el.innerHTML += '<button class="swp-view" type="button">' + tr('identity_view_profile', 'View →') + '</button>';
    }

    const profile = opts.profile || await fetchPublicProfile(userId);
    const isRevealed = !!opts.isRevealed;

    // Avatar
    const av = el.querySelector('.swp-av');
    if (isRevealed && profile && profile.avatar) {
      av.innerHTML = '';
      if (/^https?:\/\//.test(profile.avatar)) {
        av.innerHTML = '<img src="' + profile.avatar + '" alt="">';
      } else {
        av.textContent = profile.avatar.slice(0, 2).toUpperCase();
        av.style.background = '#09B1BA';
        av.style.color = '#fff';
      }
    } else {
      av.textContent = '👤';
      av.style.background = '#E5E7EB';
      av.style.color = '#9CA3AF';
    }

    // Line 1 — name + rating
    const line1 = el.querySelector('.swp-line1');
    const displayName = isRevealed
      ? ((profile && profile.display_name) || hashLabel(userId))
      : hashLabel(userId);
    const rating = profile ? Number(profile.rating_avg || 0).toFixed(1) : '—';
    const nameSpan = document.createElement('span');
    nameSpan.textContent = displayName;
    const ratingSpan = document.createElement('span');
    ratingSpan.className = 'swp-rating';
    ratingSpan.textContent = '★ ' + rating;
    line1.appendChild(nameSpan);
    line1.appendChild(ratingSpan);

    // Line 2 — badge + swap count
    const line2 = el.querySelector('.swp-line2');
    const badge = profile ? (profile.badge || 'swapper') : 'swapper';
    const badgeChip = document.createElement('span');
    badgeChip.className = 'swp-chip';
    badgeChip.textContent = tierEmoji(badge) + ' ' + badge.charAt(0).toUpperCase() + badge.slice(1);
    line2.appendChild(badgeChip);
    if (isRevealed && profile && profile.is_pro) {
      const pro = document.createElement('span');
      pro.className = 'swp-chip';
      pro.style.background = '#FCE7F3';
      pro.style.color = '#BE185D';
      pro.textContent = '💎 Pro';
      line2.appendChild(pro);
    }
    const swaps = document.createElement('span');
    swaps.textContent = (profile ? (profile.swap_count || 0) : 0) + ' ' + tr('identity_swaps_count', 'swaps');
    line2.appendChild(swaps);

    // Line 3 — member since
    el.querySelector('.swp-line3').textContent = fmtMemberSince(profile && profile.created_at);

    // View link
    const viewBtn = el.querySelector('.swp-view');
    if (viewBtn) {
      viewBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof opts.onClickView === 'function') return opts.onClickView(userId);
        const base = (location.pathname.includes('/pages/') ? '' : 'pages/');
        window.location.href = base + 'profile-public.html?id=' + encodeURIComponent(userId);
      });
    }
    return { profile: profile, hashLabel: hashLabel(userId) };
  }

  window.SwappoIdentityCard = {
    render: render,
    hashLabel: hashLabel,
    fetchPublicProfile: fetchPublicProfile
  };
})();
