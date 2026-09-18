/* ============================================
   Swappo — gift moments
   Three one-time panels around a Gift Corner claim (swaps.is_giveaway_claim):

     1. recipient, status 'accepted'  → "Your claim was accepted" + Open SwapChat
     2. recipient, status 'completed' → "Gift received" + share block (confetti)
     3. giver,     status 'completed' → "Gift given — thank you" + Give & Earn

   VOCABULARY RULE (UAE law on games of chance): a Swappo gift is never a
   game — the giver freely chooses who receives the item. Allowed words:
   received, gift received, claim accepted, the giver chose you, given,
   recipient. Nothing else, in any language, in any key or text.

   "Seen" lives in the database (migration 046: swaps.recipient_seen_*,
   swaps.giver_seen_completed_at, stamped by mark_gift_moment_seen), so a
   panel shows once per swap whatever the device. Triggered by a check on
   every page load + realtime on the member's swaps rows.

   API:  SwappoGiftMoments.beforeRating(swapId) → Promise (chat.html waits
           for it before opening the rating popup)
         SwappoGiftMoments.reopen(swapId)       → the "Gift received" panel
           again, without confetti (My Swaps → History → Share)
   ============================================ */
(function () {
  'use strict';
  if (window.SwappoGiftMoments) return;

  var SHORT_BASE = 'https://swappo.ae/i/';
  var SELECT = 'id,status,proposer_id,receiver_id,receiver_item_id,is_giveaway_claim,' +
    'recipient_seen_accepted_at,recipient_seen_completed_at,giver_seen_completed_at';
  var _uid = null;
  var _shown = {};      // swapId + ':' + kind → Promise (one panel per moment per page life)
  var _chain = Promise.resolve();   // panels never stack: one at a time
  var _base = (function () {
    var s = document.currentScript && document.currentScript.src;
    return s ? s.replace(/gift-moments\.js.*$/, '') : '/js/';
  })();

  function tr(key, fallback) {
    if (typeof window.t !== 'function') return fallback;
    var v = window.t(key);
    return (v && v !== key) ? v : fallback;
  }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function toast(msg, type) { if (window.Toast && Toast.show) Toast.show(msg, type || 'success'); }
  function onChatPage() { return /\/chat\.html$/.test(location.pathname); }
  function pagesPrefix() { return /\/pages\//.test(location.pathname) ? '' : 'pages/'; }

  function titleOf(item) {
    if (!item) return tr('gm_item_fallback', 'this item');
    if (window.SwappoItems && SwappoItems.itemTitle) { try { var s = SwappoItems.itemTitle(item); if (s) return s; } catch (e) {} }
    var brand = /^(other|n\/a)$/i.test(String(item.brand || '').trim()) ? '' : String(item.brand || '').trim();
    return (brand + ' ' + (item.model || '')).trim() || item.type || tr('gm_item_fallback', 'this item');
  }
  function photoOf(item) {
    var p = item && Array.isArray(item.photos) && item.photos[0];
    return (p && /^https?:\/\//.test(String(p))) ? String(p) : '';
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      try {
        var ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;';
        document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); ta.remove(); return ok;
      } catch (e2) { return false; }
    }
  }

  // ── Data ────────────────────────────────────────────────────
  async function fetchItem(itemId) {
    if (!itemId || !window.db) return null;
    try {
      var r = await window.db.from('items').select('id,brand,model,type,category,photos,is_giveaway').eq('id', itemId).maybeSingle();
      return (r && r.data) || null;
    } catch (e) { return null; }
  }
  async function fetchSwap(swapId) {
    if (!swapId || !window.db) return null;
    try {
      var r = await window.db.from('swaps').select(SELECT).eq('id', swapId).maybeSingle();
      return (r && r.data) || null;
    } catch (e) { return null; }
  }
  async function convIdOf(swapId) {
    try {
      var r = await window.db.from('conversations').select('id').eq('swap_id', swapId).limit(1);
      return (r && r.data && r.data[0] && r.data[0].id) || null;
    } catch (e) { return null; }
  }
  function markSeen(swapId, moment) {
    try {
      var p = window.db.rpc('mark_gift_moment_seen', { p_swap_id: swapId, p_moment: moment });
      if (p && p.then) p.then(function () {}, function () {});
    } catch (e) {}
  }
  async function giveEarn() {
    try {
      var r = await window.db.rpc('give_earn_status');
      return (r && !r.error && r.data) ? r.data : null;
    } catch (e) { return null; }
  }
  function ensureShare() {
    if (window.SwappoShare) return Promise.resolve(true);
    return new Promise(function (resolve) {
      var sc = document.createElement('script');
      sc.src = _base + 'share-sheet.js';
      sc.onload = function () { resolve(!!window.SwappoShare); };
      sc.onerror = function () { resolve(false); };
      document.head.appendChild(sc);
    });
  }
  async function share(itemId, item, text) {
    var url = SHORT_BASE + encodeURIComponent(itemId);
    if (await ensureShare()) { window.SwappoShare.open(itemId, { item: item, text: text }); return; }
    if (navigator.share) { try { await navigator.share({ text: text.replace(url, '').trim(), url: url }); return; } catch (e) { return; } }
    if (await copy(text)) toast(tr('share_copied', 'Link copied'));
  }

  // ── UI ──────────────────────────────────────────────────────
  var STYLE =
    '.swp-gm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;font-family:Inter,sans-serif}' +
    '.swp-gm-card{background:#fff;border-radius:20px;padding:24px 24px 20px;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.25);text-align:center;position:relative;margin:auto}' +
    '.swp-gm-photo{width:132px;height:132px;border-radius:18px;object-fit:cover;display:block;margin:0 auto 14px;background:#F7F7F7;border:1px solid #EBEBEB}' +
    '.swp-gm-emoji{font-size:56px;line-height:1;margin:0 0 10px}' +
    '.swp-gm-title{margin:0 0 6px;font:800 21px Poppins,Inter,sans-serif;color:#171717}' +
    '.swp-gm-sub{margin:0 0 18px;font-size:14px;line-height:1.5;color:#555}' +
    '.swp-gm-block{background:#F7F7F7;border-radius:14px;padding:14px;margin:0 0 12px}' +
    '.swp-gm-block-title{margin:0 0 10px;font-size:13px;font-weight:700;color:#171717}' +
    '.swp-gm-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:46px;padding:12px 16px;border-radius:12px;border:1px solid #EBEBEB;background:#fff;color:#171717;font:700 14px Inter,sans-serif;cursor:pointer;text-decoration:none;box-sizing:border-box}' +
    '.swp-gm-btn + .swp-gm-btn{margin-top:8px}' +
    '.swp-gm-btn.primary{background:#09B1BA;border-color:#09B1BA;color:#fff}' +
    '.swp-gm-btn.primary:hover{background:#078A91}' +
    '.swp-gm-btn.ghost{border-color:transparent;background:transparent;color:#555}' +
    '.swp-gm-note{margin:0 0 14px;font-size:12px;color:#999}' +
    '.swp-gm-note b{color:#555}' +
    '.swp-gm-ge{background:#E6F7F8;border-radius:14px;padding:12px 14px;margin:0 0 12px;font-size:13px;font-weight:600;color:#078A91}' +
    '.swp-gm-ge-bar{height:6px;border-radius:999px;background:#fff;margin-top:8px;overflow:hidden}' +
    '.swp-gm-ge-bar span{display:block;height:100%;border-radius:999px;background:#09B1BA}' +
    '.swp-gm-close{position:absolute;top:12px;inset-inline-end:12px;width:32px;height:32px;border-radius:50%;border:0;background:#F3F4F6;color:#6B7280;font-size:16px;cursor:pointer}' +
    '.swp-gm-confetti{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9501}' +
    '@media (max-width:640px){.swp-gm-overlay{padding:12px}.swp-gm-card{padding:22px 18px 16px}}';
  function ensureStyle() {
    if (document.getElementById('swp-gm-style')) return;
    var st = document.createElement('style'); st.id = 'swp-gm-style'; st.textContent = STYLE; document.head.appendChild(st);
  }

  // Light confetti: one canvas, ~2 s, no library. Skipped for reduced motion.
  function confetti() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var cv = document.createElement('canvas');
      cv.className = 'swp-gm-confetti';
      var W = cv.width = window.innerWidth, H = cv.height = window.innerHeight;
      var ctx = cv.getContext('2d');
      if (!ctx) return;
      document.body.appendChild(cv);
      var colors = ['#09B1BA', '#FF8C00', '#FF4B55', '#FFD166', '#078A91'];
      var parts = [];
      for (var i = 0; i < 90; i++) {
        parts.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.4, w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
          vx: -1.5 + Math.random() * 3, vy: 2.5 + Math.random() * 3.5, rot: Math.random() * 6.28, vr: -0.2 + Math.random() * 0.4,
          c: colors[i % colors.length] });
      }
      var start = null, DURATION = 2000;
      var frame = function (ts) {
        if (start === null) start = ts;
        var el = ts - start;
        ctx.clearRect(0, 0, W, H);
        ctx.globalAlpha = el > DURATION - 500 ? Math.max(0, (DURATION - el) / 500) : 1;
        for (var k = 0; k < parts.length; k++) {
          var p = parts[k];
          p.x += p.vx; p.y += p.vy; p.rot += p.vr;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
        }
        if (el < DURATION) requestAnimationFrame(frame); else cv.remove();
      };
      requestAnimationFrame(frame);
    } catch (e) {}
  }

  // Generic panel → resolves with the action that closed it.
  function panel(html, opts) {
    ensureStyle();
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'swp-gm-overlay';
      overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', (opts && opts.label) || '');
      if (document.documentElement.dir === 'rtl') overlay.dir = 'rtl';
      overlay.innerHTML = '<div class="swp-gm-card">' +
        '<button type="button" class="swp-gm-close" data-gm="close" aria-label="' + esc(tr('action_close', 'Close')) + '">&times;</button>' +
        html + '</div>';
      var done = function (action) {
        document.removeEventListener('keydown', onKey);
        overlay.remove();
        resolve(action);
      };
      var onKey = function (e) { if (e.key === 'Escape' && !document.querySelector('.swp-share-overlay')) done('close'); };
      document.addEventListener('keydown', onKey);
      overlay.addEventListener('click', function (e) {
        var el = e.target.closest('[data-gm]');
        if (!el) return;
        var action = el.getAttribute('data-gm');
        if (opts && opts.actions && opts.actions[action]) { opts.actions[action](el); return; }
        done(action);
      });
      document.body.appendChild(overlay);
      if (opts && opts.confetti) confetti();
    });
  }

  function photoHtml(item, emoji) {
    var src = photoOf(item);
    return src ? '<img class="swp-gm-photo" src="' + esc(src) + '" alt="">' : '<div class="swp-gm-emoji" aria-hidden="true">' + emoji + '</div>';
  }
  function shareBlock(itemId, item, text, withCaption) {
    return '<div class="swp-gm-block">' +
        '<p class="swp-gm-block-title">' + esc(tr('gm_share_title', 'Share the moment')) + '</p>' +
        '<button type="button" class="swp-gm-btn primary" data-gm="share"><i class="fas fa-share-alt" aria-hidden="true"></i> ' + esc(tr('share', 'Share')) + '</button>' +
        (withCaption ? '<button type="button" class="swp-gm-btn" data-gm="caption"><i class="fab fa-instagram" aria-hidden="true"></i> ' + esc(tr('gm_copy_caption', 'Copy caption for Instagram')) + '</button>' : '') +
      '</div>' +
      (withCaption ? '<p class="swp-gm-note">' + tr('gm_tag_line', "Tag <b>@swappo.ae</b> and we'll reshare your story.") + '</p>' : '');
  }
  function shareActions(itemId, item, text) {
    return {
      share: function () { share(itemId, item, text); },
      caption: async function () {
        var cap = tr('gm_ig_caption', "Received this for free on @swappo.ae 🎁 List one thing you don't use, claim what you need. #SwappoUAE #GiftCorner");
        if (await copy(cap)) toast(tr('gm_caption_copied', 'Caption copied — tag @swappo.ae in your story'));
      }
    };
  }

  // ── The three moments ───────────────────────────────────────
  async function showAccepted(swap) {
    var item = await fetchItem(swap.receiver_item_id);
    markSeen(swap.id, 'accepted');
    var title = titleOf(item);
    var action = await panel(
      photoHtml(item, '🎁') +
      '<h3 class="swp-gm-title">' + esc(tr('gm_accepted_title', 'Your claim was accepted')) + '</h3>' +
      '<p class="swp-gm-sub">' + esc(tr('gm_accepted_sub', 'The giver chose you for {title}. Arrange the pickup in SwapChat.').replace('{title}', title)) + '</p>' +
      '<button type="button" class="swp-gm-btn primary" data-gm="chat"><i class="fas fa-comments" aria-hidden="true"></i> ' + esc(tr('gm_open_chat', 'Open SwapChat')) + '</button>',
      { label: tr('gm_accepted_title', 'Your claim was accepted') });
    if (action === 'chat') {
      var conv = await convIdOf(swap.id);
      var href = pagesPrefix() + 'chat.html' + (conv ? '?conv=' + encodeURIComponent(conv) : '');
      if (onChatPage() && conv && typeof window.openConv === 'function') { try { window.openConv(conv); return; } catch (e) {} }
      location.href = href;
    }
  }

  async function showReceived(swap, o) {
    o = o || {};
    var item = await fetchItem(swap.receiver_item_id);
    if (!o.replay) markSeen(swap.id, 'completed');
    var title = titleOf(item);
    var itemId = swap.receiver_item_id;
    var text = tr('gm_share_text_received', 'I just received a free {title} on Swappo 🎁 Someone listed it, I claimed it, they chose me. Free stuff, real people. {url}')
      .replace('{title}', title).replace('{url}', SHORT_BASE + itemId);
    var action = await panel(
      photoHtml(item, '🎁') +
      '<h3 class="swp-gm-title">' + esc(tr('gm_received_title', 'Gift received 🎁')) + '</h3>' +
      '<p class="swp-gm-sub">' + esc(tr('gm_received_sub', '{title} is yours. Someone gave it away instead of throwing it away.').replace('{title}', title)) + '</p>' +
      shareBlock(itemId, item, text, true) +
      '<button type="button" class="swp-gm-btn ghost" data-gm="continue">' + esc(o.replay ? tr('action_close', 'Close') : tr('gm_continue', 'Continue')) + '</button>',
      { label: tr('gm_received_title', 'Gift received'), confetti: !o.replay, actions: shareActions(itemId, item, text) });
    return action;
  }

  async function showGiven(swap) {
    var both = await Promise.all([fetchItem(swap.receiver_item_id), giveEarn()]);
    var item = both[0], ge = both[1];
    markSeen(swap.id, 'completed');
    var title = titleOf(item);
    var itemId = swap.receiver_item_id;
    var text = tr('gm_share_text_given', 'I just gave away my {title} on Swappo instead of throwing it away 🎁 {url}')
      .replace('{title}', title).replace('{url}', SHORT_BASE + itemId);
    var geHtml = '';
    if (ge) {
      var per = ge.per_boost || 3;
      var ready = (ge.available || 0) > 0 && (ge.progress || 0) === 0;
      var n = ready ? per : (ge.progress || 0);
      var first = (ge.earned || 0) === 0;
      var line = ready
        ? tr('gm_ge_ready', '{n} / {per} gifts — you earned a free boost! Use it from the Boost button on any of your listings.')
        : (first ? tr('gm_ge_progress_first', '{n} / {per} gifts to your first free boost')
                 : tr('gm_ge_progress_next', '{n} / {per} gifts to your next free boost'));
      geHtml = '<div class="swp-gm-ge">🚀 ' + esc(line.replace('{n}', n).replace('{per}', per)) +
        '<div class="swp-gm-ge-bar"><span style="width:' + Math.round((n / per) * 100) + '%"></span></div></div>';
    }
    var action = await panel(
      photoHtml(item, '🎁') +
      '<h3 class="swp-gm-title">' + esc(tr('gm_given_title', 'Gift given 🎁 — thank you.')) + '</h3>' +
      '<p class="swp-gm-sub">' + esc(tr('gm_given_sub', '{title} has a new home. One less thing thrown away.').replace('{title}', title)) + '</p>' +
      geHtml +
      shareBlock(itemId, item, text, false) +
      '<button type="button" class="swp-gm-btn ghost" data-gm="continue">' + esc(tr('gm_continue', 'Continue')) + '</button>',
      { label: tr('gm_given_title', 'Gift given'), actions: shareActions(itemId, item, text) });
    return action;
  }

  // Which panel (if any) does this swap row owe the current member?
  function momentFor(swap) {
    if (!swap || !swap.is_giveaway_claim || !_uid) return null;
    if (swap.status === 'completed') {
      if (swap.proposer_id === _uid && !swap.recipient_seen_completed_at) return 'received';
      if (swap.receiver_id === _uid && !swap.giver_seen_completed_at) return 'given';
      return null;
    }
    if (swap.status === 'accepted' && swap.proposer_id === _uid && !swap.recipient_seen_accepted_at) return 'accepted';
    return null;
  }

  // Shows the panel once; panels queue one after the other.
  function present(swap, o) {
    var kind = momentFor(swap);
    if (!kind) return Promise.resolve(null);
    var key = swap.id + ':' + kind;
    if (_shown[key]) return _shown[key];
    var run = function () {
      if (kind === 'accepted') return showAccepted(swap);
      return (kind === 'received' ? showReceived(swap) : showGiven(swap)).then(function (action) {
        // Off the chat page, "Continue" carries on to the rating popup.
        if (action === 'continue' && !(o && o.fromRatingGate) && !onChatPage()) return goRate(swap);
        return action;
      });
    };
    _shown[key] = _chain = _chain.then(run, run).catch(function () { return null; });
    return _shown[key];
  }
  async function goRate(swap) {
    var fresh = await fetchRatingState(swap);
    if (fresh) return;                       // already rated → nothing more to do
    var conv = await convIdOf(swap.id);
    var qs = [];
    if (conv) qs.push('conv=' + encodeURIComponent(conv));
    qs.push('rate=' + encodeURIComponent(swap.id));
    location.href = pagesPrefix() + 'chat.html?' + qs.join('&');
  }
  // Already rated? rate_swap() writes one reviews row per (reviewer, swap).
  async function fetchRatingState(swap) {
    try {
      var r = await window.db.from('reviews').select('id').eq('swap_id', swap.id).eq('reviewer_id', _uid).limit(1);
      return !!(r && r.data && r.data.length);
    } catch (e) { return false; }
  }

  // chat.html calls this right before its rating popup.
  async function beforeRating(swapId) {
    try {
      await ready();
      if (!_uid || !swapId) return;
      var swap = await fetchSwap(swapId);
      if (!swap) return;
      await present(swap, { fromRatingGate: true });
    } catch (e) {}
  }

  // My Swaps → History → Share: same panel, no confetti, nothing stamped.
  async function reopen(swapId) {
    await ready();
    var swap = await fetchSwap(swapId);
    if (!swap || !swap.is_giveaway_claim || swap.status !== 'completed' || swap.proposer_id !== _uid) return;
    _chain = _chain.then(function () { return showReceived(swap, { replay: true }); }).catch(function () {});
    return _chain;
  }

  // ── Boot: page-load check + realtime ────────────────────────
  var _readyP = null;
  function ready() {
    if (_readyP) return _readyP;
    _readyP = (async function () {
      var tries = 0;
      while (!(window.SwappoAuth && window.SwappoAuth.isReady && window.SwappoAuth.isReady()) && tries++ < 60) {
        await new Promise(function (r) { setTimeout(r, 100); });
      }
      if (!(window.SwappoAuth && window.SwappoAuth.getCurrentUser) || !window.db) return null;
      var u = null;
      try { u = await window.SwappoAuth.getCurrentUser(); } catch (e) {}
      _uid = (u && u.id) || null;
      return _uid;
    })();
    return _readyP;
  }

  async function checkNow() {
    if (!_uid) return;
    var rows = [];
    try {
      var r = await window.db.from('swaps').select(SELECT)
        .eq('is_giveaway_claim', true)
        .in('status', ['accepted', 'completed'])
        .or('proposer_id.eq.' + _uid + ',receiver_id.eq.' + _uid)
        .order('created_at', { ascending: false }).limit(20);
      rows = (r && r.data) || [];
    } catch (e) { return; }
    // Handed-over gifts first, then accepted claims.
    var order = { received: 0, given: 1, accepted: 2 };
    rows.filter(momentFor).sort(function (a, b) { return order[momentFor(a)] - order[momentFor(b)]; })
      .forEach(function (s) { present(s); });
  }

  function subscribe() {
    if (!_uid || !window.db || !window.db.channel) return;
    var onRow = function (payload) {
      var row = payload && payload.new;
      if (!row || !row.is_giveaway_claim) return;
      // chat.html opens the rating popup on the same event and waits for
      // beforeRating(); both paths share one panel through _shown.
      present(row);
    };
    try {
      window.db.channel('gift-moments-' + _uid)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'swaps', filter: 'proposer_id=eq.' + _uid }, onRow)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'swaps', filter: 'receiver_id=eq.' + _uid }, onRow)
        .subscribe();
    } catch (e) {}
  }

  async function boot() {
    var uid = await ready();
    if (!uid) return;
    // The QR scanner lands on chat.html?rate=… : that path shows the panel
    // through beforeRating(); the general check follows right after.
    setTimeout(checkNow, onChatPage() ? 1200 : 600);
    subscribe();
  }

  window.SwappoGiftMoments = { beforeRating: beforeRating, reopen: reopen, check: checkNow };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
