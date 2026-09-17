/* ============================================
   Swappo — share sheet
   One discreet share icon on every item (cards, gift cards, My Items,
   product page) opening the same sheet: WhatsApp · Instagram · Facebook ·
   Telegram · X · Snapchat · Copy link · More (native). Links are the short
   crawler-friendly form https://swappo.ae/i/<id> (api/share.js renders the
   OG preview with the item photo). No tracking, no nudges.

   API:  SwappoShare.open(itemId, item?)   SwappoShare.icon(itemId)
   ============================================ */
(function () {
  'use strict';
  var SHORT_BASE = 'https://swappo.ae/i/';
  function tr(key, fallback) { return (typeof window.t === 'function') ? window.t(key) : fallback; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function toast(msg, type) { if (window.Toast && Toast.show) Toast.show(msg, type || 'success'); }
  function isMobile() { return window.matchMedia && window.matchMedia('(max-width: 640px)').matches; }

  function titleOf(item) {
    if (window.SwappoItems && SwappoItems.itemTitle) return SwappoItems.itemTitle(item);
    return ((item.brand || '') + ' ' + (item.model || '')).trim() || item.type || 'Item';
  }
  function shareText(item, url) {
    var title = titleOf(item);
    var price = Number(item.price) || 0;
    var tpl = item.is_giveaway
      ? tr('share_msg_gift', "{title} — free on Swappo's Gift Corner. {url}")
      : (price > 0 ? tr('share_msg_item', '{title} — {price} AED on Swappo. Swap, buy or make an offer. {url}')
                   : tr('share_msg_item_noprice', '{title} on Swappo. Swap or make an offer. {url}'));
    return tpl.replace('{title}', title).replace('{price}', price.toLocaleString()).replace('{url}', url);
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

  var STYLE = '.swp-share-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(3px);z-index:9600;display:flex;align-items:center;justify-content:center;padding:20px}' +
    '.swp-share-sheet{background:#fff;border-radius:20px;padding:20px 20px 16px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,.25);position:relative;font-family:Inter,sans-serif}' +
    '.swp-share-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}' +
    '.swp-share-title{font-size:16px;font-weight:800;color:#1A1A2E;margin:0}' +
    '.swp-share-close{width:32px;height:32px;border-radius:50%;border:0;background:#F3F4F6;color:#6B7280;font-size:16px;cursor:pointer}' +
    '.swp-share-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}' +
    '.swp-share-btn{border:1px solid #EBEBEB;background:#fff;border-radius:14px;padding:12px 6px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;font-family:inherit;color:#171717;font-size:11px;font-weight:600;min-height:74px;justify-content:center}' +
    '.swp-share-btn:hover{border-color:#09B1BA;background:#F0FBFC}' +
    '.swp-share-btn i{font-size:22px;line-height:1}' +
    '.swp-share-btn.wa i{color:#25D366}.swp-share-btn.ig i{color:#E1306C}.swp-share-btn.fb i{color:#1877F2}.swp-share-btn.tg i{color:#26A5E4}.swp-share-btn.x i{color:#111}.swp-share-btn.sc i{color:#E5B800}.swp-share-btn.cp i,.swp-share-btn.more i{color:#09B1BA}' +
    '@media (max-width:640px){.swp-share-overlay{align-items:flex-end;padding:0}.swp-share-sheet{max-width:none;border-radius:20px 20px 0 0;padding-bottom:calc(16px + env(safe-area-inset-bottom))}}' +
    '.product-share{right:44px}';
  function ensureStyle() {
    if (document.getElementById('swp-share-style')) return;
    var st = document.createElement('style'); st.id = 'swp-share-style'; st.textContent = STYLE; document.head.appendChild(st);
  }

  async function resolveItem(itemId, item) {
    if (item && item.id) return item;
    var cache = window.SwappoItems && SwappoItems._byId;
    if (cache && cache[itemId]) return cache[itemId];
    if (window.SwappoItems && SwappoItems.getById) { try { return await SwappoItems.getById(itemId); } catch (e) {} }
    return { id: itemId };
  }

  async function open(itemId, itemOpt) {
    if (!itemId) return;
    ensureStyle();
    var item = await resolveItem(itemId, itemOpt);
    var url = SHORT_BASE + encodeURIComponent(itemId);
    var text = shareText(item, url);
    var textNoUrl = text.replace(' ' + url, '').replace(url, '').trim();
    var title = titleOf(item);
    var canNative = !!(navigator.share);

    var targets = [
      { key: 'wa', cls: 'wa', icon: 'fab fa-whatsapp', label: 'WhatsApp', href: 'https://wa.me/?text=' + encodeURIComponent(text) },
      { key: 'ig', cls: 'ig', icon: 'fab fa-instagram', label: 'Instagram' },
      { key: 'fb', cls: 'fb', icon: 'fab fa-facebook', label: 'Facebook', href: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) },
      { key: 'tg', cls: 'tg', icon: 'fab fa-telegram', label: 'Telegram', href: 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(textNoUrl) },
      { key: 'x',  cls: 'x',  icon: 'fab fa-x-twitter', label: 'X', href: 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(textNoUrl) + '&url=' + encodeURIComponent(url) },
      { key: 'sc', cls: 'sc', icon: 'fab fa-snapchat', label: 'Snapchat', href: 'https://www.snapchat.com/scan?attachmentUrl=' + encodeURIComponent(url) },
      { key: 'cp', cls: 'cp', icon: 'fas fa-link', label: tr('share_copy', 'Copy link') }
    ];
    if (canNative) targets.push({ key: 'more', cls: 'more', icon: 'fas fa-ellipsis-h', label: tr('share_more', 'More') });

    var overlay = document.createElement('div');
    overlay.className = 'swp-share-overlay';
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-label', tr('share', 'Share'));
    overlay.innerHTML =
      '<div class="swp-share-sheet">' +
        '<div class="swp-share-head"><h3 class="swp-share-title">' + esc(tr('share', 'Share')) + '</h3>' +
          '<button type="button" class="swp-share-close" aria-label="' + esc(tr('action_close', 'Close')) + '">&times;</button></div>' +
        '<div class="swp-share-grid">' + targets.map(function (tg) {
          return '<button type="button" class="swp-share-btn ' + tg.cls + '" data-key="' + tg.key + '"><i class="' + tg.icon + '" aria-hidden="true"></i><span>' + esc(tg.label) + '</span></button>';
        }).join('') + '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    var close = function () { overlay.remove(); document.removeEventListener('keydown', onKey); };
    var onKey = function (e) { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', async function (e) {
      if (e.target === overlay) { close(); return; }
      var btn = e.target.closest('.swp-share-btn');
      if (btn && btn.classList.contains('swp-share-close') === false && !btn.classList.contains('swp-share-btn')) return;
      if (e.target.closest('.swp-share-close')) { close(); return; }
      if (!btn) return;
      var key = btn.getAttribute('data-key');
      var tg = targets.filter(function (x) { return x.key === key; })[0];
      if (!tg) return;
      if (key === 'cp') { if (await copy(url)) toast(tr('share_copied', 'Link copied')); close(); return; }
      if (key === 'ig') { await copy(url); toast(tr('share_ig_hint', 'Link copied — paste it in your story or bio.'), 'info'); close(); return; }
      if (key === 'more') { try { await navigator.share({ title: title, text: textNoUrl, url: url }); } catch (err) {} close(); return; }
      window.open(tg.href, '_blank', 'noopener');
      close();
    });
  }

  // Card icon: same look as the heart (.product-fav), next to it.
  function icon(itemId, extraStyle) {
    return '<button class="product-fav product-share" type="button" style="top:8px;bottom:auto;right:44px;' + (extraStyle || '') + '" data-share-id="' + esc(itemId) + '" aria-label="' + esc(tr('share', 'Share')) + '" onclick="event.stopPropagation(); SwappoShare.open(this.dataset.shareId)"><i class="fas fa-share-alt"></i></button>';
  }

  window.SwappoShare = { open: open, icon: icon, text: shareText, url: function (id) { return SHORT_BASE + encodeURIComponent(id); } };
})();
