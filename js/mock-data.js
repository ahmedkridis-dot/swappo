/**
 * Swappo - UAE's First Barter Platform
 * Mock Data for Development & Demo
 * ===================================
 */

// ─── SUBSCRIPTION TIERS ────────────────────────────────────────────────────
// ─── BUSINESS MODEL v4 ─────────────────────────────────────────────────────
// Swaps are UNLIMITED and FREE for all users.
// Revenue: Swappo Pro subscription (29 AED/mo) + individual boosts (5-25 AED)
const SUBSCRIPTION_TIERS = {
  free: { name: 'Free', price: 0, badge: '\u{1F331}', swaps: Infinity, claims: 1, boosts: 0, ads: true, color: '#6B7280' },
  pro:  { name: 'Pro',  price: 29, badge: '\u{1F6E1}', swaps: Infinity, claims: 5, boosts: 3, ads: false, color: '#09B1BA' },
  // Legacy aliases (for backward compat with existing data)
  bronze:  { name: 'Pro', price: 29, badge: '\u{1F6E1}', swaps: Infinity, claims: 5, boosts: 3, ads: false, color: '#09B1BA' },
  silver:  { name: 'Pro', price: 29, badge: '\u{1F6E1}', swaps: Infinity, claims: 5, boosts: 3, ads: false, color: '#09B1BA' },
  premium: { name: 'Pro', price: 29, badge: '\u{1F6E1}', swaps: Infinity, claims: 5, boosts: 3, ads: false, color: '#09B1BA' }
};

const BOOST_PRICES = {
  '24h': { price: 5, duration: 1, label: '24h boost' },
  '3d':  { price: 10, duration: 3, label: '3-day boost' },
  '7d':  { price: 25, duration: 7, label: '7-day boost + featured' }
};

// ─── CLOTHING SUBCATEGORIES ─────────────────────────────────────────────────
const CLOTHING_SUBCATEGORIES = {
  male: ['Shirts', 'T-shirts', 'Trousers', 'Jeans', 'Shorts', 'Suits & Blazers', 'Jackets & Coats', 'Sweaters & Hoodies', 'Underwear', 'Men Shoes', 'Traditional (Kandora/Thobe)'],
  female: ['Dresses', 'Tops & Blouses', 'Trousers & Jeans', 'Skirts', 'Abayas & Modest Wear', 'Jackets & Coats', 'Sweaters & Hoodies', 'Lingerie', 'Women Shoes', 'Swimwear'],
  kids: ['Baby (0-2y)', 'Girl (2-14y)', 'Boy (2-14y)', 'Teen Girl', 'Teen Boy', 'Kids Shoes'],
  unisex: ['Sportswear', 'Pyjamas', 'Clothing Accessories']
};

const BAGS_ACCESSORIES_SUBCATEGORIES = {
  bags: ['Handbags', 'Backpacks', 'Luggage & Travel', 'Sports Bags', 'Clutches & Pouches', 'Business/Laptop Bags', 'Tote Bags'],
  accessories: ['Watches', 'Sunglasses', 'Jewellery', 'Belts', 'Wallets', 'Scarves & Shawls', 'Hats & Caps']
};

const KIDS_SUBCATEGORIES = {
  girl: ['Clothing', 'Toys & Games', 'Strollers & Car Seats', 'Baby Furniture', 'Feeding & Bottles', 'Kids Books'],
  boy: ['Clothing', 'Toys & Games', 'Strollers & Car Seats', 'Baby Furniture', 'Feeding & Bottles', 'Kids Books'],
  unisex: ['Clothing', 'Toys & Games', 'Strollers & Car Seats', 'Baby Furniture', 'Feeding & Bottles', 'Kids Books']
};

const KIDS_AGE_RANGES = ['0-6 months', '6-12 months', '1-2 years', '2-4 years', '4+ years'];

