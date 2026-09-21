/* ============================================
   Swappo — Items module (Phase 2)
   Supabase-backed listings + favorites.

   All query methods are ASYNC (return Promises).
   UI helper renderCard() stays synchronous.

   Public API:
     SwappoItems.browse({category, condition, search, sortBy, limit, offset, giveawayOnly})
                          -> Promise<{items, total}>
     SwappoItems.getById(id)              -> Promise<item|null>
     SwappoItems.create(itemData)         -> Promise<{success, item?, error?}>
     SwappoItems.update(itemId, patch)    -> Promise<{success, item?, error?, locked?}>
     SwappoItems.canEdit(itemId)          -> Promise<boolean>
     SwappoItems.remove(itemId)           -> Promise<{success, error?}>
     SwappoItems.markStatus(itemId, status) -> Promise<{success, error?}>
     SwappoItems.getByUser(userId)        -> Promise<item[]>
     SwappoItems.getGiveaways()           -> Promise<item[]>
     SwappoItems.getBoosted()             -> Promise<item[]>
     SwappoItems.getSimilar(itemId, n)    -> Promise<item[]>
     SwappoItems.hasActiveItems(userId)   -> Promise<boolean>
     SwappoItems.toggleFavorite(itemId)   -> Promise<{favorited, error?}>
     SwappoItems.getFavoriteIds()         -> Promise<string[]>
     SwappoItems.getFavorites()           -> Promise<item[]>
     SwappoItems.isFavorited(itemId)      -> Promise<boolean>
     SwappoItems.renderCard(item)         -> string (HTML)
   ============================================ */

