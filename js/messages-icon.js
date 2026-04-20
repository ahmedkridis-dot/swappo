/* ============================================
   Swappo — Messages icon (navbar)
   Populates a direct link to SwapChat with an unread-count badge.
   The placeholder lives in each page's HTML so the icon paints in
   final shape on the first frame; this script only fills the badge
   and keeps it in sync via realtime.
   Legacy pages without a placeholder still work — we fall back to
   injecting the node into .navbar-actions.
   ============================================ */
(function () {
  if (window.__SwappoMsgLink) return;
  window.__SwappoMsgLink = true;

  var ID = 'swp-msg-link';
  var PAGE = (location.pathname || '').split('/').pop();

  function tr(key, fallback) {
    return (typeof t === 'function') ? t(key) : (fallback || key);
  }

  function placeAfterBell(nav, node) {
    var bell = nav.querySelector('#swp-bell-root');
    if (bell) {
      if (bell.nextSibling) nav.insertBefore(node, bell.nextSibling);
      else nav.appendChild(node);
    } else {
      nav.insertBefore(node, nav.firstChild);
    }
  }

  function createFallbackNode() {
    var inPages = location.pathname.indexOf('/pages/') === 0;
    var href = inPages ? 'chat.html' : 'pages/chat.html';
    var a = document.createElement('a');
    a.id = ID;
    a.className = 'swp-msg-link';
    a.href = href;
    var label = tr('msg_icon_aria', 'Messages');
    a.setAttribute('aria-label', label);
    a.setAttribute('title', label);
    a.setAttribute('data-i18n-aria-label', 'msg_icon_aria');
    a.setAttribute('data-i18n-title', 'msg_icon_aria');
    a.innerHTML =
      '<i class="fas fa-comment-dots" aria-hidden="true"></i>' +
      '<span class="swp-msg-badge" aria-hidden="true">0</span>';
    return a;
  }

  function mount() {
    if (PAGE === 'login.html' || PAGE === 'reset-password.html' || PAGE === 'chat.html') return;
    // Placeholder already in HTML → nothing to do.
    if (document.getElementById(ID)) return;
    // Fallback: legacy pages without the placeholder.
    var nav = document.querySelector('.navbar-actions');
    if (!nav) return;
    placeAfterBell(nav, createFallbackNode());
  }

  var state = { userId: null, sub: null, convIds: [] };

  async function fetchUnread(userId) {
    if (!window.db || !userId) return 0;
    try {
      var convRes = await window.db.from('conversations').select('id')
        .or('user1_id.eq.' + userId + ',user2_id.eq.' + userId);
      if (convRes.error) return 0;
      state.convIds = (convRes.data || []).map(function (c) { return c.id; });
      if (!state.convIds.length) return 0;
      var msgRes = await window.db.from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', state.convIds)
        .neq('sender_id', userId)
        .eq('read_by_other', false);
      return msgRes.count || 0;
    } catch (e) { return 0; }
  }

  async function refreshBadge() {
    var link = document.getElementById(ID);
    if (!link) return;
    var count = await fetchUnread(state.userId);
    var badge = link.querySelector('.swp-msg-badge');
    if (!badge) return;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.classList.toggle('visible', count > 0);
    // Persist for fast paint on next cold load.
    if (state.userId && window.SwappoCache) {
      window.SwappoCache.set('unread_msg_' + state.userId, { count: count });
    }
  }

  function subscribeRealtime() {
    if (!window.db || !state.userId || state.sub) return;
    try {
      state.sub = window.db.channel('msg-icon-' + state.userId)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          function (payload) {
            var row = payload && payload.new;
            if (!row) return;
            // Only care about messages in one of the current user's conversations,
            // authored by the other party.
            if (row.sender_id === state.userId) return;
            if (state.convIds.indexOf(row.conversation_id) === -1) { refreshBadge(); return; }
            refreshBadge();
          })
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages' },
          function () { refreshBadge(); })
        .subscribe();
    } catch (err) {
      console.warn('[msg-icon.subscribe]', err);
    }
  }

  async function activateForUser(user) {
    var link = document.getElementById(ID);
    if (!link) return;
    if (!user) { link.style.display = 'none'; return; }
    link.style.display = '';
    state.userId = user.id;
    await refreshBadge();
    subscribeRealtime();
  }

  function fastPaintBadge() {
    // Synchronous path: read last-known unread count from localStorage so
    // the badge paints on the first frame instead of after the SDK's
    // session restoration + conversations round-trip.
    try {
      var fastUser = (window.SwappoAuth && window.SwappoAuth.getFastUser)
        ? window.SwappoAuth.getFastUser() : null;
      if (!fastUser) return null;
      state.userId = fastUser.id;
      var cached = window.SwappoCache ? window.SwappoCache.get('unread_msg_' + fastUser.id) : null;
      var link = document.getElementById(ID);
      if (link && cached && cached.count != null) {
        var badge = link.querySelector('.swp-msg-badge');
        if (badge) {
          badge.textContent = cached.count > 99 ? '99+' : String(cached.count);
          badge.classList.toggle('visible', cached.count > 0);
        }
      }
      return fastUser;
    } catch (e) { return null; }
  }

  function init() {
    mount();
    fastPaintBadge();

    (async function () {
      if (!window.db) return;
      try {
        if (window.SwappoAuth && window.SwappoAuth.whenReady) {
          await window.SwappoAuth.whenReady();
        }
        var res = await Promise.race([
          window.db.auth.getSession(),
          new Promise(function (r) { setTimeout(function () { r({ data: { session: null } }); }, 1500); })
        ]);
        var user = res && res.data && res.data.session ? res.data.session.user : null;
        await activateForUser(user);
      } catch (e) {}
    })();

    if (window.db && window.db.auth && window.db.auth.onAuthStateChange) {
      window.db.auth.onAuthStateChange(function (_event, session) {
        activateForUser(session ? session.user : null);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 50);
  }
})();
