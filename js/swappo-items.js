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
        q = q.order('favorites_count', { ascending: false });
        break;
      case 'oldest':
        q = q.order('created_at', { ascending: true });
        break;
      case 'newest':
      default:
        // Boosted first, then newest
        q = q.order('is_boosted', { ascending: false })
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
      status: 'available'
    };
    const { data, error } = await global.db.from(TABLE).insert(row).select('*').single();
    if (error) return { success: false, error: error.message };

    // Fire-and-forget notification
    if (global.DemoNotifications) {
      global.DemoNotifications.add({
        type: 'item_published',
        title: 'Item Published!',
        message: `${row.brand} ${row.model}`.trim() + ' is now live on Swap Market.',
        created_at: new Date().toISOString()
      });
    }
    return { success: true, item: data };
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

  // ---------- VIEWS COUNTER ----------
  async function bumpViews(itemId) {
    if (!global.db || !itemId) return;
    // best-effort RPC-less increment via SQL — uses the supabase rpc if we add one,
    // otherwise skip silently (counter is optional)
    try {
      await global.db.rpc('bump_views', { item_id_in: itemId });
    } catch (e) { /* no-op */ }
  }

  // ---------- RENDER CARD ----------
  function renderCard(item) {
    if (!item) return '';
    const href = _esc(_productHref(item.id));
    const title = _esc(((item.brand || '') + ' ' + (item.model || '')).trim() || item.category || 'Item');
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
      priceHTML = '<div class="product-price" style="font-weight:800;font-size:15px;color:#1A1A2E;">'
        + _esc(price.toLocaleString())
        + ' <span style="font-size:11px;font-weight:600;color:#6B7280;">AED</span></div>';
      modesHTML = '<span class="mode-badge mode-swap" style="font-size:0.68rem;padding:2px 8px;border-radius:999px;font-weight:600;background:#E6F7F8;color:#078A91;">Swap</span>'
        + '<span class="mode-badge mode-buy" style="font-size:0.68rem;padding:2px 8px;border-radius:999px;font-weight:600;background:#FEF3C7;color:#92400E;">Buy</span>';
    }

    const latSafe = _esc(item.lat != null ? item.lat : '');
    const lngSafe = _esc(item.lng != null ? item.lng : '');
    const citySafe = _esc(item.city || '');
    const dataAttrs = ' data-lat="' + latSafe + '" data-lng="' + lngSafe + '" data-city="' + citySafe + '" data-item-id="' + itemIdAttr + '"';

    return '<div class="product-card"' + dataAttrs + ' data-href="' + href + '" onclick="if(!event.target.closest(\'.product-fav\'))window.location.href=this.dataset.href" style="cursor:pointer">' +
      '<div class="product-img">' +
        (photo ? '<img src="' + photo + '" alt="' + title + '" loading="lazy">' : '<div style="width:100%;height:100%;background:#F3F4F6;display:flex;align-items:center;justify-content:center;font-size:28px;">\u{1F4E6}</div>') +
        '<button class="product-fav" type="button" style="top:8px; bottom:auto;" data-fav-id="' + itemIdAttr + '" onclick="event.stopPropagation(); SwappoItems.toggleFavorite(this.dataset.favId).then(r => { this.querySelector(\'i\').className = r.favorited ? \'fas fa-heart\' : \'far fa-heart\'; });">' +
          '<i class="' + (fav ? 'fas fa-heart' : 'far fa-heart') + '"></i>' +
        '</button>' +
      '</div>' +
      '<div class="product-info">' +
        '<div class="product-brand">' + title + '</div>' +
        (conditionStr ? '<div class="product-details">' + conditionStr + '</div>' : '') +
        priceHTML +
        (locSafe ? '<div class="product-location" style="display:flex;align-items:center;gap:4px;font-size:0.72rem;color:#6B7280;margin-top:4px;font-weight:500;"><i class="fas fa-map-marker-alt" style="color:#09B1BA;font-size:0.7rem;"></i> ' + locSafe + '</div>' : '') +
        '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;">' + modesHTML +
          (['furniture', 'vehicles', 'sports'].includes(item.category) ? '<span style="font-size:0.68rem;padding:2px 8px;border-radius:999px;font-weight:600;background:#FDF2F8;color:#9D174D;">\u{1F69B} Truck</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  global.SwappoItems = {
    browse, getById, create, remove, markStatus,
    getByUser, hasActiveItems,
    getGiveaways, getBoosted, getSimilar,
    toggleFavorite, getFavoriteIds, getFavorites, isFavorited, isFavoritedSync,
    bumpViews, renderCard
  };
})(window);