(function (global) {
  'use strict';

  const TABLE = 'items';
  const FAV_TABLE = 'favorites';

  // In-memory favorites cache (filled after first fetch) to keep renderCard sync
  let _favCache = null;
  // Items rendered on this page, by id — the share sheet reads title /
  // price / gift flag from here without a refetch.
  const _byId = {};
  // js/share-sheet.js is loaded on demand the first time a card's share
  // icon is tapped on a page that doesn't ship it.
  function share(itemId) {
    if (global.SwappoShare) return global.SwappoShare.open(itemId, _byId[itemId]);
    const base = global.location.pathname.indexOf('/pages/') !== -1 ? '../js/' : 'js/';
    const sc = document.createElement('script');
    sc.src = base + 'share-sheet.js';
    sc.onload = function () { if (global.SwappoShare) global.SwappoShare.open(itemId, _byId[itemId]); };
    document.head.appendChild(sc);
  }

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]
    );
  }
  function _safeUrl(u) {
    if (!u) return '';
    const s = String(u).trim();
    if (/^(https?:\/\/|\/|\.\/|\.\.\/)/i.test(s)) return _esc(s);
    if (/^data:image\//i.test(s)) return _esc(s);
    return '';
  }
  // A brand of "Other" / "N/A" (pre-2026-09 listings, before the free-text
  // brand input) must never show up in a title.
  function _cleanBrand(b) {
    const v = String(b == null ? '' : b).trim();
    return /^(other|n\/a)$/i.test(v) ? '' : v;
  }
  function itemTitle(item) {
    if (!item) return '';
    return (_cleanBrand(item.brand) + ' ' + (item.model || '')).trim() || item.type || item.category || 'Item';
  }
  function _conditionLabel(c) {
    return ({ new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair' })[c] || c || '';
  }
  function _inPagesDir() {
    return window.location.pathname.includes('/pages/');
  }
  function _productHref(itemId) {
    return _inPagesDir()
      ? 'product.html?id=' + itemId
      : 'pages/product.html?id=' + itemId;
  }
  async function _currentUserId() {
    // Fast path via the synchronous JWT reader — same race fix as
    // swappo-chat.js. Avoids returning null while the SDK hydrates.
    if (global.SwappoAuth && global.SwappoAuth.getFastUser) {
      var fast = global.SwappoAuth.getFastUser();
      if (fast && fast.id) return fast.id;
    }
    if (!global.SwappoAuth || !global.SwappoAuth.isReady()) return null;
    const u = await global.SwappoAuth.getCurrentUser();
    return u ? u.id : null;
  }

  // ---------- BROWSE ----------
  async function browse(opts) {
    opts = opts || {};
    if (!global.db) return { items: [], total: 0 };

    let q = global.db.from(TABLE).select('*', { count: 'exact' }).eq('status', 'available');

    if (opts.category) q = q.eq('category', opts.category);
    if (opts.condition) q = q.eq('condition', opts.condition);
    if (opts.giveawayOnly) q = q.eq('is_giveaway', true);
    if (opts.userId) q = q.eq('user_id', opts.userId);

    if (opts.search) {
      // Match brand OR model OR type containing the search term
      const s = opts.search.replace(/[%,]/g, '');
      q = q.or(
        `brand.ilike.%${s}%,model.ilike.%${s}%,type.ilike.%${s}%,category.ilike.%${s}%`
      );
    }

    // Sorting
    switch (opts.sortBy) {
      case 'popular':
        // Boosted first, then Swappo Pro members ("priority in search
        // results"), then the most favourited.
        q = q.order('is_boosted', { ascending: false })
             .order('owner_is_pro', { ascending: false })
             .order('favorites_count', { ascending: false });
        break;
      case 'oldest':
        q = q.order('created_at', { ascending: true });
        break;
      case 'newest':
      default:
        // Boosted first, then Swappo Pro members, then newest
        q = q.order('is_boosted', { ascending: false })
             .order('owner_is_pro', { ascending: false })
             .order('created_at', { ascending: false });
        break;
    }

    if (opts.limit)  q = q.limit(opts.limit);
    if (opts.offset) q = q.range(opts.offset, opts.offset + (opts.limit || 20) - 1);

    const { data, error, count } = await q;
    if (error) {
      console.warn('[SwappoItems.browse]', error.message);
      return { items: [], total: 0 };
    }
    return { items: data || [], total: count || (data ? data.length : 0) };
  }

  // ---------- GET BY ID ----------
  async function getById(itemId) {
    if (!global.db || !itemId) return null;
    const { data, error } = await global.db
      .from(TABLE).select('*').eq('id', itemId).maybeSingle();
    if (error) return null;
    return data || null;
  }

  // ---------- CREATE ----------
  async function create(itemData) {
    if (!global.db) return { success: false, error: 'Service unavailable.' };
    const uid = await _currentUserId();
    if (!uid) return { success: false, error: 'You must be signed in.' };

    const row = {
      user_id: uid,
      category: itemData.category || 'other',
      subcategory: itemData.subcategory || '',
      type: itemData.type || '',
      brand: itemData.brand || '',
      model: itemData.model || '',
      condition: itemData.condition || 'good',
      year: itemData.year ? String(itemData.year) : '',
      size: itemData.size || '',
      color: itemData.color || '',
      photos: Array.isArray(itemData.photos) ? itemData.photos : [],
      is_giveaway: !!itemData.is_giveaway,
      price: Number(itemData.price) || 0,
      lat: itemData.lat || null,
      lng: itemData.lng || null,
      city: itemData.city || '',
      emirate: itemData.emirate || '',
      description: itemData.description ? String(itemData.description).slice(0, 2000) : null,
      specs: (itemData.specs && typeof itemData.specs === 'object' && !Array.isArray(itemData.specs)) ? itemData.specs : {},
      needs_review: !!itemData.needs_review,
      status: 'available'
    };
    const { data, error } = await global.db.from(TABLE).insert(row).select('*').single();
    if (error) return { success: false, error: error.message };

    // Fire-and-forget toast
    if (global.Toast) {
      global.Toast.show(itemTitle(row) + ' is now live on Swap Market.', 'success');
    }
    return { success: true, item: data };
  }

  // ---------- UPDATE (owner edits a listing) ----------
  // Only listing fields are accepted; status / boost / box columns have
  // their own flows. RLS restricts the write to the owner, and the DB
  // trigger items_guard_edit_while_engaged (migration 033) rejects the
  // update while a swap is pending / accepted on the item.
  const EDITABLE_FIELDS = ['category', 'subcategory', 'type', 'brand', 'model', 'condition',
    'year', 'size', 'color', 'photos', 'is_giveaway', 'price', 'emirate', 'city', 'lat', 'lng',
    'description', 'specs', 'needs_review'];
  async function update(itemId, patch) {
    if (!global.db) return { success: false, error: 'Service unavailable.' };
    if (!itemId) return { success: false, error: 'Missing item id.' };
    const uid = await _currentUserId();
    if (!uid) return { success: false, error: 'You must be signed in.' };
    const row = {};
    EDITABLE_FIELDS.forEach(k => { if (patch && patch[k] !== undefined) row[k] = patch[k]; });
    if (row.year !== undefined) row.year = row.year ? String(row.year) : '';
    if (row.price !== undefined) row.price = Number(row.price) || 0;
    if (row.photos !== undefined && !Array.isArray(row.photos)) row.photos = [];
    if (row.description !== undefined) row.description = row.description ? String(row.description).slice(0, 2000) : null;
    if (row.specs !== undefined && (!row.specs || typeof row.specs !== 'object' || Array.isArray(row.specs))) row.specs = {};
    if (!Object.keys(row).length) return { success: false, error: 'Nothing to update.' };
    const { data, error } = await global.db.from(TABLE)
      .update(row).eq('id', itemId).eq('user_id', uid).select('*').maybeSingle();
    if (error) {
      const locked = /item_locked_by_active_swap/i.test(error.message || '');
      return { success: false, error: error.message, locked };
    }
    if (!data) return { success: false, error: 'Listing not found or not yours.' };
    return { success: true, item: data };
  }

  // Can the current owner edit this listing right now? (no pending /
  // accepted swap, status available). Falls back to a client-side check
  // if the RPC is missing.
  async function canEdit(itemId) {
    if (!global.db || !itemId) return false;
    try {
      const { data, error } = await global.db.rpc('item_can_be_edited', { item_id_in: itemId });
      if (!error && typeof data === 'boolean') return data;
    } catch (e) { /* fall through */ }
    try {
      const item = await getById(itemId);
      if (!item || item.status !== 'available') return false;
      const { count } = await global.db.from('swaps')
        .select('id', { count: 'exact', head: true })
        .or('receiver_item_id.eq.' + itemId + ',proposer_item_id.eq.' + itemId)
        .in('status', ['pending', 'accepted']);
      return (count || 0) === 0;
    } catch (e) { return false; }
  }

  // ---------- REMOVE ----------
  async function remove(itemId) {
    if (!global.db) return { success: false, error: 'Service unavailable.' };
    const { error } = await global.db.from(TABLE).delete().eq('id', itemId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async function markStatus(itemId, status) {
    if (!global.db) return { success: false, error: 'Service unavailable.' };
    const { error } = await global.db.from(TABLE).update({ status }).eq('id', itemId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  // ---------- BY USER ----------
  async function getByUser(userId) {
    if (!global.db || !userId) return [];
    const { data } = await global.db.from(TABLE)
      .select('*').eq('user_id', userId)
      .order('created_at', { ascending: false });
    return data || [];
  }

  async function hasActiveItems(userId) {
    if (!global.db || !userId) return false;
    const { count } = await global.db.from(TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('status', 'available');
    return (count || 0) > 0;
  }

  // ---------- GIVEAWAYS / BOOSTED ----------
  async function getGiveaways() {
    const { items } = await browse({ giveawayOnly: true });
    return items;
  }
  async function getBoosted() {
    if (!global.db) return [];
    const { data } = await global.db.from(TABLE)
      .select('*')
      .eq('status', 'available').eq('is_boosted', true)
      .order('created_at', { ascending: false });
    return data || [];
  }

  // ---------- SIMILAR ----------
  async function getSimilar(itemId, limit) {
    const item = await getById(itemId);
    if (!item) return [];
    const { data } = await global.db.from(TABLE).select('*')
      .eq('category', item.category).eq('status', 'available')
      .neq('id', itemId)
      .limit(limit || 4);
    return data || [];
  }

  // ---------- FAVORITES ----------
  async function getFavoriteIds() {
    if (!global.db) return [];
    const uid = await _currentUserId();
    if (!uid) return [];
    const { data } = await global.db.from(FAV_TABLE).select('item_id').eq('user_id', uid);
    const ids = (data || []).map(r => r.item_id);
    _favCache = new Set(ids);
    return ids;
  }
  async function getFavorites() {
    const ids = await getFavoriteIds();
    if (!ids.length) return [];
    const { data } = await global.db.from(TABLE).select('*').in('id', ids);
    return data || [];
  }
  async function isFavorited(itemId) {
    if (_favCache) return _favCache.has(itemId);
    const ids = await getFavoriteIds();
    return ids.includes(itemId);
  }
  /** Synchronous cache read; call getFavoriteIds() at page load first */
  function isFavoritedSync(itemId) {
    return _favCache ? _favCache.has(itemId) : false;
  }
  async function toggleFavorite(itemId) {
    if (!global.db) return { favorited: false, error: 'Service unavailable.' };
    const uid = await _currentUserId();
    if (!uid) return { favorited: false, error: 'Sign in to save favorites.' };

    // Check current state
    const { data: existing } = await global.db
      .from(FAV_TABLE).select('item_id').eq('user_id', uid).eq('item_id', itemId)
      .maybeSingle();

    if (existing) {
      const { error } = await global.db
        .from(FAV_TABLE).delete().eq('user_id', uid).eq('item_id', itemId);
      if (error) return { favorited: true, error: error.message };
      if (_favCache) _favCache.delete(itemId);
      return { favorited: false };
    } else {
      const { error } = await global.db
        .from(FAV_TABLE).insert({ user_id: uid, item_id: itemId });
      if (error) return { favorited: false, error: error.message };
      if (_favCache) _favCache.add(itemId);
      return { favorited: true };
    }
  }

  // ---------- CARD HEART CLICK ----------
  // The red state lives on the .is-liked class (css/style.css), not on the
  // icon alone — toggling only far/fas left the heart grey. Errors (e.g.
  // not signed in) are surfaced with a toast instead of failing silently.
  function onFavClick(btn) {
    if (!btn) return;
    const id = btn.getAttribute('data-fav-id');
    const icon = btn.querySelector('i');
    const wasLiked = btn.classList.contains('is-liked');
    // Optimistic flip, reverted if the server disagrees.
    btn.classList.toggle('is-liked', !wasLiked);
    btn.setAttribute('aria-pressed', !wasLiked ? 'true' : 'false');
    if (icon) icon.className = !wasLiked ? 'fas fa-heart' : 'far fa-heart';
    toggleFavorite(id).then(r => {
      const liked = !!(r && r.favorited);
      btn.classList.toggle('is-liked', liked);
      btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
      if (icon) icon.className = liked ? 'fas fa-heart' : 'far fa-heart';
      if (r && r.error && global.Toast) global.Toast.show(r.error, 'warning');
    }).catch(() => {
      btn.classList.toggle('is-liked', wasLiked);
      if (icon) icon.className = wasLiked ? 'fas fa-heart' : 'far fa-heart';
    });
  }

  // ---------- CLAIMER SUMMARY (gift claims) ----------
  // What a giver may see about a claimer while identities are hidden:
  // tier badge, join date and the claimer's latest listing. No name, no
  // avatar. Used for the "Someone claimed your gift" notification and the
  // received-claims list.
  async function claimerSummary(userId) {
    const out = { badge: '', joined: null, item: null, line: '' };
    if (!global.db || !userId) return out;
    try {
      const { data: u } = await global.db.from('users_public').select('badge, created_at').eq('id', userId).maybeSingle();
      if (u) { out.badge = u.badge || ''; out.joined = u.created_at || null; }
      const { data: its } = await global.db.from(TABLE).select('id, brand, model, type, category, photos')
        .eq('user_id', userId).in('status', ['available', 'reserved', 'swapped', 'sold'])
        .order('created_at', { ascending: false }).limit(1);
      if (its && its[0]) out.item = { id: its[0].id, title: itemTitle(its[0]), photo: (its[0].photos && its[0].photos[0]) || '' };
    } catch (e) { /* best-effort */ }
    const tiers = (global.BADGE_TIERS || []).reduce((m, b) => { m[b.tier] = b.emoji + ' ' + b.label; return m; }, {});
    const badgeLabel = tiers[out.badge] || (out.badge ? out.badge : '');
    const joined = out.joined ? new Date(out.joined).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '';
    const tr = (k, f) => (typeof global.t === 'function') ? global.t(k) : f;
    out.line = [badgeLabel, joined ? tr('claim_member_since', 'member since') + ' ' + joined : '', out.item ? tr('claim_latest_listing', 'Latest listing') + ': ' + out.item.title : '']
      .filter(Boolean).join(' · ');
    return out;
  }

  // ---------- VIEWS COUNTER ----------
  // Any new page that displays a single product detail MUST call this on
  // mount (see pages/product.html for the reference pattern). The counter
  // feeds the "Trending" tab ranking in feed-tabs.js, so forgetting to
  // call it biases the whole catalogue ordering.
  //
  // Built-in guards:
  //   • Session dedup — a user refreshing the same product 10× in one
  //     session counts as one view. Key lives in sessionStorage so it
  //     resets per tab.
  //   • Owner skip — passing opts.ownerId lets us drop views where the
  //     current user is the listing owner, so a seller checking their
  //     own item doesn't inflate the count.
  async function bumpViews(itemId, opts) {
    if (!global.db || !itemId) return;
    opts = opts || {};
    // Session dedup: never bump the same item twice in one tab.
    try {
      var key = 'swp_view_' + itemId;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, String(Date.now()));
    } catch (e) { /* sessionStorage unavailable — fall through */ }
    // Owner skip: pass the listing owner id and we drop self-views.
    if (opts.ownerId && global.SwappoAuth && global.SwappoAuth.getFastUser) {
      try {
        var me = global.SwappoAuth.getFastUser();
        if (me && me.id === opts.ownerId) return;
      } catch (e) { /* best-effort */ }
    }
    try {
      await global.db.rpc('bump_views', { item_id_in: itemId });
    } catch (e) { /* no-op — counter is best-effort */ }
  }

  // ---------- RENDER CARD ----------
  function renderCard(item) {
    if (!item) return '';
    if (item.id) _byId[item.id] = item;
    const href = _esc(_productHref(item.id));
    const title = _esc(itemTitle(item));
    const photo = _safeUrl((item.photos && item.photos[0]) || '');
    const fav = isFavoritedSync(item.id);
    const conditionStr = item.condition ? _esc(_conditionLabel(item.condition)) : '';
    const itemIdAttr = _esc(item.id);

    let locationLabel = item.city || '';
    if (window.Swappo && window.Swappo.distanceTo) {
      const km = window.Swappo.distanceTo(item.lat, item.lng);
      if (km != null) locationLabel = window.Swappo.formatDistance(km);
    }
    const locSafe = _esc(locationLabel);

    let priceHTML = '', modesHTML = '';
    if (item.is_giveaway) {
      priceHTML = '<div class="product-price" style="color:var(--secondary);font-weight:800;font-size:15px;">FREE</div>';
      modesHTML = '<span class="mode-badge mode-gift" style="font-size:0.68rem;padding:2px 8px;border-radius:999px;font-weight:600;background:#ECFDF5;color:#065F46;">Gift</span>';
    } else {
      const price = Number(item.price) || 0;
      // Price drop (migration 052): old price struck through next to the new one.
      const was = Number(item.previous_price) || 0;
      const dropHTML = (was > price && price > 0)
        ? '<span style="font-size:12px;font-weight:600;color:#9CA3AF;text-decoration:line-through;margin-inline-end:6px;">' + _esc(was.toLocaleString()) + '</span>'
        : '';
      priceHTML = '<div class="product-price" style="font-weight:800;font-size:15px;color:' + (dropHTML ? '#DC2626' : '#1A1A2E') + ';">'
        + dropHTML
        + _esc(price.toLocaleString())
        + ' <span style="font-size:11px;font-weight:600;color:#6B7280;">AED</span></div>';
      modesHTML = '<span class="mode-badge mode-swap" style="font-size:0.68rem;padding:2px 8px;border-radius:999px;font-weight:600;background:#E6F7F8;color:#078A91;">Swap</span>'
        + '<span class="mode-badge mode-buy" style="font-size:0.68rem;padding:2px 8px;border-radius:999px;font-weight:600;background:#FEF3C7;color:#92400E;">Buy</span>';
    }

    const latSafe = _esc(item.lat != null ? item.lat : '');
    const lngSafe = _esc(item.lng != null ? item.lng : '');
    const citySafe = _esc(item.city || '');
    const dataAttrs = ' data-lat="' + latSafe + '" data-lng="' + lngSafe + '" data-city="' + citySafe + '" data-item-id="' + itemIdAttr + '"';

    // P4B — distance badge when feed-tabs is on "Around You"
    const distBadge = (item._distance_km != null)
      ? '<div class="swp-distance-badge">📍 ' + item._distance_km.toFixed(1) + ' km</div>'
      : '';
    // Boosted — the promotion the owner paid for (or used a Pro boost on).
    const boostBadge = (item.is_boosted && (!item.boost_expires_at || new Date(item.boost_expires_at).getTime() > Date.now()))
      ? '<div class="swp-boost-badge" style="position:absolute;top:8px;left:8px;background:linear-gradient(135deg,#F59E0B,#D97706);color:#fff;padding:4px 10px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:0.03em;box-shadow:0 4px 10px rgba(245,158,11,0.35);display:inline-flex;align-items:center;gap:4px;">🚀 ' + _esc((typeof t === 'function') ? t('boosted') : 'Boosted') + '</div>'
      : '';
    // Gift Box badge — item bundled with ≥1 others as a single-claim box.
    const boxBadge = item.box_id
      ? '<div style="position:absolute;top:8px;left:8px;background:linear-gradient(135deg,#10B981,#059669);color:#fff;padding:4px 10px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:0.03em;box-shadow:0 4px 10px rgba(16,185,129,0.35);display:inline-flex;align-items:center;gap:4px;">📦 BOX</div>'
      : '';
    return '<div class="product-card"' + dataAttrs + ' data-href="' + href + '" onclick="if(!event.target.closest(\'.product-fav\'))window.location.href=this.dataset.href" style="cursor:pointer">' +
      '<div class="product-img" style="position:relative;">' +
        distBadge + boostBadge + (boostBadge && item.box_id ? boxBadge.replace('top:8px;left:8px;', 'top:36px;left:8px;') : boxBadge) +
        (photo ? '<img src="' + photo + '" alt="' + title + '" loading="lazy">' : '<div style="width:100%;height:100%;background:#F3F4F6;display:flex;align-items:center;justify-content:center;font-size:28px;">\u{1F4E6}</div>') +
        '<button class="product-fav' + (fav ? ' is-liked' : '') + '" type="button" style="top:8px; bottom:auto;" data-fav-id="' + itemIdAttr + '" aria-pressed="' + (fav ? 'true' : 'false') + '" onclick="event.stopPropagation(); SwappoItems.onFavClick(this)">' +
          '<i class="' + (fav ? 'fas fa-heart' : 'far fa-heart') + '"></i>' +
        '</button>' +
        // Share — same look as the heart, right next to it (ignored by the card click like .product-fav).
        '<button class="product-fav product-share" type="button" style="top:8px;bottom:auto;right:44px;" data-share-id="' + itemIdAttr + '" aria-label="' + _esc((typeof t === 'function') ? t('share') : 'Share') + '" onclick="event.stopPropagation(); SwappoItems.share(this.dataset.shareId)">' +
          '<i class="fas fa-share-alt"></i>' +
        '</button>' +
      '</div>' +
      '<div class="product-info">' +
        '<div class="product-brand">' + title + '</div>' +
        (conditionStr ? '<div class="product-details">' + conditionStr + '</div>' : '') +
        priceHTML +
        (locSafe ? '<div class="product-location" style="display:flex;align-items:center;gap:4px;font-size:0.72rem;color:#6B7280;margin-top:4px;font-weight:500;"><i class="fas fa-map-marker-alt" style="color:#09B1BA;font-size:0.7rem;"></i> ' + locSafe + '</div>' : '') +
        '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;">' + modesHTML +
          // ✓ Verified owner — only when the feed attaches owner_is_verified (users_public.is_verified).
          (item.owner_is_pro === true ? '<span class="swp-chip-pro" style="font-size:0.68rem;padding:2px 8px;border-radius:999px;font-weight:700;background:#FCE7F3;color:#BE185D;">🛡️ ' + _esc((typeof t === 'function') ? t('badge_swappo_pro') : 'Swappo Pro') + '</span>' : '') +
          (item.owner_is_verified === true ? '<span class="swp-chip-verified" style="font-size:0.68rem;padding:2px 8px;border-radius:999px;font-weight:700;background:var(--primary-light,#E6F7F8);color:var(--primary-dark,#078A91);">✓ ' + _esc((typeof t === 'function') ? t('badge_verified') : 'Verified') + '</span>' : '') +
          (item.shipping_enabled ? '<span style="font-size:0.68rem;padding:2px 8px;border-radius:999px;font-weight:600;background:#E0F2FE;color:#075985;">\u{1F69A} Delivery</span>' : '') +
          (['furniture', 'vehicles', 'sports'].includes(item.category) ? '<span style="font-size:0.68rem;padding:2px 8px;border-radius:999px;font-weight:600;background:#FDF2F8;color:#9D174D;">\u{1F69B} Truck</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  global.SwappoItems = {
    browse, getById, create, update, canEdit, remove, markStatus,
    getByUser, hasActiveItems,
    getGiveaways, getBoosted, getSimilar,
    toggleFavorite, onFavClick, getFavoriteIds, getFavorites, isFavorited, isFavoritedSync,
    bumpViews, renderCard, itemTitle, cleanBrand: _cleanBrand, claimerSummary, share, _byId
  };
})(window);
