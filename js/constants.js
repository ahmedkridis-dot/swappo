/* ============================================
   Swappo — Shared constants (taxonomy, tiers, badges)
   Extracted from legacy mock data so consumer pages no longer need
   the demo runtime. All values are pure data — zero Demo state.
   ============================================ */

// ---- Business-model tiers ----
const SUBSCRIPTION_TIERS = {
  free: { name: 'Free', price: 0, badge: '\u{1F331}', swaps: Infinity, claims: 1, boosts: 0, ads: true,  color: '#6B7280' },
  pro:  { name: 'Pro',  price: 29, badge: '\u{1F6E1}', swaps: Infinity, claims: 5, boosts: 3, ads: false, color: '#09B1BA' },
  // Legacy aliases for v3 data still in the wild.
  bronze:  { name: 'Pro', price: 29, badge: '\u{1F6E1}', swaps: Infinity, claims: 5, boosts: 3, ads: false, color: '#09B1BA' },
  silver:  { name: 'Pro', price: 29, badge: '\u{1F6E1}', swaps: Infinity, claims: 5, boosts: 3, ads: false, color: '#09B1BA' },
  premium: { name: 'Pro', price: 29, badge: '\u{1F6E1}', swaps: Infinity, claims: 5, boosts: 3, ads: false, color: '#09B1BA' }
};

const BOOST_PRICES = {
  '24h': { price: 5,  duration: 1, label: '24h boost' },
  '3d':  { price: 10, duration: 3, label: '3-day boost' },
  '7d':  { price: 25, duration: 7, label: '7-day boost + featured' }
};

// ---- Badge tiers (user progression) ----
const BADGE_TIERS = [
  { tier: 'newcomer', emoji: '\u{1F331}', label: 'Newcomer', min_swaps: 0,  color: '#10B981' },
  { tier: 'swapper',  emoji: '\u{2B50}',  label: 'Swapper',  min_swaps: 1,  color: '#F59E0B' },
  { tier: 'active',   emoji: '\u{1F525}', label: 'Active',   min_swaps: 5,  color: '#EF4444' },
  { tier: 'pro',      emoji: '\u{1F48E}', label: 'Pro',      min_swaps: 15, color: '#3B82F6' },
  { tier: 'elite',    emoji: '\u{1F3C6}', label: 'Elite',    min_swaps: 30, color: '#8B5CF6' },
  { tier: 'legend',   emoji: '\u{1F451}', label: 'Legend',   min_swaps: 75, color: '#F472B6' }
];

// ---- Item conditions ----
const ITEM_CONDITIONS = [
  { value: 'new',      label: 'New',      description: 'Unused, in original packaging' },
  { value: 'like_new', label: 'Like New', description: 'Barely used, excellent condition' },
  { value: 'good',     label: 'Good',     description: 'Used but well maintained' },
  { value: 'fair',     label: 'Fair',     description: 'Some wear, fully functional' }
];

// ---- Categories ----
const CATEGORY_META = [
  { key: 'clothing',    label: 'Clothing & Shoes', icon: '\u{1F455}' },
  { key: 'electronics', label: 'Electronics',      icon: '\u{1F4F1}' },
  { key: 'furniture',   label: 'Furniture & Home', icon: '\u{1FA91}' },
  { key: 'vehicles',    label: 'Vehicles',         icon: '\u{1F697}' },
  { key: 'sports',      label: 'Sports & Leisure', icon: '\u{26BD}' },
  { key: 'books',       label: 'Books & Media',    icon: '\u{1F4DA}' },
  { key: 'kids',        label: 'Kids & Baby',      icon: '\u{1F9F8}' },
  { key: 'other',       label: 'Other',            icon: '\u{1F4E6}' }
];

// ---- Sub-taxonomies used by the publish wizard ----
const CLOTHING_SUBCATEGORIES = {
  male:   ['Shirts','T-shirts','Trousers','Jeans','Shorts','Suits & Blazers','Jackets & Coats','Sweaters & Hoodies','Underwear','Men Shoes','Traditional (Kandora/Thobe)'],
  female: ['Dresses','Tops & Blouses','Trousers & Jeans','Skirts','Abayas & Modest Wear','Jackets & Coats','Sweaters & Hoodies','Lingerie','Women Shoes','Swimwear'],
  kids:   ['Baby (0-2y)','Girl (2-14y)','Boy (2-14y)','Teen Girl','Teen Boy','Kids Shoes'],
  unisex: ['Sportswear','Pyjamas','Clothing Accessories']
};

const BAGS_ACCESSORIES_SUBCATEGORIES = {
  bags:        ['Handbags','Backpacks','Luggage & Travel','Sports Bags','Clutches & Pouches','Business/Laptop Bags','Tote Bags'],
  accessories: ['Watches','Sunglasses','Jewellery','Belts','Wallets','Scarves & Shawls','Hats & Caps']
};

const KIDS_SUBCATEGORIES = {
  girl:   ['Clothing','Toys & Games','Strollers & Car Seats','Baby Furniture','Feeding & Bottles','Kids Books'],
  boy:    ['Clothing','Toys & Games','Strollers & Car Seats','Baby Furniture','Feeding & Bottles','Kids Books'],
  unisex: ['Clothing','Toys & Games','Strollers & Car Seats','Baby Furniture','Feeding & Bottles','Kids Books']
};

const KIDS_AGE_RANGES = ['0-6 months','6-12 months','1-2 years','2-4 years','4+ years'];

const GAMING_SUBCATEGORIES = {
  consoles_hardware: ['Consoles','Gaming PC/Laptop','Gaming Monitors','PC Components','Controllers','Gaming Headsets','Gaming Keyboards & Mice','Gaming Chairs'],
  games:             ['PS5/PS4 Games','Xbox Games','Nintendo Switch Games','PC Games','Retro/Collector Games'],
  accessories:       ['Mouse Pads XXL','Webcams & Microphones','LED/RGB Lighting','Stands & Charging Stations','Prepaid Cards (PSN/Xbox/Steam)','Gaming Figures & Merch']
};

// ---- UAE emirates ----
const EMIRATES = ['Dubai','Abu Dhabi','Sharjah','Ajman','Ras Al Khaimah','Fujairah','Umm Al Quwain','Al Ain'];

// ---- Expose globally (browser) ----
try {
  window.SUBSCRIPTION_TIERS = SUBSCRIPTION_TIERS;
  window.BOOST_PRICES = BOOST_PRICES;
  window.BADGE_TIERS = BADGE_TIERS;
  window.ITEM_CONDITIONS = ITEM_CONDITIONS;
  window.CATEGORY_META = CATEGORY_META;
  window.CLOTHING_SUBCATEGORIES = CLOTHING_SUBCATEGORIES;
  window.BAGS_ACCESSORIES_SUBCATEGORIES = BAGS_ACCESSORIES_SUBCATEGORIES;
  window.KIDS_SUBCATEGORIES = KIDS_SUBCATEGORIES;
  window.KIDS_AGE_RANGES = KIDS_AGE_RANGES;
  window.GAMING_SUBCATEGORIES = GAMING_SUBCATEGORIES;
  window.EMIRATES = EMIRATES;
} catch (e) { /* non-browser environment — ignore */ }