const GAMING_SUBCATEGORIES = {
  consoles_hardware: ['Consoles', 'Gaming PC/Laptop', 'Gaming Monitors', 'PC Components', 'Controllers', 'Gaming Headsets', 'Gaming Keyboards & Mice', 'Gaming Chairs'],
  games: ['PS5/PS4 Games', 'Xbox Games', 'Nintendo Switch Games', 'PC Games', 'Retro/Collector Games'],
  accessories: ['Mouse Pads XXL', 'Webcams & Microphones', 'LED/RGB Lighting', 'Stands & Charging Stations', 'Prepaid Cards (PSN/Xbox/Steam)', 'Gaming Figures & Merch']
};

// ─── MOCK USERS ─────────────────────────────────────────────────────────────
const MOCK_USERS = [
  // Phase 2: empty — real users live in Supabase public.users
];

// ─── DEMO USER FREE — Khalid Al Mansouri ─────────────────────────────────
const DEMO_USER_FREE = {
  id: 'user-demo-free',
  name: 'Khalid Al Mansouri',
  email: 'free@swappo.ae',
  password: 'free123',
  city: 'Dubai',
  emirate: 'Dubai',
  badge_tier: 'swapper',
  badge_emoji: '\u{2B50}',
  swap_count: 3,
  plan: 'free',
  isPro: false,
  claims_used: 0,
  boosts_used: 0,
  billing_start: '2026-03-15',
  avatar_color: '#09B1BA',
  created_at: '2026-01-10',
  pseudo: 'khalid_m',
  avatar: 'happy',
  badges: [],
  rating: 4.2,
  gifts_given: 2
};

// ─── DEMO USER PRO — Fatima Hassan ──────────────────────────────────────
const DEMO_USER = {
  id: 'user-demo',
  name: 'Fatima Hassan',
  email: 'pro@swappo.ae',
  password: 'pro123',
  city: 'Abu Dhabi',
  emirate: 'Abu Dhabi',
  badge_tier: 'active',
  badge_emoji: '\u{1F525}',
  swap_count: 12,
  plan: 'pro',
  isPro: true,
  claims_used: 2,
  boosts_used: 1,
  billing_start: '2026-02-01',
  avatar_color: '#8B5CF6',
  created_at: '2025-08-15',
  pseudo: 'fatima_h',
  avatar: 'chic',
  badges: ['pioneer', 'generous'],
  rating: 4.8,
  gifts_given: 8
};

// ─── MOCK ITEMS (30 items across 8 categories) ─────────────────────────────
const MOCK_ITEMS = [
  // Phase 2: empty — real items live in Supabase public.items
];

// ─── MOCK SWAPS (for demo user profile) ─────────────────────────────────────
const MOCK_SWAPS = [
  // Phase 2: empty — real swaps live in Supabase public.swaps
];

// ─── MOCK CONVERSATIONS ─────────────────────────────────────────────────────
const MOCK_CONVERSATIONS = [
  // Phase 2: empty — real conversations live in Supabase public.conversations
];

// ─── BADGE TIERS ────────────────────────────────────────────────────────────
const BADGE_TIERS = [
  { tier: 'newcomer', emoji: '\u{1F331}', label: 'Newcomer', min_swaps: 0, color: '#10B981' },
  { tier: 'swapper', emoji: '\u{2B50}', label: 'Swapper', min_swaps: 1, color: '#F59E0B' },
  { tier: 'active', emoji: '\u{1F525}', label: 'Active', min_swaps: 5, color: '#EF4444' },
  { tier: 'pro', emoji: '\u{1F48E}', label: 'Pro', min_swaps: 15, color: '#3B82F6' },
  { tier: 'elite', emoji: '\u{1F3C6}', label: 'Elite', min_swaps: 30, color: '#8B5CF6' }
];

// ─── ITEM CONDITIONS ────────────────────────────────────────────────────────
const ITEM_CONDITIONS = [
  { value: 'new', label: 'New', description: 'Unused, in original packaging' },
  { value: 'like_new', label: 'Like New', description: 'Barely used, excellent condition' },
  { value: 'good', label: 'Good', description: 'Used but well maintained' },
  { value: 'fair', label: 'Fair', description: 'Some wear, fully functional' }
];

