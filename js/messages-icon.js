/* ============================================
   Swappo — Messages icon (navbar)
   Injects a direct link to SwapChat with an unread-count badge.
   Realtime-updates the badge when new messages land or are read.
   Requires: supabase.js (window.db). Hidden for anonymous visitors.
   ============================================ */
(function () {
  if (window.__SwappoMsgLink) return;
  window.__SwappoMsgLink = true;

  var ID = 'swp-msg-link';
  var PAGE = (location.pathname || '').split('/').pop();

  function tr(key, fallback) {
    return (typeof t === 'function') ? t(key) : (fallback || key);
  }

  function injectStyle() {
    if (document.getElementById('swp-msg-style')) return;
    var s = document.createElement('style');
    s.id = 'swp-msg-style';
    s.textContent = [
      '.swp-msg-link { position: relative; display: inline-flex; align-items: center; justify-content: center; margin: 0 4px; padding: 8px 10px; border-radius: 10px; border: 1px solid transparent; color: #171717; font-size: 18px; line-height: 1; cursor: pointer; text-decoration: none; transition: background 0.15s, border-color 0.15s; }',
      '.swp-msg-link:hover { background: #F3F4F6; border-color: #EBEBEB; color: #171717; }',
      '.swp-msg-link .swp-msg-badge { position: absolute; top: 2px; right: 2px; background: #DC2626; color: #fff; font-size: 10px; font-weight: 700; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; display: none; align-items: center; justify-content: center; font-family: Inter, sans-serif; }',
      '.swp-msg-link .swp-msg-badge.visible { display: inline-flex; }'
    ].join('\n');
    document.head.appendChild(s);
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

  function mount() {
    if (PAGE === 'login.html' || PAGE === 'reset-password.html' || PAGE === 'chat.html') return;
    var nav = document.querySelector('.navbar-actions');
    if (!nav || document.getElementById(ID)) return;
    injectStyle();
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
    a.style.display = 'none'; // hidden until auth confirmed
    placeAfterBell(nav, a);
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

  function init() {
    mount();
    setTimeout(async function () {
      if (!window.db) return;
      try {
        var res = await Promise.race([
          window.db.auth.getSession(),
          new Promise(function (r) { setTimeout(function () { r({ data: { session: null } }); }, 1500); })
        ]);
        var user = res && res.data && res.data.session ? res.data.session.user : null;
        await activateForUser(user);
      } catch (e) {}
    }, 400);

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
