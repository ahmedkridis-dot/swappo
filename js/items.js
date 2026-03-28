/* ============================================
   Swappo — Items CRUD + Photo Upload
   Depends on: supabase.js (db)
   ============================================ */

const SwappoItems = {

  // ---- Create a new item ----
  async create(itemData, photoFiles) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Connexion requise.');

    // Upload photos first
    const photoUrls = [];
    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}_${i}.${ext}`;

      const { error: uploadError } = await db.storage
        .from('item-photos')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = db.storage
        .from('item-photos')
        .getPublicUrl(path);

      photoUrls.push(urlData.publicUrl);
    }

    // Insert item
    const { data, error } = await db
      .from('items')
      .insert({
        user_id: user.id,
        category: itemData.category,
        type: itemData.type,
        brand: itemData.brand || null,
        model: itemData.model || null,
        condition: itemData.condition,
        year: itemData.year || null,
        size: itemData.size || null,
        color: itemData.color || null,
        material: itemData.material || null,
        photos: photoUrls,
        is_giveaway: itemData.is_giveaway || false,
        lat: itemData.lat || null,
        lng: itemData.lng || null,
        city: itemData.city || null,
        swap_for_categories: itemData.swap_for_categories || []
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ---- Get single item by ID ----
  async getById(itemId) {
    const { data, error } = await db
      .from('items')
      .select(`
        *,
        user:users(id, name, avatar_url, badge_tier, swap_count, created_at)
      `)
      .eq('id', itemId)
      .single();

    if (error) throw error;
    return data;
  },

  // ---- Browse items (catalogue) ----
  async browse({ category, condition, city, isGiveaway, sortBy, limit = 24, offset = 0, userLat, userLng } = {}) {
    let query = db
      .from('items')
      .select(`
        *,
        user:users(id, name, avatar_url, badge_tier)
      `, { count: 'exact' })
      .eq('status', 'active');

    // Filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (condition) {
      query = query.eq('condition', condition);
    }
    if (city) {
      query = query.ilike('city', `%${city}%`);
    }
    if (isGiveaway !== undefined) {
      query = query.eq('is_giveaway', isGiveaway);
    }

    // Sort: boosted first, then by date or distance
    switch (sortBy) {
      case 'newest':
        query = query.order('is_boosted', { ascending: false })
                     .order('created_at', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      default:
        // Default: boosted first, then newest
        query = query.order('is_boosted', { ascending: false })
                     .order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    // Calculate distances client-side if user position available
    let items = data || [];
    if (userLat && userLng) {
      items = items.map(item => {
        if (item.lat && item.lng) {
          item._distance = calculateDistance(userLat, userLng, item.lat, item.lng);
        } else {
          item._distance = null;
        }
        return item;
      });
    }

    return { items, total: count };
  },

  // ---- Get items by user ----
  async getByUser(userId) {
    const { data, error } = await db
      .from('items')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // ---- Update item ----
  async update(itemId, updates) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Connexion requise.');

    const { data, error } = await db
      .from('items')
      .update(updates)
      .eq('id', itemId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ---- Delete item (soft delete) ----
  async delete(itemId) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Connexion requise.');

    const { error } = await db
      .from('items')
      .update({ status: 'deleted' })
      .eq('id', itemId)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  // ---- Search items ----
  async search(query, limit = 20) {
    const { data, error } = await db
      .from('items')
      .select(`
        *,
        user:users(id, name, avatar_url, badge_tier)
      `)
      .eq('status', 'active')
      .or(`type.ilike.%${query}%,brand.ilike.%${query}%,model.ilike.%${query}%`)
      .order('is_boosted', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  // ---- Generate HTML card for an item ----
  renderCard(item, userLat, userLng) {
    const distance = (item.lat && item.lng && userLat && userLng)
      ? calculateDistance(userLat, userLng, item.lat, item.lng)
      : null;

    const distanceText = distance !== null ? `${distance} km` : item.city || '';
    const photo = item.photos?.[0] || 'https://placehold.co/300x300?text=No+Photo';
    const badgeEmoji = getBadgeEmoji(item.user?.badge_tier);
    const cost = getCategoryCost(item.category);
    const conditionLabels = {
      new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair', worn: 'Worn'
    };

    return `
      <a href="/pages/product.html?id=${item.id}" class="product-card" data-category="${item.category}" data-id="${item.id}">
        <div class="product-img">
          <img src="${photo}" alt="${item.type}" loading="lazy">
          ${item.is_boosted ? '<span class="product-badge boost">⚡ Boosted</span>' : ''}
          ${item.is_giveaway ? '<span class="product-badge giveaway">🎁 Free</span>' : ''}
          <button class="product-fav" onclick="event.preventDefault(); toggleFavorite('${item.id}')">
            <i class="far fa-heart"></i>
          </button>
        </div>
        <div class="product-info">
          <div class="product-title">${item.brand ? item.brand + ' ' : ''}${item.type}</div>
          <div class="product-meta">
            <span class="product-condition">${conditionLabels[item.condition] || item.condition}</span>
            ${item.color ? `<span class="product-color">${item.color}</span>` : ''}
          </div>
          <div class="product-bottom">
            <span class="product-location">
              <i class="fas fa-map-marker-alt"></i> ${distanceText}
            </span>
            <span class="product-points">
              <i class="fas fa-coins"></i> ${cost} pts
            </span>
          </div>
          <div class="product-user">
            ${badgeEmoji} ${item.user?.badge_tier || 'newcomer'}
          </div>
        </div>
      </a>
    `;
  }
};