// ─── CATEGORY METADATA ──────────────────────────────────────────────────────
const CATEGORY_META = [
  { key: 'clothing', label: 'Clothing & Shoes', icon: '\u{1F455}' },
  { key: 'electronics', label: 'Electronics', icon: '\u{1F4F1}' },
  { key: 'furniture', label: 'Furniture & Home', icon: '\u{1FA91}' },
  { key: 'vehicles', label: 'Vehicles', icon: '\u{1F697}' },
  { key: 'sports', label: 'Sports & Leisure', icon: '\u{26BD}' },
  { key: 'books', label: 'Books & Media', icon: '\u{1F4DA}' },
  { key: 'kids', label: 'Kids & Baby', icon: '\u{1F9F8}' },
  { key: 'other', label: 'Other', icon: '\u{1F4E6}' }
];

// ─── HELPER FUNCTIONS ───────────────────────────────────────────────────────

/** Get a user by their ID */
function getMockUserById(userId) {
  if (userId === 'user-demo') return DEMO_USER;
  return MOCK_USERS.find(u => u.id === userId) || null;
}

/** Get all items for a specific user */
function getMockItemsByUser(userId) {
  return MOCK_ITEMS.filter(i => i.user_id === userId);
}

/** Get items by category */
function getMockItemsByCategory(category) {
  return MOCK_ITEMS.filter(i => i.category === category);
}

/** Get giveaway items only */
function getMockGiveaways() {
  return MOCK_ITEMS.filter(i => i.is_giveaway === true);
}

/** Get boosted items only */
function getMockBoostedItems() {
  return MOCK_ITEMS.filter(i => i.is_boosted === true);
}

/** Get items sorted by newest first */
function getMockItemsSorted(sortBy = 'newest') {
  const sorted = [...MOCK_ITEMS];
  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    case 'closest':
      return sorted.sort((a, b) => a.distance - b.distance);
    case 'popular':
      return sorted.sort((a, b) => b.favorites_count - a.favorites_count);
    default:
      return sorted;
  }
}

// ─── EXPOSE GLOBALLY ────────────────────────────────────────────────────────
window.SUBSCRIPTION_TIERS = SUBSCRIPTION_TIERS;
window.MOCK_USERS = MOCK_USERS;
// ─── MOCK OFFERS (pre-loaded scenarios for demo testing) ────────────────────
const MOCK_OFFERS = [
  // Phase 2: empty — real offers live in Supabase public.swaps
];

window.MOCK_OFFERS = MOCK_OFFERS;
window.DEMO_USER = DEMO_USER;
window.MOCK_ITEMS = MOCK_ITEMS;
window.MOCK_SWAPS = MOCK_SWAPS;
window.MOCK_CONVERSATIONS = MOCK_CONVERSATIONS;
window.BADGE_TIERS = BADGE_TIERS;
window.ITEM_CONDITIONS = ITEM_CONDITIONS;
window.CATEGORY_META = CATEGORY_META;
window.CLOTHING_SUBCATEGORIES = CLOTHING_SUBCATEGORIES;
window.BAGS_ACCESSORIES_SUBCATEGORIES = BAGS_ACCESSORIES_SUBCATEGORIES;
window.KIDS_SUBCATEGORIES = KIDS_SUBCATEGORIES;
window.KIDS_AGE_RANGES = KIDS_AGE_RANGES;
window.GAMING_SUBCATEGORIES = GAMING_SUBCATEGORIES;

// Helper functions
window.getMockUserById = getMockUserById;
window.getMockItemsByUser = getMockItemsByUser;
window.getMockItemsByCategory = getMockItemsByCategory;
window.getMockGiveaways = getMockGiveaways;
window.getMockBoostedItems = getMockBoostedItems;
window.getMockItemsSorted = getMockItemsSorted;

// mock data loaded
