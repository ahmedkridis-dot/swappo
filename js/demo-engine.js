/**
 * Swappo — Demo Engine
 * =====================
 * Replaces Supabase with localStorage for fully offline demo.
 * Provides: DemoAuth, DemoSubscription, DemoItems, DemoSwaps, DemoChat,
 *           DemoNotifications, DemoGiveaway, updateNavbarForDemo, initDemoMode
 */

/* ═══════════════════════════════════════════════════════════════════════════
   STORAGE HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const STORAGE_KEYS = {
  USERS:          'swappo_users',
  CURRENT_USER:   'swappo_current_user',
  SUBSCRIPTIONS:  'swappo_subscriptions',
  USER_ITEMS:     'swappo_user_items',
  FAVORITES:      'swappo_favorites',
  SWAPS:          'swappo_swaps',
  CONVERSATIONS:  'swappo_conversations',
  CLAIMS:         'swappo_claims',
  NOTIFICATIONS:  'swappo_notifications',
  FIRST_VISIT:    'swappo_first_visit'
};

function _get(key) {
  try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
}

function _set(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function _getArray(key) {
  return _get(key) || [];
}

function _uid() {
  return 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function _iid() {
  return 'item_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function _sid() {
  return 'swap_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

/** Detect whether we are inside /pages/ subfolder */
function _inPagesDir() {
  return window.location.pathname.includes('/pages/');
}

/** Build the correct product href depending on current page depth */
function _productHref(itemId) {
  return _inPagesDir()
    ? 'product.html?id=' + itemId
    : 'pages/product.html?id=' + itemId;
}

