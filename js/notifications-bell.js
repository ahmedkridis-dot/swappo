/* ============================================
   Swappo — Global Notifications Bell
   Injects a bell + dropdown into the navbar of every page.
   Reads from Supabase `notifications` table (fallback: empty).
   Realtime subscription to unread count.
   Requires: supabase.js (exposes window.db), i18n.js optional, toast.js optional.
   ============================================ */
(function () {
  if (window.__SwappoBellLoaded) return;
  window.__SwappoBellLoaded = true;

  var BELL_ID = 'swp-bell-root';
  var DROPDOWN_ID = 'swp-bell-dropdown';
  var PAGE_PATH = (location.pathname || '').split('/').pop();

  function tr(key, fallback) {
    return (typeof t === 'function') ? t(key) : (fallback || key);
  }

  function injectStyles() {
    if (document.getElementById('swp-bell-style')) return;
    var style = document.createElement('style');
    style.id = 'swp-bell-style';
    style.textContent = [
      '.swp-bell { position: relative; display: inline-flex; align-items: center; margin: 0 6px; }',
      '.swp-bell button.swp-bell-btn { background: transparent; border: 1px solid transparent; border-radius: 10px; padding: 8px 10px; font-size: 18px; cursor: pointer; color: #171717; position: relative; line-height: 1; transition: background 0.15s, border-color 0.15s; }',
      '.swp-bell button.swp-bell-btn:hover { background: #F3F4F6; border-color: #EBEBEB; }',
      '.swp-bell .swp-bell-badge { position: absolute; top: 2px; right: 2px; background: #DC2626; color: #fff; font-size: 10px; font-weight: 700; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; display: none; align-items: center; justify-content: center; font-family: Inter, sans-serif; }',
      '.swp-bell .swp-bell-badge.visible { display: inline-flex; }',
      '.swp-bell-dropdown { position: absolute; top: calc(100% + 8px); right: 0; width: min(360px, 92vw); max-height: 440px; overflow-y: auto; background: #fff; border: 1px solid #EBEBEB; border-radius: 14px; box-shadow: 0 12px 32px rgba(0,0,0,0.15); padding: 8px; z-index: 9000; display: none; }',
      '.swp-bell-dropdown.open { display: block; animation: swpBellFade 0.18s ease; }',
      '@keyframes swpBellFade { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }',
      '.swp-bell-dropdown .swp-notif-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px 10px; border-bottom: 1px solid #F3F4F6; font-weight: 700; font-size: 0.9rem; color: #171717; }',
      '.swp-bell-dropdown .swp-notif-header a { color: #09B1BA; font-size: 0.8rem; font-weight: 600; text-decoration: none; cursor: pointer; }',
      '.swp-bell-dropdown .swp-notif-empty { padding: 30px 16px; text-align: center; color: #999; font-size: 0.9rem; }',
      '.swp-bell-dropdown .swp-notif-item { display: flex; gap: 10px; padding: 10px; border-radius: 10px; cursor: pointer; transition: background 0.15s; align-items: flex-start; }',
      '.swp-bell-dropdown .swp-notif-item:hover { background: #F3F4F6; }',
      '.swp-bell-dropdown .swp-notif-item.unread { background: #E6F7F8; }',
      '.swp-bell-dropdown .swp-notif-icon { width: 32px; height: 32px; border-radius: 10px; background: #09B1BA; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }',
      '.swp-bell-dropdown .swp-notif-body { flex: 1; min-width: 0; }',
      '.swp-bell-dropdown .swp-notif-title { font-size: 0.88rem; font-weight: 600; color: #171717; margin-bottom: 2px; line-height: 1.3; }',
      '.swp-bell-dropdown .swp-notif-msg { font-size: 0.82rem; color: #555; line-height: 1.3; }',
      '.swp-bell-dropdown .swp-notif-time { font-size: 0.75rem; color: #999; margin-top: 3px; }',
      '@media (max-width: 480px) { .swp-bell-dropdown { position: fixed; top: 64px; right: 8px; left: 8px; width: auto; max-height: 70vh; } }'
    ].join('\n');
    document.head.appendChild(style);
  }

  function findNavbarMount() {
    var mount = document.querySelector('.navbar-actions');
    if (mount) return mount;
    mount = document.querySelector('.navbar-inner');
    return mount;
  }

  function buildBellDOM() {
    var wrap = document.createElement('div');
    wrap.className = 'swp-bell';
    wrap.id = BELL_ID;
    wrap.innerHTML =
      '<button class="swp-bell-btn" type="button" aria-label="' + tr('notif_bell_aria', 'Notifications') + '">' +
        '<i class="fas fa-bell"></i>' +
        '<span class="swp-bell-badge" aria-hidden="true">0</span>' +
      '</button>' +
      '<div class="swp-bell-dropdown" id="' + DROPDOWN_ID + '" role="menu">' +
        '<div class="swp-notif-header">' +
          '<span>' + tr('notif_bell_title', 'Notifications') + '</span>' +
          '<a data-mark-read>' + tr('notif_bell_mark_read', 'Mark all read') + '</a>' +
        '</div>' +
        '<div class="swp-notif-body-list">' +
          '<div class="swp-notif-empty">' + tr('notif_bell_empty', 'No notifications yet') + '</div>' +
        '</div>' +
      '</div>';
    return wrap;
  }

  function timeAgo(iso) {
    if (!iso) return '';
    var diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return tr('time_just_now', 'just now');
    if (diff < 3600) return Math.floor(diff / 60) + ' ' + tr('time_min_ago', 'min ago');
    if (diff < 86400) return Math.floor(diff / 3600) + ' ' + tr('time_hr_ago', 'h ago');
    return Math.floor(diff / 86400) + ' ' + tr('time_day_ago', 'd ago');
  }

  function iconFor(type) {
    var map = {
      offer: 'fa-handshake', swap: 'fa-sync', chat: 'fa-comment',
      badge: 'fa-trophy', system: 'fa-info-circle', gift: 'fa-gift',
      payment: 'fa-money-bill', boost: 'fa-rocket'
    };
    return map[type] || 'fa-bell';
  }

  /** Fallback deep link used when a notification row has no `url`. Keyed
   *  off type (legacy) or kind — keeps old rows routable. */
  function fallbackUrlForKind(kind, row) {
    var base = (location.pathname.indexOf('/pages/') === 0) ? '' : '/pages/';
    var payload = (row && row.payload) || {};
    switch (kind) {
      case 'new_message':
      case 'chat':
        var cid = payload.conversation_id;
        return base + 'chat.html' + (cid ? ('?conv=' + cid) : '');
      case 'swap_accepted':
        var cid2 = payload.conversation_id;
        return base + 'chat.html' + (cid2 ? ('?conv=' + cid2) : '');
      case 'swap_proposed':
      case 'offer_received':
      case 'offer':
      case 'gift_claimed':
      case 'gift':
      case 'counter_offer':
        return base + 'profile.html?tab=swap-dashboard&sub=received';
      case 'swap_declined':
      case 'swap':
        return base + 'profile.html?tab=swap-dashboard&sub=history';
      case 'badge_earned':
      case 'badge':
        return base + 'profile.html#badges';
      case 'boost_expiring':
      case 'boost':
        return base + 'profile.html?tab=my-items';
      default:
        return base + 'profile.html';
    }
  }

  var state = { notifs: [], unread: 0, userId: null, sub: null };

  function render() {
    var dd = document.getElementById(DROPDOWN_ID);
    if (!dd) return;
    var list = dd.querySelector('.swp-notif-body-list');
    var badge = document.querySelector('#' + BELL_ID + ' .swp-bell-badge');
    if (badge) {
      badge.textContent = state.unread > 99 ? '99+' : String(state.unread);
      badge.classList.toggle('visible', state.unread > 0);
    }
    if (!state.notifs.length) {
      list.innerHTML = '<div class="swp-notif-empty">' + tr('notif_bell_empty', 'No notifications yet') + '</div>';
      return;
    }
    list.innerHTML = state.notifs.map(function (n) {
      var unreadCls = n.read_at ? '' : ' unread';
      var title = n.title || tr('notif_generic_title', 'Notification');
      var msg = n.message || n.body || '';
      var time = timeAgo(n.created_at);
      var icon = iconFor(n.type);
      var url = n.url || '';
      return '<div class="swp-notif-item' + unreadCls + '" data-id="' + n.id + '" data-url="' + url + '">' +
        '<div class="swp-notif-icon"><i class="fas ' + icon + '"></i></div>' +
        '<div class="swp-notif-body">' +
          '<div class="swp-notif-title"></div>' +
          '<div class="swp-notif-msg"></div>' +
          '<div class="swp-notif-time">' + time + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    // Fill titles/msgs safely via textContent to prevent injection.
    Array.prototype.forEach.call(list.querySelectorAll('.swp-notif-item'), function (el, i) {
      var n = state.notifs[i];
      el.querySelector('.swp-notif-title').textContent = n.title || tr('notif_generic_title', 'Notification');
      el.querySelector('.swp-notif-msg').textContent = n.message || n.body || '';
    });
  }

  function _normalizeNotif(row) {
    // Support both new (type/title/message/url/read_at) and legacy (kind/payload/is_read) shapes.
    var payload = row.payload || {};
    return {
      id: row.id,
      type: row.type || row.kind || 'system',
      title: row.title || payload.title || '',
      message: row.message || payload.message || payload.body || '',
      url: row.url || payload.url || '',
      read_at: row.read_at || (row.is_read ? (row.updated_at || row.created_at) : null),
      created_at: row.created_at
    };
  }

  async function loadNotifs() {
    if (!window.db || !state.userId) { render(); return; }
    try {
      var res = await window.db.from('notifications')
        .select('id,kind,type,title,message,url,payload,is_read,read_at,created_at')
        .eq('user_id', state.userId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (res.error) throw res.error;
      state.notifs = (res.data || []).map(_normalizeNotif);
      state.unread = state.notifs.filter(function (n) { return !n.read_at; }).length;
      render();
    } catch (err) {
      console.error('[bell.loadNotifs]', err);
      state.notifs = [];
      state.unread = 0;
      render();
    }
  }

  async function markAllRead() {
    if (!window.db || !state.userId) return;
    try {
      var now = new Date().toISOString();
      var res = await window.db.from('notifications')
        .update({ read_at: now, is_read: true })
        .eq('user_id', state.userId)
        .is('read_at', null);
      if (res.error) throw res.error;
      state.notifs.forEach(function (n) { if (!n.read_at) n.read_at = now; });
      state.unread = 0;
      render();
    } catch (err) {
      console.error('[bell.markAllRead]', err);
      if (window.Toast) Toast.error(tr('notif_mark_read_failed', 'Failed to mark notifications as read'));
    }
  }

  function subscribeRealtime() {
    if (!window.db || !state.userId || state.sub) return;
    try {
      state.sub = window.db.channel('notif-bell-' + state.userId)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + state.userId },
          function (payload) {
            var row = _normalizeNotif(payload.new || {});
            // Prepend + refresh dropdown
            state.notifs.unshift(row);
            state.notifs = state.notifs.slice(0, 10);
            state.unread = state.notifs.filter(function (n) { return !n.read_at; }).length;
            render();
            // Bell pulse animation
            var btn = document.querySelector('#' + BELL_ID + ' .swp-bell-btn');
            if (btn) { btn.classList.add('swp-bell-pulse'); setTimeout(function () { btn.classList.remove('swp-bell-pulse'); }, 1400); }
            // Pop-up toast (clickable → deep link)
            _showPopup(row);
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + state.userId },
          function () { loadNotifs(); }
        )
        .subscribe();
    } catch (err) {
      console.warn('[bell.subscribe] realtime unavailable', err);
    }
  }

  function _showPopup(n) {
    if (!n || !n.title) return;
    // Lazy-build a dedicated pop-up container (independent of Toast)
    var host = document.getElementById('swp-popup-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'swp-popup-host';
      host.style.cssText = 'position:fixed;top:76px;right:16px;z-index:9500;display:flex;flex-direction:column;gap:8px;max-width:360px;pointer-events:none;';
      document.body.appendChild(host);
    }
    var card = document.createElement('button');
    card.type = 'button';
    card.className = 'swp-popup-card';
    card.style.cssText = [
      'pointer-events:auto;background:#fff;border:1px solid #EBEBEB;border-left:4px solid #09B1BA;',
      'border-radius:14px;padding:12px 14px;display:flex;gap:10px;align-items:flex-start;text-align:left;',
      'box-shadow:0 12px 32px rgba(0,0,0,0.15);cursor:pointer;width:100%;max-width:360px;',
      'font-family:Inter,sans-serif;animation:swp-popup-in 0.25s ease-out;'
    ].join(' ');
    card.innerHTML =
      '<div style="width:32px;height:32px;flex-shrink:0;border-radius:10px;background:#09B1BA;color:#fff;display:flex;align-items:center;justify-content:center;"><i class="fas ' + iconFor(n.type) + '"></i></div>' +
      '<div style="flex:1;min-width:0;">' +
        '<div class="swp-popup-title" style="font-weight:700;font-size:0.9rem;color:#171717;"></div>' +
        '<div class="swp-popup-msg" style="font-size:0.82rem;color:#555;margin-top:2px;"></div>' +
      '</div>' +
      '<span style="font-size:18px;color:#9CA3AF;">×</span>';
    card.querySelector('.swp-popup-title').textContent = n.title;
    card.querySelector('.swp-popup-msg').textContent = n.message || '';
    card.addEventListener('click', function () {
      // Mark read then navigate
      if (n.id && window.db) {
        window.db.from('notifications').update({ read_at: new Date().toISOString(), is_read: true }).eq('id', n.id).then(function () {});
      }
      var target = n.url || fallbackUrlForKind(n.type || n.kind, n);
      if (target) window.location.href = target;
    });
    host.appendChild(card);
    setTimeout(function () {
      card.style.transition = 'transform 0.25s, opacity 0.25s';
      card.style.transform = 'translateX(110%)';
      card.style.opacity = '0';
      setTimeout(function () { card.remove(); }, 280);
    }, 6000);
    // Inject keyframes once
    if (!document.getElementById('swp-popup-keyframes')) {
      var st = document.createElement('style');
      st.id = 'swp-popup-keyframes';
      st.textContent = '@keyframes swp-popup-in{from{opacity:0;transform:translateX(110%)}to{opacity:1;transform:translateX(0)}}' +
                       '.swp-bell-pulse{animation:swp-bell-pulse 1.4s ease-in-out;}' +
                       '@keyframes swp-bell-pulse{0%,100%{transform:rotate(0)}10%{transform:rotate(-18deg)}20%,40%{transform:rotate(14deg)}30%{transform:rotate(-12deg)}50%,80%{transform:rotate(0)}}';
      document.head.appendChild(st);
    }
  }

  function bindEvents(root) {
    var btn = root.querySelector('.swp-bell-btn');
    var dd = root.querySelector('.swp-bell-dropdown');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = !dd.classList.contains('open');
      if (willOpen) loadNotifs();
      dd.classList.toggle('open');
    });
    document.addEventListener('click', function (e) {
      if (!root.contains(e.target)) dd.classList.remove('open');
    });
    dd.addEventListener('click', function (e) {
      var mark = e.target.closest('[data-mark-read]');
      if (mark) { e.preventDefault(); markAllRead(); return; }
      var item = e.target.closest('.swp-notif-item');
      if (!item) return;
      var id = item.getAttribute('data-id');
      var url = item.getAttribute('data-url');
      if (id && window.db) {
        var now = new Date().toISOString();
        window.db.from('notifications').update({ read_at: now, is_read: true }).eq('id', id)
          .then(function () { /* refresh on realtime */ });
      }
      if (!url) {
        // Older notifications were inserted without a url. Fall back
        // to a sensible deep link keyed by kind so the row still routes
        // to its context (instead of silently doing nothing).
        var row = state.notifs.find(function (n) { return n.id === id; }) || {};
        url = fallbackUrlForKind(row.type || row.kind, row);
      }
      if (url) { window.location.href = url; }
    });
  }

  async function init() {
    // Don't inject on auth pages where the navbar is minimal.
    if (PAGE_PATH === 'login.html' || PAGE_PATH === 'reset-password.html') return;

    var mount = findNavbarMount();
    if (!mount) return;
    if (document.getElementById(BELL_ID)) return; // already mounted

    injectStyles();
    var bellEl = buildBellDOM();
    // Insert BEFORE the last button (usually "Drop an Item") so it appears next to the profile avatar.
    mount.insertBefore(bellEl, mount.firstChild);
    bindEvents(bellEl);

    // Attach Supabase user (async) + realtime. Awaiting whenReady() lets
    // us use getSession() (local JWT read, no network) instead of
    // getUser() (server roundtrip) — saves ~300-600 ms on cold loads.
    try {
      if (!window.db) return;
      if (window.SwappoAuth && window.SwappoAuth.whenReady) {
        await window.SwappoAuth.whenReady();
      }
      var res = await window.db.auth.getSession();
      var user = res && res.data && res.data.session ? res.data.session.user : null;
      if (!user) return; // anonymous — no notifications
      state.userId = user.id;
      await loadNotifs();
      subscribeRealtime();
    } catch (err) {
      console.warn('[bell.init]', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Defer slightly so navbars injected post-load (mega-menu) are present.
    setTimeout(init, 50);
  }
})();