/** Format condition label */
function _conditionLabel(c) {
  const map = { new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair' };
  return map[c] || c;
}

/** Get category metadata for display */
function _categoryMeta(catKey) {
  const meta = (window.CATEGORY_META || []).find(m => m.key === catKey);
  return meta || { key: catKey, label: catKey, icon: '\u{1F4E6}' };
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. DemoAuth — Authentication
   ═══════════════════════════════════════════════════════════════════════════ */

const DemoAuth = {

  /** Sign up a new user. Returns { success, user?, error? } */
  signUp(email, password, name, extras = {}) {
    if (!email || !password || !name) {
      return { success: false, error: 'All fields are required.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    email = email.trim().toLowerCase();
    name = name.trim();

    // Check demo users
    if (email === DEMO_USER.email || (typeof DEMO_USER_FREE !== 'undefined' && email === DEMO_USER_FREE.email)) {
      return { success: false, error: 'Email already registered.' };
    }

    // Check existing users
    const users = _getArray(STORAGE_KEYS.USERS);
    if (users.some(u => u.email === email)) {
      return { success: false, error: 'Email already registered.' };
    }

    const avatarColors = ['#09B1BA','#FF4B55','#FF8C00','#8B5CF6','#059669','#EC4899','#F59E0B','#6366F1'];
    const newUser = {
      id: _uid(),
      name: name,
      email: email,
      password: password,
      city: '',
      badge_tier: 'newcomer',
      badge_emoji: '\u{1F331}',
      swap_count: 0,
      plan: 'free',
      swaps_used: 0,
      claims_used: 0,
      boosts_used: 0,
      billing_start: new Date().toISOString().slice(0, 10),
      avatar_color: avatarColors[Math.floor(Math.random() * avatarColors.length)],
      gender: extras.gender || '',
      pseudo: extras.pseudo || name.split(' ')[0].toLowerCase(),
      avatar: extras.avatar || 'happy',
      phone: extras.phone || '',
      phone_verified: !!extras.phone,
      email_verified: false,
      created_at: new Date().toISOString().slice(0, 10)
    };

    users.push(newUser);
    _set(STORAGE_KEYS.USERS, users);

    // Initialize subscription data
    DemoSubscription._initUser(newUser.id, 'free');

    // Auto-login
    _set(STORAGE_KEYS.CURRENT_USER, newUser);

    // Early adopter auto-enrollment
    const earlyResult = DemoEarlyAdopter.register(newUser.id);
    if (earlyResult.isPioneer) {
      newUser.badges = ['pioneer'];
      // Update stored user
      const users = _getArray(STORAGE_KEYS.USERS);
      const idx = users.findIndex(u => u.id === newUser.id);
      if (idx >= 0) users[idx] = newUser;
      _set(STORAGE_KEYS.USERS, users);
    }

    return { success: true, user: newUser };
  },

  /** Sign in. Returns { success, user?, error? } */
  signIn(email, password) {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' };
    }
    email = email.trim().toLowerCase();

    // Check demo users (premium + free)
    if (email === DEMO_USER.email && password === DEMO_USER.password) {
      _set(STORAGE_KEYS.CURRENT_USER, DEMO_USER);
      return { success: true, user: DEMO_USER };
    }
    if (typeof DEMO_USER_FREE !== 'undefined' && email === DEMO_USER_FREE.email && password === DEMO_USER_FREE.password) {
      _set(STORAGE_KEYS.CURRENT_USER, DEMO_USER_FREE);
      return { success: true, user: DEMO_USER_FREE };
    }

    // Check registered users
    const users = _getArray(STORAGE_KEYS.USERS);
    const found = users.find(u => u.email === email && u.password === password);
    if (found) {
      _set(STORAGE_KEYS.CURRENT_USER, found);
      return { success: true, user: found };
    }

    return { success: false, error: 'Invalid email or password.' };
  },

  /** Sign out */
  signOut() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  /** Get current user object or null */
  getCurrentUser() {
    const user = _get(STORAGE_KEYS.CURRENT_USER);
    if (!user) return null;

    // Refresh subscription data
    const subData = DemoSubscription._getSubData(user.id);
    if (subData) {
      user.plan = subData.plan;
      user.swaps_used = subData.swaps_used;
      user.claims_used = subData.claims_used;
      user.boosts_used = subData.boosts_used;
      user.billing_start = subData.billing_start;
    }

    if (user.id !== 'user-demo' && user.id !== DEMO_USER.id) {
      const users = _getArray(STORAGE_KEYS.USERS);
      const fresh = users.find(u => u.id === user.id);
      if (fresh) {
        Object.assign(user, fresh);
        // Re-apply subscription overlay
        if (subData) {
          user.plan = subData.plan;
          user.swaps_used = subData.swaps_used;
          user.claims_used = subData.claims_used;
          user.boosts_used = subData.boosts_used;
          user.billing_start = subData.billing_start;
        }
      }
    }
    return user;
  },

  /** Get full user profile */
  getUserProfile(userId) {
    let user = null;
    if (userId === 'user-demo') {
      user = { ...DEMO_USER };
    } else {
      // Check localStorage users first
      const users = _getArray(STORAGE_KEYS.USERS);
      user = users.find(u => u.id === userId);
      if (!user) {
        // Check mock users
        user = MOCK_USERS.find(u => u.id === userId);
      }
      if (!user) return null;
      user = { ...user };
    }

    // Overlay subscription data
    const subData = DemoSubscription._getSubData(userId);
    if (subData) {
      user.plan = subData.plan;
      user.swaps_used = subData.swaps_used;
      user.claims_used = subData.claims_used;
      user.boosts_used = subData.boosts_used;
      user.billing_start = subData.billing_start;
    }

    user.items = DemoItems.getByUser(userId);
    user.swaps = DemoSwaps.getForUser(userId);
    user.favorites = DemoItems.getFavorites();
    return user;
  },

  /** Check if logged in */
  isLoggedIn() {
    return _get(STORAGE_KEYS.CURRENT_USER) !== null;
  },

  /** Redirect to login if not authenticated */
  requireAuth() {
    if (!this.isLoggedIn()) {
      const loginPath = _inPagesDir() ? 'login.html' : 'pages/login.html';
      window.location.href = loginPath;
      return false;
    }
    return true;
  },

  /** Update user profile data */
  updateProfile(userId, data) {
    if (userId === 'user-demo') {
      // Update session copy
      const current = _get(STORAGE_KEYS.CURRENT_USER);
      if (current && current.id === 'user-demo') {
        Object.assign(current, data);
        _set(STORAGE_KEYS.CURRENT_USER, current);
      }
      return true;
    }

    const users = _getArray(STORAGE_KEYS.USERS);
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return false;
    Object.assign(users[idx], data);
    _set(STORAGE_KEYS.USERS, users);

    // Update current session if same user
    const current = _get(STORAGE_KEYS.CURRENT_USER);
    if (current && current.id === userId) {
      Object.assign(current, data);
      _set(STORAGE_KEYS.CURRENT_USER, current);
    }
    return true;
  }
};


/* ═══════════════════════════════════════════════════════════════════════════
   2. DemoSubscription — Subscription & quota management
   ═══════════════════════════════════════════════════════════════════════════ */

const DemoSubscription = {

  /** Internal: get subscription data for a user from localStorage */
  _getSubData(userId) {
    const subs = _get(STORAGE_KEYS.SUBSCRIPTIONS) || {};
    if (subs[userId]) return subs[userId];

    // Fallback: seed from mock data or DEMO_USER
    let source = null;
    if (userId === 'user-demo') {
      source = DEMO_USER;
    } else {
      source = MOCK_USERS.find(u => u.id === userId);
    }
    if (!source) {
      // New user with no data — default to free
      return { plan: 'free', swaps_used: 0, claims_used: 0, boosts_used: 0, billing_start: new Date().toISOString().slice(0, 10) };
    }

    return {
      plan: source.plan || 'free',
      swaps_used: source.swaps_used || 0,
      claims_used: source.claims_used || 0,
      boosts_used: source.boosts_used || 0,
      billing_start: source.billing_start || new Date().toISOString().slice(0, 10)
    };
  },

  /** Internal: save subscription data */
  _setSubData(userId, data) {
    const subs = _get(STORAGE_KEYS.SUBSCRIPTIONS) || {};
    subs[userId] = data;
    _set(STORAGE_KEYS.SUBSCRIPTIONS, subs);
  },

  /** Internal: initialize a new user's subscription */
  _initUser(userId, plan) {
    this._setSubData(userId, {
      plan: plan || 'free',
      swaps_used: 0,
      claims_used: 0,
      boosts_used: 0,
      billing_start: new Date().toISOString().slice(0, 10)
    });
  },

  /** Get current user's plan info */
  getPlan(userId) {
    const sub = this._getSubData(userId);
    const tier = SUBSCRIPTION_TIERS[sub.plan] || SUBSCRIPTION_TIERS.free;

    // Calculate next renewal (billing_start + 1 month)
    const billingDate = new Date(sub.billing_start);
    const nextRenewal = new Date(billingDate);
    nextRenewal.setMonth(nextRenewal.getMonth() + 1);

    return {
      plan: sub.plan,
      tier: tier,
      swaps_used: sub.swaps_used,
      swaps_limit: tier.swaps,
      claims_used: sub.claims_used,
      claims_limit: tier.claims,
      boosts_used: sub.boosts_used,
      boosts_limit: tier.boosts,
      billing_start: sub.billing_start,
      next_renewal: nextRenewal.toISOString().slice(0, 10)
    };
  },

  /** Check if user can swap */
  canSwap(userId) {
    const sub = this._getSubData(userId);
    const tier = SUBSCRIPTION_TIERS[sub.plan] || SUBSCRIPTION_TIERS.free;
    if (tier.swaps === Infinity) return true;
    return sub.swaps_used < tier.swaps;
  },

  /** Use a swap from quota. Returns { success, remaining } */
  useSwap(userId) {
    const sub = this._getSubData(userId);
    const tier = SUBSCRIPTION_TIERS[sub.plan] || SUBSCRIPTION_TIERS.free;

    if (tier.swaps !== Infinity && sub.swaps_used >= tier.swaps) {
      return { success: false, remaining: 0 };
    }

    sub.swaps_used += 1;
    this._setSubData(userId, sub);

    const remaining = tier.swaps === Infinity ? Infinity : (tier.swaps - sub.swaps_used);
    return { success: true, remaining: remaining };
  },

  /** Check if user can claim giveaway */
  canClaim(userId) {
    const sub = this._getSubData(userId);
    const tier = SUBSCRIPTION_TIERS[sub.plan] || SUBSCRIPTION_TIERS.free;
    return sub.claims_used < tier.claims;
  },

  /** Use a claim. Returns { success, remaining } */
  useClaim(userId) {
    const sub = this._getSubData(userId);
    const tier = SUBSCRIPTION_TIERS[sub.plan] || SUBSCRIPTION_TIERS.free;

    if (sub.claims_used >= tier.claims) {
      return { success: false, remaining: 0 };
    }

    sub.claims_used += 1;
    this._setSubData(userId, sub);

    return { success: true, remaining: tier.claims - sub.claims_used };
  },

  /** Check if user can boost */
  canBoost(userId) {
    const sub = this._getSubData(userId);
    const tier = SUBSCRIPTION_TIERS[sub.plan] || SUBSCRIPTION_TIERS.free;
    return sub.boosts_used < tier.boosts;
  },

  /** Use a boost. Returns { success, remaining } */
  useBoost(userId) {
    const sub = this._getSubData(userId);
    const tier = SUBSCRIPTION_TIERS[sub.plan] || SUBSCRIPTION_TIERS.free;

    if (sub.boosts_used >= tier.boosts) {
      return { success: false, remaining: 0 };
    }

    sub.boosts_used += 1;
    this._setSubData(userId, sub);

    return { success: true, remaining: tier.boosts - sub.boosts_used };
  },

  /** Upgrade plan */
  upgradePlan(userId, newPlan) {
    if (!SUBSCRIPTION_TIERS[newPlan]) {
      return { success: false, error: 'Invalid plan.' };
    }

    const sub = this._getSubData(userId);
    const oldPlan = sub.plan;
    sub.plan = newPlan;
    // Reset usage on upgrade
    sub.swaps_used = 0;
    sub.claims_used = 0;
    sub.boosts_used = 0;
    sub.billing_start = new Date().toISOString().slice(0, 10);
    this._setSubData(userId, sub);

    // Update user record too
    DemoAuth.updateProfile(userId, { plan: newPlan });

    DemoNotifications.add({
      type: 'plan_upgraded',
      title: 'Plan Upgraded!',
      message: 'You upgraded from ' + (SUBSCRIPTION_TIERS[oldPlan] || {}).name + ' to ' + SUBSCRIPTION_TIERS[newPlan].name + '. Enjoy your new benefits!',
      created_at: new Date().toISOString()
    });

    return { success: true, plan: newPlan };
  },

  /** Get remaining counts */
  getRemaining(userId) {
    const sub = this._getSubData(userId);
    const tier = SUBSCRIPTION_TIERS[sub.plan] || SUBSCRIPTION_TIERS.free;

    return {
      swaps: tier.swaps === Infinity ? Infinity : Math.max(0, tier.swaps - sub.swaps_used),
      claims: Math.max(0, tier.claims - sub.claims_used),
      boosts: Math.max(0, tier.boosts - sub.boosts_used)
    };
  }
};


/* ═══════════════════════════════════════════════════════════════════════════
   3. DemoItems — Item CRUD
   ═══════════════════════════════════════════════════════════════════════════ */

const DemoItems = {

  /** Get all items (mock + user-created), with optional filters */
  browse({ category, condition, search, sortBy, limit, offset } = {}) {
    let items = [...MOCK_ITEMS, ..._getArray(STORAGE_KEYS.USER_ITEMS)];

    // Only active items
    items = items.filter(i => i.status === 'active');

    if (category) {
      items = items.filter(i => i.category === category);
    }
    if (condition) {
      items = items.filter(i => i.condition === condition);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        (i.brand && i.brand.toLowerCase().includes(q)) ||
        (i.model && i.model.toLowerCase().includes(q)) ||
        (i.type && i.type.toLowerCase().includes(q)) ||
        (i.category && i.category.toLowerCase().includes(q))
      );
    }

    // Sort
    switch (sortBy) {
      case 'closest':
        items.sort((a, b) => (a.distance || 999) - (b.distance || 999));
        break;
      case 'popular':
        items.sort((a, b) => (b.favorites_count || 0) - (a.favorites_count || 0));
        break;
      case 'oldest':
        items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'newest':
      default:
        // Boosted first, then newest
        items.sort((a, b) => {
          if (a.is_boosted && !b.is_boosted) return -1;
          if (!a.is_boosted && b.is_boosted) return 1;
          return new Date(b.created_at) - new Date(a.created_at);
        });
        break;
    }

    const total = items.length;
    if (offset) items = items.slice(offset);
    if (limit) items = items.slice(0, limit);

    return { items, total };
  },

  /** Get single item by ID */
  getById(itemId) {
    const mock = MOCK_ITEMS.find(i => i.id === itemId);
    if (mock) return mock;
    const user = _getArray(STORAGE_KEYS.USER_ITEMS).find(i => i.id === itemId);
    return user || null;
  },

  /** Create new item */
  create(itemData) {
    const user = DemoAuth.getCurrentUser();
    if (!user) return { success: false, error: 'Must be logged in.' };

    const newItem = {
      id: _iid(),
      user_id: user.id,
      category: itemData.category || 'other',
      type: itemData.type || '',
      brand: itemData.brand || '',
      model: itemData.model || '',
      condition: itemData.condition || 'good',
      year: itemData.year || new Date().getFullYear(),
      size: itemData.size || null,
      color: itemData.color || null,
      photos: itemData.photos || [],
      is_giveaway: itemData.is_giveaway || false,
      is_boosted: false,
      boost_expires_at: null,
      status: 'active',
      created_at: new Date().toISOString().slice(0, 10),
      lat: itemData.lat || 25.0780,
      lng: itemData.lng || 55.1340,
      city: itemData.city || user.city || 'Dubai',
      distance: itemData.distance || Math.round(Math.random() * 20 * 10) / 10,
      favorites_count: 0,
      views_count: 0
    };

    const items = _getArray(STORAGE_KEYS.USER_ITEMS);
    items.push(newItem);
    _set(STORAGE_KEYS.USER_ITEMS, items);

    DemoNotifications.add({
      type: 'item_published',
      title: 'Item Published!',
      message: newItem.brand + ' ' + newItem.model + ' is now live on Swap Market.',
      created_at: new Date().toISOString()
    });

    return { success: true, item: newItem };
  },

  /** Get items by user ID */
  getByUser(userId) {
    const mockItems = MOCK_ITEMS.filter(i => i.user_id === userId);
    const userItems = _getArray(STORAGE_KEYS.USER_ITEMS).filter(i => i.user_id === userId);
    return [...mockItems, ...userItems];
  },

  /** Get giveaway items only */
  getGiveaways() {
    const all = [...MOCK_ITEMS, ..._getArray(STORAGE_KEYS.USER_ITEMS)];
    return all.filter(i => i.is_giveaway === true && i.status === 'active');
  },

  /** Get boosted items */
  getBoosted() {
    const all = [...MOCK_ITEMS, ..._getArray(STORAGE_KEYS.USER_ITEMS)];
    return all.filter(i => i.is_boosted === true && i.status === 'active');
  },

  /** Toggle favorite */
  toggleFavorite(itemId) {
    let favs = _getArray(STORAGE_KEYS.FAVORITES);
    const idx = favs.indexOf(itemId);
    if (idx >= 0) {
      favs.splice(idx, 1);
    } else {
      favs.push(itemId);
    }
    _set(STORAGE_KEYS.FAVORITES, favs);
    return idx < 0; // returns true if now favorited
  },

  /** Get favorited item IDs */
  getFavorites() {
    return _getArray(STORAGE_KEYS.FAVORITES);
  },

  /** Check if user has at least one active item */
  hasActiveItems(userId) {
    const allItems = [...MOCK_ITEMS, ..._getArray(STORAGE_KEYS.USER_ITEMS)];
    return allItems.some(i => i.user_id === userId && i.status === 'active');
  },

  /** Check if item is favorited */
  isFavorited(itemId) {
    return _getArray(STORAGE_KEYS.FAVORITES).includes(itemId);
  },

  /** Get similar items (same category, exclude current) */
  getSimilar(itemId, limit) {
    limit = limit || 4;
    const item = this.getById(itemId);
    if (!item) return [];
    const all = [...MOCK_ITEMS, ..._getArray(STORAGE_KEYS.USER_ITEMS)];
    return all
      .filter(i => i.category === item.category && i.id !== itemId && i.status === 'active')
      .slice(0, limit);
  },

  /** Render a product card HTML string */
  renderCard(item) {
    if (!item) return '';

    const href = _productHref(item.id);
    const title = (item.brand + ' ' + item.model).trim();
    const photo = (item.photos && item.photos[0]) || '';
    const fav = this.isFavorited(item.id);
    const conditionStr = item.condition ? _conditionLabel(item.condition) : '';
    const catMeta = _categoryMeta(item.category);

    // Price + mode badges (v5 marketplace)
    let priceHTML = '';
    let modesHTML = '';
    if (item.is_giveaway) {
      priceHTML = '<div class="product-price" style="color:var(--secondary);font-weight:800;font-size:15px;">FREE</div>';
      modesHTML = '<span class="mode-badge mode-gift" style="font-size:0.68rem;padding:2px 8px;border-radius:999px;font-weight:600;background:#ECFDF5;color:#065F46;">Gift</span>';
    } else {
      const price = item.price || 0;
      priceHTML = '<div class="product-price" style="font-weight:800;font-size:15px;color:#1A1A2E;">' + price.toLocaleString() + ' <span style="font-size:11px;font-weight:600;color:#6B7280;">AED</span></div>';
      modesHTML = '<span class="mode-badge mode-swap" style="font-size:0.68rem;padding:2px 8px;border-radius:999px;font-weight:600;background:#E6F7F8;color:#078A91;">Swap</span>' +
        '<span class="mode-badge mode-buy" style="font-size:0.68rem;padding:2px 8px;border-radius:999px;font-weight:600;background:#FEF3C7;color:#92400E;">Buy</span>';
    }

    return '<div class="product-card" onclick="window.location.href=\'' + href + '\'" style="cursor:pointer">' +
      '<div class="product-img">' +
        '<img src="' + photo + '" alt="' + title + '" loading="lazy">' +
        '<button class="product-fav" style="top:8px; bottom:auto;" onclick="event.stopPropagation(); DemoItems.toggleFavorite(\'' + item.id + '\'); this.querySelector(\'i\').className = DemoItems.isFavorited(\'' + item.id + '\') ? \'fas fa-heart\' : \'far fa-heart\';">' +
          '<i class="' + (fav ? 'fas fa-heart' : 'far fa-heart') + '"></i>' +
        '</button>' +
      '</div>' +
      '<div class="product-info">' +
        '<div class="product-brand">' + title + '</div>' +
        (conditionStr ? '<div class="product-details">' + conditionStr + '</div>' : '') +
        priceHTML +
        '<div style="display:flex;gap:4px;margin-top:4px;">' + modesHTML + '</div>' +
      '</div>' +
    '</div>';
  }
};


/* ═══════════════════════════════════════════════════════════════════════════
   4. DemoSwaps — Swap proposals
   ═══════════════════════════════════════════════════════════════════════════ */

const DemoSwaps = {

  /** Propose a swap */
  propose(myItemId, theirItemId) {
    const user = DemoAuth.getCurrentUser();
    if (!user) return { success: false, error: 'Must be logged in.' };

    const myItem = DemoItems.getById(myItemId);
    const theirItem = DemoItems.getById(theirItemId);
    if (!myItem || !theirItem) return { success: false, error: 'Item not found.' };

    if (theirItem.user_id === user.id) return { success: false, error: 'Cannot swap with yourself.' };

    // Check subscription quota
    if (!DemoSubscription.canSwap(user.id)) {
      const plan = DemoSubscription.getPlan(user.id);
      return { success: false, error: 'You have used all ' + plan.swaps_limit + ' swaps this month. Upgrade your plan for more!' };
    }

    // Use a swap from quota
    DemoSubscription.useSwap(user.id);

    const swap = {
      id: _sid(),
      proposer_id: user.id,
      receiver_id: theirItem.user_id,
      proposer_item_id: myItemId,
      receiver_item_id: theirItemId,
      status: 'pending',
      created_at: new Date().toISOString().slice(0, 10),
      completed_at: null,
      rating: null
    };

    const swaps = _getArray(STORAGE_KEYS.SWAPS);
    swaps.push(swap);
    _set(STORAGE_KEYS.SWAPS, swaps);

    DemoNotifications.add({
      type: 'swap_proposed',
      title: 'Swap Proposed!',
      message: 'You proposed swapping your ' + myItem.brand + ' ' + myItem.model + ' for ' + theirItem.brand + ' ' + theirItem.model + '.',
      created_at: new Date().toISOString()
    });

    return { success: true, swap };
  },

  /** Accept or reject a swap */
  respond(swapId, accept) {
    // Check localStorage swaps
    const swaps = _getArray(STORAGE_KEYS.SWAPS);
    const idx = swaps.findIndex(s => s.id === swapId);

    if (idx >= 0) {
      if (accept) {
        const swap = swaps[idx];
        const user = DemoAuth.getCurrentUser();

        // Check acceptor's subscription quota
        if (!DemoSubscription.canSwap(swap.receiver_id)) {
          const plan = DemoSubscription.getPlan(swap.receiver_id);
          return { success: false, error: 'Insufficient swap quota. Upgrade your plan for more swaps!' };
        }

        // Use a swap from the acceptor's quota
        DemoSubscription.useSwap(swap.receiver_id);

        swaps[idx].status = 'accepted';
        swaps[idx].completed_at = new Date().toISOString().slice(0, 10);
      } else {
        swaps[idx].status = 'rejected';
      }
      _set(STORAGE_KEYS.SWAPS, swaps);

      DemoNotifications.add({
        type: accept ? 'swap_accepted' : 'swap_rejected',
        title: accept ? 'Swap Accepted!' : 'Swap Declined',
        message: accept ? 'Both identities have been revealed. You can now chat!' : 'The swap proposal was declined.',
        created_at: new Date().toISOString()
      });

      return { success: true, swap: swaps[idx] };
    }

    return { success: false, error: 'Swap not found.' };
  },

  /** Get swaps for a user */
  getForUser(userId) {
    const localSwaps = _getArray(STORAGE_KEYS.SWAPS);
    const mockSwaps = MOCK_SWAPS || [];
    const all = [...mockSwaps, ...localSwaps];
    return all.filter(s => s.proposer_id === userId || s.receiver_id === userId);
  },

  /** Get swap by ID */
  getById(swapId) {
    const local = _getArray(STORAGE_KEYS.SWAPS).find(s => s.id === swapId);
    if (local) return local;
    return (MOCK_SWAPS || []).find(s => s.id === swapId) || null;
  },

  // Get swaps proposed BY the user (sent requests)
  getSent(userId) {
    const all = [...MOCK_SWAPS, ..._getArray(STORAGE_KEYS.SWAPS)];
    return all.filter(s => s.proposer_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  // Get swaps proposed TO the user (received requests)
  getReceived(userId) {
    const all = [...MOCK_SWAPS, ..._getArray(STORAGE_KEYS.SWAPS)];
    return all.filter(s => s.receiver_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  // Get completed/rejected/cancelled swaps (history)
  getHistory(userId) {
    const all = [...MOCK_SWAPS, ..._getArray(STORAGE_KEYS.SWAPS)];
    return all.filter(s =>
      (s.proposer_id === userId || s.receiver_id === userId) &&
      ['completed', 'rejected', 'cancelled', 'expired'].includes(s.status)
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  // Get count of pending requests (for badge)
  getPendingCount(userId) {
    const all = [...MOCK_SWAPS, ..._getArray(STORAGE_KEYS.SWAPS)];
    return all.filter(s =>
      (s.proposer_id === userId || s.receiver_id === userId) && s.status === 'pending'
    ).length;
  },

  // Cancel a pending swap (by proposer)
  cancel(swapId) {
    const user = DemoAuth.getCurrentUser();
    if (!user) return { success: false, error: 'Not logged in' };

    let swaps = _getArray(STORAGE_KEYS.SWAPS);
    let swap = swaps.find(s => s.id === swapId);
    let isMock = false;

    if (!swap) {
      swap = MOCK_SWAPS.find(s => s.id === swapId);
      isMock = true;
    }
    if (!swap) return { success: false, error: 'Swap not found' };
    if (swap.proposer_id !== user.id) return { success: false, error: 'Not your swap' };
    if (swap.status !== 'pending') return { success: false, error: 'Can only cancel pending swaps' };

    if (isMock) {
      swap = Object.assign({}, swap);
      swaps.push(swap);
    }
    swap.status = 'cancelled';
    swap.completed_at = new Date().toISOString().slice(0, 10);
    _set(STORAGE_KEYS.SWAPS, swaps);

    DemoNotifications.add({
      type: 'swap_cancelled',
      title: 'Swap Cancelled',
      message: 'You cancelled your swap request.'
    });

    return { success: true };
  },

  // Rate a completed swap
  rate(swapId, stars) {
    if (stars < 1 || stars > 5) return { success: false, error: 'Rating must be 1-5' };

    let swaps = _getArray(STORAGE_KEYS.SWAPS);
    let swap = swaps.find(s => s.id === swapId);
    let isMock = false;

    if (!swap) {
      swap = MOCK_SWAPS.find(s => s.id === swapId);
      isMock = true;
    }
    if (!swap) return { success: false, error: 'Swap not found' };
    if (swap.status !== 'completed' && swap.status !== 'accepted') return { success: false, error: 'Can only rate completed swaps' };

    if (isMock) {
      swap = Object.assign({}, swap);
      swaps.push(swap);
    }
    swap.rating = stars;
    _set(STORAGE_KEYS.SWAPS, swaps);

    return { success: true };
  },

  // Check for expired swaps (7 days without response)
  checkExpired() {
    const now = new Date();
    const all = [...MOCK_SWAPS, ..._getArray(STORAGE_KEYS.SWAPS)];
    let swaps = _getArray(STORAGE_KEYS.SWAPS);
    let changed = false;

    all.forEach(s => {
      if (s.status === 'pending') {
        const created = new Date(s.created_at);
        const daysDiff = (now - created) / (1000 * 60 * 60 * 24);
        if (daysDiff >= 7) {
          let local = swaps.find(ls => ls.id === s.id);
          if (!local) {
            local = Object.assign({}, s);
            swaps.push(local);
          }
          local.status = 'expired';
          local.completed_at = new Date().toISOString().slice(0, 10);
          changed = true;
        }
      }
    });

    if (changed) _set(STORAGE_KEYS.SWAPS, swaps);
  }
};


/* ═══════════════════════════════════════════════════════════════════════════
   5. DemoChat — Messaging
   ═══════════════════════════════════════════════════════════════════════════ */

const DemoChat = {

  /** Get all conversations for current user */
  getConversations() {
    const user = DemoAuth.getCurrentUser();
    if (!user) return [];

    const localConvs = _getArray(STORAGE_KEYS.CONVERSATIONS);
    // Merge with mock conversations matching this user
    let convs = [];
    (MOCK_CONVERSATIONS || []).forEach(c => {
      if (c.for_user === user.id || (!c.for_user && user.id === 'user-demo')) {
        convs.push(c);
      }
    });

    // Add local conversations involving this user
    localConvs.forEach(c => {
      if (convs.find(existing => existing.id === c.id)) return;
      // Check if this user is part of this conversation
      var uids = [c.user1_id, c.user2_id, (c.other_user && c.other_user.id)].filter(Boolean);
      if (uids.includes(user.id) || c.user1_id === user.id || c.user2_id === user.id) {
        convs.push(c);
      }
    });

    return convs.sort((a, b) => {
      const aLast = a.messages && a.messages.length ? a.messages[a.messages.length - 1].created_at : '';
      const bLast = b.messages && b.messages.length ? b.messages[b.messages.length - 1].created_at : '';
      return new Date(bLast) - new Date(aLast);
    });
  },

  /** Get messages for a conversation */
  getMessages(conversationId) {
    // Check mock first
    const mockConv = (MOCK_CONVERSATIONS || []).find(c => c.id === conversationId);
    if (mockConv) return mockConv.messages || [];

    const localConvs = _getArray(STORAGE_KEYS.CONVERSATIONS);
    const conv = localConvs.find(c => c.id === conversationId);
    return conv ? (conv.messages || []) : [];
  },

  /** Send a message (auto-filter phone/email/links) */
  sendMessage(conversationId, content) {
    const user = DemoAuth.getCurrentUser();
    if (!user) return { success: false, error: 'Must be logged in.' };
    if (!content || !content.trim()) return { success: false, error: 'Message cannot be empty.' };

    const filtered = this.filterContactInfo(content);
    const wasFiltered = filtered !== content;

    const msg = {
      id: 'msg_' + Date.now(),
      sender_id: user.id,
      content: filtered,
      created_at: new Date().toISOString(),
      is_system: false
    };

    const messages = [msg];

    if (wasFiltered) {
      messages.push({
        id: 'msg_' + (Date.now() + 1),
        sender_id: 'system',
        content: '\u26A0\uFE0F Contact info is filtered for your safety',
        created_at: new Date().toISOString(),
        is_system: true
      });
    }

    // Try to find in mock conversations first (for demo user)
    let found = false;
    const mockConv = (MOCK_CONVERSATIONS || []).find(c => c.id === conversationId);
    if (mockConv) {
      messages.forEach(m => mockConv.messages.push(m));
      mockConv.last_message = filtered;
      found = true;
    }

    if (!found) {
      const localConvs = _getArray(STORAGE_KEYS.CONVERSATIONS);
      const idx = localConvs.findIndex(c => c.id === conversationId);
      if (idx >= 0) {
        messages.forEach(m => localConvs[idx].messages.push(m));
        localConvs[idx].last_message = filtered;
        _set(STORAGE_KEYS.CONVERSATIONS, localConvs);
      }
    }

    return { success: true, messages, wasFiltered };
  },

  /** Filter contact info from message text */
  filterContactInfo(text) {
    if (!text) return text;

    // Phone numbers: sequences of 7+ digits (with optional separators)
    text = text.replace(/(\+?\d[\d\s\-().]{6,}\d)/g, '***');

    // Email addresses
    text = text.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '***');

    // URLs: http, https, www
    text = text.replace(/https?:\/\/[^\s]+/gi, '***');
    text = text.replace(/www\.[^\s]+/gi, '***');

    return text;
  },

  /** Send a message to another user (creates conversation if needed) */
  send(fromUserId, toUserId, content) {
    if (!fromUserId || !toUserId || !content) return { success: false };

    const filtered = this.filterContactInfo(content);
    const localConvs = _getArray(STORAGE_KEYS.CONVERSATIONS);

    // Find existing conversation between these 2 users
    let conv = localConvs.find(c => {
      var uids = [c.user1_id, c.user2_id, (c.other_user && c.other_user.id)].filter(Boolean);
      return uids.includes(fromUserId) && uids.includes(toUserId);
    });

    // Also check mock conversations
    if (!conv && (fromUserId === 'user-demo' || toUserId === 'user-demo')) {
      conv = (MOCK_CONVERSATIONS || []).find(c => {
        return c.other_user && (c.other_user.id === toUserId || c.other_user.id === fromUserId);
      });
      if (conv) {
        // Add message to mock conversation directly
        conv.messages.push({
          id: 'msg_' + Date.now(),
          sender_id: fromUserId,
          content: filtered,
          created_at: new Date().toISOString(),
          is_system: false
        });
        conv.last_message = filtered;
        conv.unread_count = (conv.unread_count || 0) + 1;
        return { success: true, conversationId: conv.id };
      }
    }

    if (!conv) {
      // Create new conversation
      var otherUser = MOCK_USERS.find(u => u.id === toUserId) || { id: toUserId, name: 'User', pseudo: 'user', avatar_color: '#6B7280' };
      conv = {
        id: 'conv_' + Date.now(),
        user1_id: fromUserId,
        user2_id: toUserId,
        other_user: otherUser,
        item_title: '',
        last_message: filtered,
        unread_count: 0,
        messages: []
      };
      localConvs.push(conv);
    }

    conv.messages.push({
      id: 'msg_' + Date.now(),
      sender_id: fromUserId,
      content: filtered,
      created_at: new Date().toISOString(),
      is_system: false
    });
    conv.last_message = filtered;

    _set(STORAGE_KEYS.CONVERSATIONS, localConvs);
    return { success: true, conversationId: conv.id };
  },

  /** Get unread count */
  getUnreadCount() {
    const user = DemoAuth.getCurrentUser();
    if (!user) return 0;

    let count = 0;
    const convs = this.getConversations();
    convs.forEach(c => { count += (c.unread_count || 0); });
    return count;
  }
};


/* ═══════════════════════════════════════════════════════════════════════════
   6. DemoNotifications — Toast notifications
   ═══════════════════════════════════════════════════════════════════════════ */

const DemoNotifications = {

  /** Show toast at bottom-right */
  showToast(message, type, duration) {
    type = type || 'info';
    duration = duration || 4000;

    // Remove existing toast
    const existing = document.getElementById('swappo-toast');
    if (existing) existing.remove();

    const iconMap = {
      success: '<i class="fas fa-check-circle"></i>',
      error: '<i class="fas fa-exclamation-circle"></i>',
      warning: '<i class="fas fa-exclamation-triangle"></i>',
      info: '<i class="fas fa-info-circle"></i>'
    };

    const colorMap = {
      success: '#059669',
      error: '#DC2626',
      warning: '#F59E0B',
      info: '#09B1BA'
    };

    const toast = document.createElement('div');
    toast.id = 'swappo-toast';
    toast.innerHTML = (iconMap[type] || iconMap.info) + ' <span>' + message + '</span>';
    toast.style.cssText =
      'position:fixed;bottom:24px;right:24px;z-index:99999;' +
      'background:' + (colorMap[type] || colorMap.info) + ';color:#fff;' +
      'padding:14px 24px;border-radius:12px;font-family:Inter,sans-serif;font-size:14px;' +
      'display:flex;align-items:center;gap:10px;box-shadow:0 8px 24px rgba(0,0,0,0.18);' +
      'animation:swappo-toast-in 0.35s ease;max-width:400px;';

    // Add animation keyframes if not present
    if (!document.getElementById('swappo-toast-style')) {
      const style = document.createElement('style');
      style.id = 'swappo-toast-style';
      style.textContent =
        '@keyframes swappo-toast-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}' +
        '@keyframes swappo-toast-out{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(20px)}}';
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'swappo-toast-out 0.35s ease forwards';
      setTimeout(() => toast.remove(), 350);
    }, duration);
  },

  /** Add notification to list */
  add(notification) {
    const notifs = _getArray(STORAGE_KEYS.NOTIFICATIONS);
    notifs.unshift({
      id: 'notif_' + Date.now(),
      type: notification.type || 'info',
      title: notification.title || '',
      message: notification.message || '',
      read: false,
      created_at: notification.created_at || new Date().toISOString()
    });
    _set(STORAGE_KEYS.NOTIFICATIONS, notifs);
  },

  /** Get all notifications */
  getAll() {
    return _getArray(STORAGE_KEYS.NOTIFICATIONS);
  },

  /** Clear notifications */
  clear() {
    _set(STORAGE_KEYS.NOTIFICATIONS, []);
  }
};


/* ═══════════════════════════════════════════════════════════════════════════
   7. DemoGiveaway — Giveaway claiming
   ═══════════════════════════════════════════════════════════════════════════ */

const DemoGiveaway = {

  /** Claim a giveaway item */
  claim(itemId) {
    const user = DemoAuth.getCurrentUser();
    if (!user) return { success: false, error: 'Must be logged in.' };

    // Give-to-get: must have listed at least 1 item (swap or gift)
    const listedCount = DemoItems.getByUser(user.id).length;
    if (listedCount < 1) {
      return { success: false, error: 'NEEDS_LISTING', code: 'needs_listing' };
    }

    // Check subscription claim quota
    if (!DemoSubscription.canClaim(user.id)) {
      const plan = DemoSubscription.getPlan(user.id);
      return { success: false, error: 'QUOTA_REACHED', code: 'quota_reached', plan: plan.plan, limit: plan.claims_limit };
    }

    // Get item
    const item = DemoItems.getById(itemId);
    if (!item) return { success: false, error: 'Item not found.' };
    if (!item.is_giveaway) return { success: false, error: 'This item is not a giveaway.' };

    // Category lock: cannot claim same category within 30 days
    if (this.isCategoryLocked(item.category)) {
      return { success: false, error: 'You already claimed a ' + item.category + ' item within the last 30 days. Try another category!' };
    }

    // All checks passed — use a claim from quota
    const claimResult = DemoSubscription.useClaim(user.id);
    if (!claimResult.success) {
      return { success: false, error: 'Failed to use claim quota.' };
    }

    // Record claim
    const claims = _getArray(STORAGE_KEYS.CLAIMS);
    claims.push({
      item_id: itemId,
      user_id: user.id,
      category: item.category,
      date: new Date().toISOString().slice(0, 10)
    });
    _set(STORAGE_KEYS.CLAIMS, claims);

    DemoNotifications.add({
      type: 'giveaway_claimed',
      title: 'Giveaway Claimed!',
      message: 'You claimed ' + item.brand + ' ' + item.model + '. ' + claimResult.remaining + ' claims remaining this month.',
      created_at: new Date().toISOString()
    });

    return { success: true };
  },

  /** Get remaining claims this month */
  getRemainingClaims() {
    const user = DemoAuth.getCurrentUser();
    if (!user) return 0;

    return DemoSubscription.getRemaining(user.id).claims;
  },

  /** Check if category is locked for current user (30-day lock) */
  isCategoryLocked(category) {
    const user = DemoAuth.getCurrentUser();
    if (!user) return false;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const claims = _getArray(STORAGE_KEYS.CLAIMS);
    return claims.some(c =>
      c.user_id === user.id &&
      c.category === category &&
      new Date(c.date) >= thirtyDaysAgo
    );
  }
};


/* ═══════════════════════════════════════════════════════════════════════════
   8. Navbar Updater
   ═══════════════════════════════════════════════════════════════════════════ */

function updateNavbarForDemo() {
  const user = DemoAuth.getCurrentUser();

  // ── Plan badge & swap counter ──────────────────────────────────────────
  const planEls = document.querySelectorAll('.nav-points, #nav-points, [data-nav-points]');
  planEls.forEach(el => {
    if (user) {
      const plan = DemoSubscription.getPlan(user.id);
      const tier = plan.tier;
      const swapsLabel = plan.swaps_limit === Infinity
        ? plan.swaps_used + '/\u221E swaps'
        : plan.swaps_used + '/' + plan.swaps_limit + ' swaps';
      el.innerHTML =
        '<span style="font-weight:700;color:' + tier.color + ';">' + tier.badge + ' ' + tier.name + '</span>' +
        '<span style="margin-left:8px;font-size:12px;color:var(--text-secondary,#555);">' + swapsLabel + '</span>';
    } else {
      el.innerHTML = '';
    }
  });

  // ── Join the Swap button ──────────────────────────────────────────────
  const joinBtns = document.querySelectorAll('.join-btn, #join-btn, [data-join-btn], a[href*="login"]');
  joinBtns.forEach(btn => {
    if (!btn.closest('.nav, nav, .navbar, header')) return;
    btn.style.display = user ? 'none' : '';
  });

  // ── Dashboard pill (avatar + name + explicit "My dashboard" label) ─────
  let avatarArea = document.getElementById('nav-avatar-area');
  if (!avatarArea) {
    const navbar = document.querySelector('.nav-actions, .navbar-actions, nav .actions');
    if (navbar && user) {
      avatarArea = document.createElement('a');
      avatarArea.id = 'nav-avatar-area';
      avatarArea.className = 'nav-dashboard-pill';
      const profilePath = _inPagesDir() ? 'profile.html' : 'pages/profile.html';
      avatarArea.href = profilePath;
      avatarArea.title = 'Go to my dashboard';
      avatarArea.setAttribute('aria-label', 'My dashboard');
      navbar.appendChild(avatarArea);
    }
  }

  if (avatarArea) {
    if (user) {
      const initial = (user.name || 'U')[0].toUpperCase();
      const color = user.avatar_color || '#09B1BA';
      const loginPath = _inPagesDir() ? 'login.html' : 'pages/login.html';
      const firstName = (user.name || 'User').split(' ')[0];
      avatarArea.innerHTML =
        '<div class="nav-dashboard-avatar" style="background:' + color + ';">' + initial + '</div>' +
        '<div class="nav-dashboard-meta">' +
          '<span class="nav-dashboard-hello">' + firstName + '</span>' +
          '<span class="nav-dashboard-label"><i class="fas fa-th-large"></i> My dashboard</span>' +
        '</div>' +
        '<button class="nav-logout-btn" onclick="event.stopPropagation();event.preventDefault();DemoAuth.signOut();window.location.href=\'' + loginPath + '\';" title="Sign out" aria-label="Sign out"><i class="fas fa-sign-out-alt"></i></button>';
      avatarArea.style.display = 'inline-flex';

      // Inject styles once
      if (!document.getElementById('nav-dashboard-pill-styles')) {
        var s = document.createElement('style');
        s.id = 'nav-dashboard-pill-styles';
        s.textContent =
          '.nav-dashboard-pill{display:inline-flex;align-items:center;gap:10px;padding:6px 10px 6px 6px;border:1px solid var(--gray-border,#E5E7EB);border-radius:999px;text-decoration:none!important;cursor:pointer;transition:all .2s;background:#fff;}' +
          '.nav-dashboard-pill:hover{border-color:#09B1BA;background:#F0FBFC;box-shadow:0 4px 12px rgba(9,177,186,.12);transform:translateY(-1px);}' +
          '.nav-dashboard-avatar{width:32px;height:32px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;}' +
          '.nav-dashboard-meta{display:flex;flex-direction:column;line-height:1.15;text-align:left;}' +
          '.nav-dashboard-hello{font-size:12px;font-weight:600;color:var(--text,#171717);}' +
          '.nav-dashboard-label{font-size:11px;font-weight:600;color:#09B1BA;display:flex;align-items:center;gap:4px;}' +
          '.nav-dashboard-label i{font-size:10px;}' +
          '.nav-dashboard-pill:hover .nav-dashboard-label{color:#078A91;}' +
          '.nav-logout-btn{background:none;border:1px solid var(--gray-border,#E5E7EB);border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--gray-text,#6B7280);font-size:11px;margin-left:4px;transition:all .2s;}' +
          '.nav-logout-btn:hover{border-color:#FF4B55!important;color:#FF4B55!important;}' +
          '@media (max-width:640px){.nav-dashboard-meta{display:none;}.nav-dashboard-pill{padding:4px;}}';
        document.head.appendChild(s);
      }
    } else {
      avatarArea.style.display = 'none';
    }
  }

  // ── Chat badge ────────────────────────────────────────────────────────
  const chatLinks = document.querySelectorAll('a[href*="chat"]');
  chatLinks.forEach(link => {
    // Remove old badge
    const oldBadge = link.querySelector('.chat-badge');
    if (oldBadge) oldBadge.remove();

    if (user) {
      const unread = DemoChat.getUnreadCount();
      if (unread > 0) {
        const badge = document.createElement('span');
        badge.className = 'chat-badge';
        badge.textContent = unread;
        badge.style.cssText =
          'position:absolute;top:-4px;right:-8px;background:#FF4B55;color:#fff;' +
          'font-size:10px;font-weight:700;width:18px;height:18px;border-radius:50%;' +
          'display:flex;align-items:center;justify-content:center;';
        link.style.position = 'relative';
        link.appendChild(badge);
      }
    }
  });
}


/* ═══════════════════════════════════════════════════════════════════════════
   9. Init
   ═══════════════════════════════════════════════════════════════════════════ */

function initDemoMode() {
  // Seed demo user into localStorage if not already there
  const users = _getArray(STORAGE_KEYS.USERS);
  if (!users.find(u => u.id === 'user-demo')) {
    // Demo user is referenced by DEMO_USER global but we keep it accessible
    // No need to add to users array — we check DEMO_USER directly in auth
  }

  // Ensure swaps array is seeded
  if (!_get(STORAGE_KEYS.SWAPS)) {
    _set(STORAGE_KEYS.SWAPS, []);
  }

  // Ensure conversations array is seeded
  if (!_get(STORAGE_KEYS.CONVERSATIONS)) {
    _set(STORAGE_KEYS.CONVERSATIONS, []);
  }

  // Ensure subscriptions object is seeded
  if (!_get(STORAGE_KEYS.SUBSCRIPTIONS)) {
    _set(STORAGE_KEYS.SUBSCRIPTIONS, {});
  }

  // Update navbar
  updateNavbarForDemo();

  // Show welcome toast on first visit
  const firstVisit = _get(STORAGE_KEYS.FIRST_VISIT);
  if (!firstVisit) {
    _set(STORAGE_KEYS.FIRST_VISIT, true);
    setTimeout(() => {
      DemoNotifications.showToast('Welcome to Swappo! This is a demo \u2014 all data is stored locally.', 'info', 5000);
    }, 800);
  }
}

// Auto-run on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDemoMode);
} else {
  initDemoMode();
}


// ─── EARLY ADOPTER PROGRAM ──────────────────────────────────────────────────
const DemoEarlyAdopter = {
  MAX_SPOTS: 500,
  STORAGE_KEY: 'swappo_early_adopter_count',

  getCount() {
    const count = parseInt(localStorage.getItem(this.STORAGE_KEY) || '0');
    return Math.min(count, this.MAX_SPOTS);
  },

  getRemaining() {
    return Math.max(0, this.MAX_SPOTS - this.getCount());
  },

  isFull() {
    return this.getCount() >= this.MAX_SPOTS;
  },

  register(userId) {
    if (this.isFull()) return { success: false, isPioneer: false };
    const count = this.getCount() + 1;
    localStorage.setItem(this.STORAGE_KEY, count.toString());

    // Mark user as pioneer
    const pioneers = JSON.parse(localStorage.getItem('swappo_pioneers') || '[]');
    if (!pioneers.includes(userId)) {
      pioneers.push(userId);
      localStorage.setItem('swappo_pioneers', JSON.stringify(pioneers));
    }

    // Upgrade to bronze for 6 months
    if (window.DemoSubscription) {
      DemoSubscription.upgradePlan(userId, 'bronze');
    }

    return { success: true, isPioneer: true, spotsLeft: this.getRemaining() };
  },

  isPioneer(userId) {
    const pioneers = JSON.parse(localStorage.getItem('swappo_pioneers') || '[]');
    // Also check mock users - first 5 mock users are pioneers
    const mockPioneers = ['user-1', 'user-2', 'user-3', 'user-7'];
    return pioneers.includes(userId) || mockPioneers.includes(userId);
  }
};

window.DemoEarlyAdopter = DemoEarlyAdopter;

// ─── SWAP SUGGESTIONS ───────────────────────────────────────────────────────
const DemoSuggestions = {
  getForUser(userId, limit) {
    limit = limit || 5;
    var user = DemoAuth.getCurrentUser();
    if (!user) return [];

    // Get user's items to know their categories
    var userItems = DemoItems.getByUser(userId);
    var userCategories = [...new Set(userItems.map(function(i) { return i.category; }))];

    // Get browsing history (stored categories)
    var browsed = JSON.parse(localStorage.getItem('swappo_browsed_categories') || '[]');
    var interestCategories = [...new Set([...userCategories, ...browsed])];

    // Find matching items from other users
    var allItems = [...MOCK_ITEMS, ..._getArray(STORAGE_KEYS.USER_ITEMS)];
    var suggestions = allItems.filter(function(item) {
      if (item.user_id === userId) return false;
      if (item.status !== 'active') return false;
      if (item.is_giveaway) return false;
      // Prefer same categories
      if (interestCategories.length > 0 && !interestCategories.includes(item.category)) return false;
      return true;
    });

    // Sort by: same city first, then by favorites
    var userCity = user.city || '';
    suggestions.sort(function(a, b) {
      var aCity = (a.city || '') === userCity ? 1 : 0;
      var bCity = (b.city || '') === userCity ? 1 : 0;
      if (bCity !== aCity) return bCity - aCity;
      return (b.favorites_count || 0) - (a.favorites_count || 0);
    });

    return suggestions.slice(0, limit);
  },

  trackBrowsedCategory(category) {
    if (!category) return;
    var browsed = JSON.parse(localStorage.getItem('swappo_browsed_categories') || '[]');
    if (!browsed.includes(category)) {
      browsed.push(category);
      if (browsed.length > 10) browsed.shift();
      localStorage.setItem('swappo_browsed_categories', JSON.stringify(browsed));
    }
  }
};

window.DemoSuggestions = DemoSuggestions;

// ─── BADGES & GAMIFICATION ──────────────────────────────────────────────────
const BADGE_LEVELS = [
  { id: 'newcomer', name: 'Newcomer',  emoji: '🌱', min: 0,   color: '#999' },
  { id: 'swapper',  name: 'Swapper',   emoji: '⭐', min: 3,   color: '#CD7F32' },
  { id: 'trader',   name: 'Trader',    emoji: '🔥', min: 10,  color: '#C0C0C0' },
  { id: 'expert',   name: 'Expert',    emoji: '💎', min: 25,  color: '#FFD700' },
  { id: 'master',   name: 'Master',    emoji: '👑', min: 50,  color: '#B9F2FF' },
  { id: 'legend',   name: 'Legend',    emoji: '🏆', min: 100, color: '#FF6B6B' }
];

const SPECIAL_BADGES = [
  { id: 'pioneer',       name: 'Pioneer',       emoji: '🚀', desc: 'First 500 users' },
  { id: 'generous',      name: 'Generous',       emoji: '🎁', desc: '5+ giveaways' },
  { id: 'speed_swapper', name: 'Speed Swapper',  emoji: '⚡', desc: 'Swap in < 24h' },
  { id: 'collector',     name: 'Collector',      emoji: '📦', desc: '20+ active items' },
  { id: 'trusted',       name: 'Trusted',        emoji: '💖', desc: '4.5 avg, 10+ reviews' }
];

const DemoBadges = {
  getLevelBadge(swapCount) {
    var badge = BADGE_LEVELS[0];
    for (var i = BADGE_LEVELS.length - 1; i >= 0; i--) {
      if (swapCount >= BADGE_LEVELS[i].min) { badge = BADGE_LEVELS[i]; break; }
    }
    return badge;
  },

  getNextLevel(swapCount) {
    for (var i = 0; i < BADGE_LEVELS.length; i++) {
      if (swapCount < BADGE_LEVELS[i].min) return BADGE_LEVELS[i];
    }
    return null;
  },

  getSpecialBadges(userId) {
    var badges = [];

    // Pioneer
    if (window.DemoEarlyAdopter && DemoEarlyAdopter.isPioneer(userId)) {
      badges.push(SPECIAL_BADGES.find(function(b) { return b.id === 'pioneer'; }));
    }

    // Generous (5+ giveaways)
    var allItems = [...(window.MOCK_ITEMS || []), ...(JSON.parse(localStorage.getItem('swappo_user_items') || '[]'))];
    var giveaways = allItems.filter(function(i) { return i.user_id === userId && i.is_giveaway; });
    if (giveaways.length >= 5) {
      badges.push(SPECIAL_BADGES.find(function(b) { return b.id === 'generous'; }));
    }

    // Collector (20+ active items)
    var activeItems = allItems.filter(function(i) { return i.user_id === userId && i.status === 'active'; });
    if (activeItems.length >= 20) {
      badges.push(SPECIAL_BADGES.find(function(b) { return b.id === 'collector'; }));
    }

    return badges.filter(Boolean);
  },

  getAllBadges(userId, swapCount) {
    var level = this.getLevelBadge(swapCount);
    var specials = this.getSpecialBadges(userId);
    return { level: level, specials: specials };
  },

  renderBadge(badge) {
    return '<span class="user-badge" style="background:' + (badge.color || '#E6F7F8') + '20;color:' + (badge.color || '#09B1BA') + ';padding:3px 8px;border-radius:10px;font-size:11px;font-weight:600;white-space:nowrap;">' + badge.emoji + ' ' + badge.name + '</span>';
  },

  // Streak check
  getMonthlyStreak(userId) {
    var swaps = window.DemoSwaps ? DemoSwaps.getForUser(userId) : [];
    var now = new Date();
    var thisMonth = swaps.filter(function(s) {
      if (s.status !== 'completed' && s.status !== 'accepted') return false;
      var d = new Date(s.completed_at || s.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return thisMonth.length;
  }
};

window.BADGE_LEVELS = BADGE_LEVELS;
window.SPECIAL_BADGES = SPECIAL_BADGES;
window.DemoBadges = DemoBadges;

/* ═══════════════════════════════════════════════════════════════════════════
   EXPOSE TO GLOBAL SCOPE
   ═══════════════════════════════════════════════════════════════════════════ */

/** Reset all demo data — clears localStorage and re-seeds fresh state */
function resetDemoData() {
  Object.values(STORAGE_KEYS).forEach(function(key) {
    localStorage.removeItem(key);
  });
  localStorage.removeItem('swappo_early_adopter_count');
  localStorage.removeItem('swappo_pioneers');
  localStorage.removeItem('swappo_browsed_categories');
  localStorage.removeItem('language');
  initDemoMode();
  DemoNotifications.showToast('Demo data reset! All fresh.', 'success', 3000);
}

/* ═══════════════════════════════════════════════════════════════════════════
   SIMULATED PAYMENT FLOW (Pro subscription + Boosts + Delivery)
   ═══════════════════════════════════════════════════════════════════════════ */

const DemoPayment = {
  /** Show a simulated payment modal */
  show(opts) {
    // opts: { title, amount, currency, description, onSuccess }
    const amount = opts.amount || 0;
    const currency = opts.currency || 'AED';
    const title = opts.title || 'Payment';
    const desc = opts.description || '';

    const overlay = document.createElement('div');
    overlay.id = 'payment-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML =
      '<div style="background:#fff;border-radius:24px;padding:36px 32px;max-width:420px;width:100%;box-shadow:0 30px 80px rgba(0,0,0,0.3);">' +
        '<div style="text-align:center;margin-bottom:20px;">' +
          '<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#09B1BA,#078A91);margin:0 auto 12px;display:flex;align-items:center;justify-content:center;"><i class="fas fa-lock" style="color:#fff;font-size:20px;"></i></div>' +
          '<h3 style="font-size:20px;font-weight:700;color:#1A1A2E;margin:0 0 4px;">' + title + '</h3>' +
          '<p style="font-size:14px;color:#6B7280;margin:0;">' + desc + '</p>' +
        '</div>' +
        '<div style="font-size:32px;font-weight:800;text-align:center;color:#1A1A2E;margin:0 0 24px;">' + amount + ' <span style="font-size:16px;font-weight:600;color:#6B7280;">' + currency + '</span></div>' +
        '<div style="background:#F9FAFB;border-radius:12px;padding:16px;margin-bottom:20px;">' +
          '<div style="display:flex;gap:8px;margin-bottom:12px;">' +
            '<input type="text" value="4111 1111 1111 1111" readonly style="flex:1;padding:10px;border:1px solid #E5E7EB;border-radius:8px;font-size:14px;font-family:monospace;background:#fff;color:#1A1A2E;">' +
          '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<input type="text" value="12/28" readonly style="width:80px;padding:10px;border:1px solid #E5E7EB;border-radius:8px;font-size:14px;font-family:monospace;background:#fff;">' +
            '<input type="text" value="123" readonly style="width:60px;padding:10px;border:1px solid #E5E7EB;border-radius:8px;font-size:14px;font-family:monospace;background:#fff;">' +
            '<div style="flex:1;display:flex;align-items:center;gap:6px;color:#9CA3AF;font-size:11px;"><i class="fas fa-shield-alt"></i>Test mode</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;">' +
          '<button onclick="document.getElementById(\'payment-overlay\').remove();" style="flex:1;padding:14px;border:1px solid #E5E7EB;border-radius:12px;background:#fff;font-weight:600;cursor:pointer;color:#6B7280;font-size:14px;">Cancel</button>' +
          '<button id="pay-now-btn" style="flex:1;padding:14px;border:none;border-radius:12px;background:#09B1BA;color:#fff;font-weight:700;cursor:pointer;font-size:14px;transition:all .2s;">Pay ' + amount + ' ' + currency + '</button>' +
        '</div>' +
        '<p style="text-align:center;font-size:11px;color:#9CA3AF;margin:12px 0 0;"><i class="fas fa-lock" style="margin-right:4px;"></i>Secured by Tap Payments (test mode)</p>' +
      '</div>';

    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });

    document.getElementById('pay-now-btn').addEventListener('click', function() {
      var btn = this;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      setTimeout(function() {
        overlay.remove();
        // Show success toast
        DemoNotifications.showToast('Payment successful! ✅', 'success');
        // Call success callback
        if (opts.onSuccess) opts.onSuccess();
      }, 2000);
    });
  },

  /** Shortcut: Subscribe to Pro */
  subscribePro(period) {
    var amount = period === 'yearly' ? 249 : 29;
    var desc = period === 'yearly' ? 'Swappo Pro — Annual' : 'Swappo Pro — Monthly';
    this.show({
      title: 'Upgrade to Swappo Pro',
      amount: amount,
      description: desc,
      onSuccess: function() {
        var user = DemoAuth.getCurrentUser();
        if (user) {
          DemoSubscription.upgrade(user.id, 'pro');
          DemoNotifications.showToast('Welcome to Swappo Pro! 🎉 All benefits are now active.', 'success');
          if (typeof updateNavbarForDemo === 'function') updateNavbarForDemo();
          setTimeout(function() { location.reload(); }, 1200);
        }
      }
    });
  },

  /** Shortcut: Buy a boost */
  buyBoost(itemId, tier) {
    var tiers = { '24h': { amount: 5, label: '24h Boost' }, '3d': { amount: 10, label: '3-day Boost' }, '7d': { amount: 25, label: '7-day Featured Boost' } };
    var t = tiers[tier] || tiers['24h'];
    this.show({
      title: 'Boost your item',
      amount: t.amount,
      description: t.label,
      onSuccess: function() {
        var user = DemoAuth.getCurrentUser();
        if (user && itemId) {
          DemoItems.update(itemId, { is_boosted: true, boost_expires_at: new Date(Date.now() + (tier === '7d' ? 7 : tier === '3d' ? 3 : 1) * 86400000).toISOString() });
          DemoNotifications.showToast('Item boosted! 🚀 It will appear at the top of search results.', 'success');
        }
      }
    });
  }
};

window.DemoPayment = DemoPayment;

/* ═══════════════════════════════════════════════════════════════════════════
   GIVE & EARN — Milestone rewards for gifting
   ═══════════════════════════════════════════════════════════════════════════ */

const DemoGiveEarn = {
  MILESTONES: [
    { target: 3,  reward: '1 boost (24h)', icon: '🎁' },
    { target: 5,  reward: '1 boost (3 days)', icon: '⭐' },
    { target: 10, reward: '1 boost (7d featured) + 1 month Pro', icon: '🔥' },
    { target: 25, reward: '3 months Pro + 3 boosts (7d)', icon: '💎' },
    { target: 50, reward: '6 months Pro + Legend badge + featured profile', icon: '👑' }
  ],

  getGiftCount() {
    var user = DemoAuth.getCurrentUser();
    if (!user) return 0;
    return DemoGiveaway.getConfirmedGiftsCount ? DemoGiveaway.getConfirmedGiftsCount() : (user.gifts_given || 0);
  },

  getProgress() {
    var count = this.getGiftCount();
    var milestones = this.MILESTONES.map(function(m) {
      return { target: m.target, reward: m.reward, icon: m.icon, reached: count >= m.target, progress: Math.min(100, Math.round((count / m.target) * 100)) };
    });
    var nextMilestone = milestones.find(function(m) { return !m.reached; });
    return { count: count, milestones: milestones, next: nextMilestone || null };
  },

  renderWidget() {
    var p = this.getProgress();
    var html = '<div style="background:linear-gradient(135deg,#ECFDF5,#F0FDFA);border-radius:16px;padding:20px;border:1px solid rgba(16,185,129,0.2);">';
    html += '<h4 style="font-size:15px;font-weight:700;color:#065F46;margin:0 0 4px;">🎁 Give & Earn</h4>';
    html += '<p style="font-size:12px;color:#6B7280;margin:0 0 16px;">Give gifts, earn rewards. ' + p.count + ' gift' + (p.count !== 1 ? 's' : '') + ' confirmed.</p>';
    p.milestones.forEach(function(m) {
      var barColor = m.reached ? '#10B981' : '#E5E7EB';
      var textColor = m.reached ? '#065F46' : '#9CA3AF';
      html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">';
      html += '<span style="font-size:18px;filter:' + (m.reached ? 'none' : 'grayscale(1) opacity(0.5)') + ';">' + m.icon + '</span>';
      html += '<div style="flex:1;">';
      html += '<div style="display:flex;justify-content:space-between;font-size:11px;color:' + textColor + ';font-weight:600;margin-bottom:3px;"><span>' + m.target + ' gifts</span><span>' + m.reward + '</span></div>';
      html += '<div style="height:6px;background:#E5E7EB;border-radius:3px;overflow:hidden;"><div style="height:100%;width:' + m.progress + '%;background:' + barColor + ';border-radius:3px;transition:width .5s;"></div></div>';
      html += '</div></div>';
    });
    html += '</div>';
    return html;
  }
};

window.DemoGiveEarn = DemoGiveEarn;

/* ═══════════════════════════════════════════════════════════════════════════
   QR CONFIRMATION — In-person exchange verification + rating
   ═══════════════════════════════════════════════════════════════════════════ */

const DemoQR = {
  /** Generate a QR confirmation modal (simulated) */
  showConfirmation(swapId) {
    var code = 'SWP-' + Math.random().toString(36).slice(2,8).toUpperCase();
    var expiry = 10; // seconds
    var overlay = document.createElement('div');
    overlay.id = 'qr-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);z-index:9600;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML =
      '<div style="background:#fff;border-radius:24px;padding:36px 32px;max-width:380px;width:100%;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,0.3);">' +
        '<div style="font-size:48px;margin-bottom:12px;">📱</div>' +
        '<h3 style="font-size:20px;font-weight:700;color:#1A1A2E;margin:0 0 8px;">Confirm Exchange</h3>' +
        '<p style="font-size:13px;color:#6B7280;margin:0 0 20px;">Show this code to the other party or scan theirs</p>' +
        '<div style="background:#F9FAFB;border:2px dashed #09B1BA;border-radius:16px;padding:24px;margin-bottom:16px;">' +
          '<div style="font-family:monospace;font-size:32px;font-weight:800;letter-spacing:0.15em;color:#09B1BA;" id="qr-code-display">' + code + '</div>' +
          '<div style="font-size:12px;color:#9CA3AF;margin-top:8px;" id="qr-timer">Expires in <strong>' + expiry + 's</strong></div>' +
        '</div>' +
        '<button id="qr-confirm-btn" onclick="DemoQR.confirm(\'' + swapId + '\')" style="width:100%;padding:14px;border:none;border-radius:12px;background:#10B981;color:#fff;font-weight:700;font-size:15px;cursor:pointer;transition:all .2s;">✓ Confirm — Both present</button>' +
        '<button onclick="document.getElementById(\'qr-overlay\').remove();" style="width:100%;padding:10px;border:none;background:none;color:#6B7280;font-size:13px;cursor:pointer;margin-top:8px;">Cancel</button>' +
      '</div>';
    document.body.appendChild(overlay);

    // Countdown timer
    var remaining = expiry;
    var timer = setInterval(function() {
      remaining--;
      var timerEl = document.getElementById('qr-timer');
      if (timerEl) timerEl.innerHTML = remaining > 0 ? 'Expires in <strong>' + remaining + 's</strong>' : '<strong style="color:#FF4B55;">Expired — tap to refresh</strong>';
      if (remaining <= 0) {
        clearInterval(timer);
        var codeEl = document.getElementById('qr-code-display');
        if (codeEl) { codeEl.style.opacity = '0.3'; codeEl.style.textDecoration = 'line-through'; }
      }
    }, 1000);
  },

  confirm(swapId) {
    var overlay = document.getElementById('qr-overlay');
    if (overlay) overlay.remove();
    DemoNotifications.showToast('Exchange confirmed! 🎉', 'success');
    // Show rating prompt after short delay
    setTimeout(function() { DemoQR.showRating(swapId); }, 800);
  },

  showRating(swapId) {
    var overlay = document.createElement('div');
    overlay.id = 'rating-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:9600;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML =
      '<div style="background:#fff;border-radius:24px;padding:36px 32px;max-width:400px;width:100%;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,0.3);">' +
        '<div style="font-size:48px;margin-bottom:12px;">⭐</div>' +
        '<h3 style="font-size:20px;font-weight:700;color:#1A1A2E;margin:0 0 8px;">Rate this exchange</h3>' +
        '<p style="font-size:13px;color:#6B7280;margin:0 0 20px;">How was your experience?</p>' +
        '<div id="rating-stars" style="font-size:36px;cursor:pointer;margin-bottom:16px;letter-spacing:8px;">' +
          '<span onclick="DemoQR.setStars(1)" data-star="1">☆</span>' +
          '<span onclick="DemoQR.setStars(2)" data-star="2">☆</span>' +
          '<span onclick="DemoQR.setStars(3)" data-star="3">☆</span>' +
          '<span onclick="DemoQR.setStars(4)" data-star="4">☆</span>' +
          '<span onclick="DemoQR.setStars(5)" data-star="5">☆</span>' +
        '</div>' +
        '<textarea id="rating-comment" maxlength="200" placeholder="Optional comment..." style="width:100%;height:60px;border:1px solid #E5E7EB;border-radius:12px;padding:12px;font-family:inherit;font-size:13px;resize:none;margin-bottom:16px;"></textarea>' +
        '<button id="submit-rating-btn" onclick="DemoQR.submitRating(\'' + swapId + '\')" style="width:100%;padding:14px;border:none;border-radius:12px;background:#09B1BA;color:#fff;font-weight:700;font-size:15px;cursor:pointer;">Submit Rating</button>' +
        '<button onclick="document.getElementById(\'rating-overlay\').remove();" style="width:100%;padding:10px;border:none;background:none;color:#6B7280;font-size:13px;cursor:pointer;margin-top:4px;">Skip</button>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    DemoQR._selectedStars = 0;
  },

  _selectedStars: 0,

  setStars(n) {
    DemoQR._selectedStars = n;
    var container = document.getElementById('rating-stars');
    if (!container) return;
    container.querySelectorAll('span').forEach(function(s) {
      var val = parseInt(s.getAttribute('data-star'));
      s.textContent = val <= n ? '★' : '☆';
      s.style.color = val <= n ? '#F59E0B' : '#D1D5DB';
    });
  },

  submitRating(swapId) {
    var stars = DemoQR._selectedStars || 5;
    var comment = (document.getElementById('rating-comment') || {}).value || '';
    // Save rating
    if (swapId && DemoSwaps.rate) DemoSwaps.rate(swapId, stars);
    var overlay = document.getElementById('rating-overlay');
    if (overlay) overlay.remove();
    DemoNotifications.showToast('Thanks for your feedback! (' + stars + '★)', 'success');
  }
};

window.DemoQR = DemoQR;

window.DemoAuth = DemoAuth;
window.DemoSubscription = DemoSubscription;
window.DemoItems = DemoItems;
window.DemoSwaps = DemoSwaps;
window.DemoChat = DemoChat;
window.DemoNotifications = DemoNotifications;
window.DemoGiveaway = DemoGiveaway;
window.updateNavbarForDemo = updateNavbarForDemo;
window.initDemoMode = initDemoMode;
window.resetDemoData = resetDemoData;
