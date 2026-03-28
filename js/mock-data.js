/**
 * Swappo - UAE's First Barter Platform
 * Mock Data for Development & Demo
 * ===================================
 */

// ─── SUBSCRIPTION TIERS ────────────────────────────────────────────────────
const SUBSCRIPTION_TIERS = {
  free:    { name: 'Free',    price: 0,  badge: '\u{1F331}', swaps: 2, claims: 1, boosts: 0, ads: true,      color: '#999999' },
  bronze:  { name: 'Bronze',  price: 19, badge: '\u{1F949}', swaps: 4, claims: 2, boosts: 1, ads: 'reduced', color: '#CD7F32' },
  silver:  { name: 'Silver',  price: 39, badge: '\u{1F948}', swaps: 6, claims: 3, boosts: 2, ads: 'reduced', color: '#C0C0C0' },
  premium: { name: 'Premium', price: 69, badge: '\u{1F451}', swaps: Infinity, claims: 5, boosts: 4, ads: false, color: '#09B1BA' }
};

// ─── MOCK USERS ─────────────────────────────────────────────────────────────
const MOCK_USERS = [
  { id: 'user-1', name: 'Ahmed Al-Maktoum', email: 'ahmed@example.com', city: 'Dubai Marina', badge_tier: 'active', badge_emoji: '\u{1F525}', swap_count: 7, plan: 'silver', swaps_used: 3, claims_used: 1, boosts_used: 0, billing_start: '2026-03-01', avatar_color: '#09B1BA', created_at: '2025-11-15' },
  { id: 'user-2', name: 'Fatima Al-Hashimi', email: 'fatima@example.com', city: 'JBR', badge_tier: 'swapper', badge_emoji: '\u{2B50}', swap_count: 3, plan: 'bronze', swaps_used: 2, claims_used: 0, boosts_used: 0, billing_start: '2026-03-01', avatar_color: '#FF4B55', created_at: '2026-01-20' },
  { id: 'user-3', name: 'John Mitchell', email: 'john@example.com', city: 'Business Bay', badge_tier: 'pro', badge_emoji: '\u{1F48E}', swap_count: 18, plan: 'premium', swaps_used: 5, claims_used: 2, boosts_used: 1, billing_start: '2026-03-01', avatar_color: '#FF8C00', created_at: '2025-08-01' },
  { id: 'user-4', name: 'Maria Santos', email: 'maria@example.com', city: 'Downtown Dubai', badge_tier: 'swapper', badge_emoji: '\u{2B50}', swap_count: 2, plan: 'free', swaps_used: 1, claims_used: 0, boosts_used: 0, billing_start: '2026-03-01', avatar_color: '#8B5CF6', created_at: '2026-02-10' },
  { id: 'user-5', name: 'Omar Khalid', email: 'omar@example.com', city: 'Sharjah', badge_tier: 'active', badge_emoji: '\u{1F525}', swap_count: 9, plan: 'bronze', swaps_used: 3, claims_used: 1, boosts_used: 0, billing_start: '2026-03-01', avatar_color: '#059669', created_at: '2025-09-05' },
  { id: 'user-6', name: 'Sarah Connor', email: 'sarah@example.com', city: 'Abu Dhabi', badge_tier: 'newcomer', badge_emoji: '\u{1F331}', swap_count: 0, plan: 'free', swaps_used: 0, claims_used: 0, boosts_used: 0, billing_start: '2026-03-01', avatar_color: '#EC4899', created_at: '2026-03-20' },
  { id: 'user-7', name: 'Raj Patel', email: 'raj@example.com', city: 'Al Barsha', badge_tier: 'elite', badge_emoji: '\u{1F3C6}', swap_count: 35, plan: 'premium', swaps_used: 8, claims_used: 3, boosts_used: 2, billing_start: '2026-03-01', avatar_color: '#F59E0B', created_at: '2025-06-01' },
  { id: 'user-8', name: 'Layla Nouri', email: 'layla@example.com', city: 'JLT', badge_tier: 'swapper', badge_emoji: '\u{2B50}', swap_count: 4, plan: 'silver', swaps_used: 2, claims_used: 0, boosts_used: 1, billing_start: '2026-03-01', avatar_color: '#6366F1', created_at: '2026-01-05' }
];

// ─── DEMO USER ──────────────────────────────────────────────────────────────
const DEMO_USER = {
  id: 'user-demo',
  name: 'Demo User',
  email: 'demo@swappo.ae',
  password: 'demo123',
  city: 'Dubai Marina',
  badge_tier: 'swapper',
  badge_emoji: '\u{2B50}',
  swap_count: 2,
  plan: 'bronze',
  swaps_used: 1,
  claims_used: 0,
  boosts_used: 0,
  billing_start: '2026-03-01',
  avatar_color: '#09B1BA',
  created_at: '2026-03-01'
};

// ─── MOCK ITEMS (30 items across 8 categories) ─────────────────────────────
const MOCK_ITEMS = [

  // ── CLOTHING (6 items) ──────────────────────────────────────────────────
  {
    id: 'item-1',
    user_id: 'user-1',
    category: 'clothing',
    type: 'Sneakers',
    brand: 'Nike',
    model: 'Air Max 90',
    condition: 'like_new',
    year: 2024,
    size: '43 EU',
    color: 'White/Black',
    photos: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: true,
    boost_expires_at: '2026-04-10T23:59:59',
    status: 'active',
    created_at: '2026-03-15',
    lat: 25.0780,
    lng: 55.1340,
    city: 'Dubai Marina',
    distance: 1.2,
    favorites_count: 34,
    views_count: 287
  },
  {
    id: 'item-2',
    user_id: 'user-2',
    category: 'clothing',
    type: 'Jacket',
    brand: 'Zara',
    model: 'Oversized Leather Jacket',
    condition: 'good',
    year: 2023,
    size: 'M',
    color: 'Black',
    photos: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-18',
    lat: 25.0760,
    lng: 55.1330,
    city: 'JBR',
    distance: 0.8,
    favorites_count: 12,
    views_count: 98
  },
  {
    id: 'item-3',
    user_id: 'user-4',
    category: 'clothing',
    type: 'Running Shoes',
    brand: 'Adidas',
    model: 'Ultraboost 23',
    condition: 'like_new',
    year: 2025,
    size: '42 EU',
    color: 'Core Black',
    photos: [
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-22',
    lat: 25.1972,
    lng: 55.2744,
    city: 'Downtown Dubai',
    distance: 3.5,
    favorites_count: 22,
    views_count: 156
  },
  {
    id: 'item-4',
    user_id: 'user-5',
    category: 'clothing',
    type: 'Dress',
    brand: 'H&M',
    model: 'Linen Wrap Dress',
    condition: 'new',
    year: 2026,
    size: 'S',
    color: 'Olive Green',
    photos: [
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d44?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&h=530&fit=crop'
    ],
    is_giveaway: true,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-24',
    lat: 25.3380,
    lng: 55.4120,
    city: 'Sharjah',
    distance: 15.0,
    favorites_count: 8,
    views_count: 62
  },
  {
    id: 'item-5',
    user_id: 'user-8',
    category: 'clothing',
    type: 'Hoodie',
    brand: 'Nike',
    model: 'Tech Fleece Hoodie',
    condition: 'good',
    year: 2024,
    size: 'L',
    color: 'Grey Heather',
    photos: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1578768079470-0f0d38fa7d66?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1614975059251-992f11792b9f?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-12',
    lat: 25.0740,
    lng: 55.1420,
    city: 'JLT',
    distance: 2.1,
    favorites_count: 15,
    views_count: 110
  },
  {
    id: 'item-6',
    user_id: 'user-demo',
    category: 'clothing',
    type: 'Polo Shirt',
    brand: 'Ralph Lauren',
    model: 'Classic Fit Mesh Polo',
    condition: 'like_new',
    year: 2025,
    size: 'M',
    color: 'Navy Blue',
    photos: [
      'https://images.unsplash.com/photo-1625910513413-5fc421e0a0d7?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-08',
    lat: 25.0780,
    lng: 55.1340,
    city: 'Dubai Marina',
    distance: 0.5,
    favorites_count: 19,
    views_count: 142
  },

  // ── ELECTRONICS (5 items) ───────────────────────────────────────────────
  {
    id: 'item-7',
    user_id: 'user-3',
    category: 'electronics',
    type: 'Smartphone',
    brand: 'Samsung',
    model: 'Galaxy S24 Ultra',
    condition: 'like_new',
    year: 2024,
    size: null,
    color: 'Titanium Gray',
    photos: [
      'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: true,
    boost_expires_at: '2026-04-05T23:59:59',
    status: 'active',
    created_at: '2026-03-10',
    lat: 25.1850,
    lng: 55.2637,
    city: 'Business Bay',
    distance: 4.2,
    favorites_count: 48,
    views_count: 467
  },
  {
    id: 'item-8',
    user_id: 'user-7',
    category: 'electronics',
    type: 'Laptop',
    brand: 'Apple',
    model: 'MacBook Air M2',
    condition: 'good',
    year: 2023,
    size: '13.6"',
    color: 'Space Gray',
    photos: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1629131726692-1accd0c53ce0?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-05',
    lat: 25.1133,
    lng: 55.1898,
    city: 'Al Barsha',
    distance: 5.8,
    favorites_count: 42,
    views_count: 390
  },
  {
    id: 'item-9',
    user_id: 'user-1',
    category: 'electronics',
    type: 'Gaming Console',
    brand: 'Sony',
    model: 'PlayStation 5',
    condition: 'like_new',
    year: 2024,
    size: null,
    color: 'White',
    photos: [
      'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1607853202273-797f1c22a38e?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1622297845775-5ff3fef71d13?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1617096200347-cb04ae810b1d?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-20',
    lat: 25.0780,
    lng: 55.1340,
    city: 'Dubai Marina',
    distance: 1.0,
    favorites_count: 50,
    views_count: 498
  },
  {
    id: 'item-10',
    user_id: 'user-5',
    category: 'electronics',
    type: 'Wireless Earbuds',
    brand: 'Apple',
    model: 'AirPods Pro 2',
    condition: 'new',
    year: 2025,
    size: null,
    color: 'White',
    photos: [
      'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1588423771073-b8903fde1c68?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-25',
    lat: 25.3380,
    lng: 55.4120,
    city: 'Sharjah',
    distance: 14.5,
    favorites_count: 27,
    views_count: 201
  },
  {
    id: 'item-11',
    user_id: 'user-demo',
    category: 'electronics',
    type: 'Tablet',
    brand: 'Apple',
    model: 'iPad Air 5th Gen',
    condition: 'good',
    year: 2023,
    size: '10.9"',
    color: 'Starlight',
    photos: [
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1561154464-82e9aab32f9d?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-14',
    lat: 25.0780,
    lng: 55.1340,
    city: 'Dubai Marina',
    distance: 0.5,
    favorites_count: 31,
    views_count: 245
  },

  // ── FURNITURE (4 items) ─────────────────────────────────────────────────
  {
    id: 'item-12',
    user_id: 'user-3',
    category: 'furniture',
    type: 'Standing Desk',
    brand: 'IKEA',
    model: 'BEKANT',
    condition: 'good',
    year: 2023,
    size: '160x80 cm',
    color: 'White/Black',
    photos: [
      'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-06',
    lat: 25.1850,
    lng: 55.2637,
    city: 'Business Bay',
    distance: 4.5,
    favorites_count: 18,
    views_count: 134
  },
  {
    id: 'item-13',
    user_id: 'user-7',
    category: 'furniture',
    type: 'Sofa',
    brand: 'IKEA',
    model: 'KIVIK 3-Seat',
    condition: 'fair',
    year: 2022,
    size: '228x95 cm',
    color: 'Beige',
    photos: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=400&h=530&fit=crop'
    ],
    is_giveaway: true,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-02',
    lat: 25.1133,
    lng: 55.1898,
    city: 'Al Barsha',
    distance: 6.0,
    favorites_count: 25,
    views_count: 178
  },
  {
    id: 'item-14',
    user_id: 'user-2',
    category: 'furniture',
    type: 'Office Chair',
    brand: 'Herman Miller',
    model: 'Aeron',
    condition: 'like_new',
    year: 2024,
    size: 'Medium',
    color: 'Graphite',
    photos: [
      'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1589364280092-90f45c3e4cc3?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-17',
    lat: 25.0760,
    lng: 55.1330,
    city: 'JBR',
    distance: 1.5,
    favorites_count: 38,
    views_count: 312
  },
  {
    id: 'item-15',
    user_id: 'user-6',
    category: 'furniture',
    type: 'Bookshelf',
    brand: 'IKEA',
    model: 'KALLAX 4x4',
    condition: 'good',
    year: 2023,
    size: '147x147 cm',
    color: 'White',
    photos: [
      'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1526285759904-71d1170ed2ac?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-23',
    lat: 24.4539,
    lng: 54.3773,
    city: 'Abu Dhabi',
    distance: 18.0,
    favorites_count: 6,
    views_count: 45
  },

  // ── VEHICLES (3 items) ──────────────────────────────────────────────────
  {
    id: 'item-16',
    user_id: 'user-7',
    category: 'vehicles',
    type: 'Sedan',
    brand: 'Toyota',
    model: 'Camry LE',
    condition: 'good',
    year: 2021,
    size: null,
    color: 'Pearl White',
    photos: [
      'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: true,
    boost_expires_at: '2026-04-15T23:59:59',
    status: 'active',
    created_at: '2026-03-01',
    lat: 25.1133,
    lng: 55.1898,
    city: 'Al Barsha',
    distance: 5.5,
    favorites_count: 45,
    views_count: 489
  },
  {
    id: 'item-17',
    user_id: 'user-3',
    category: 'vehicles',
    type: 'SUV',
    brand: 'BMW',
    model: 'X3 xDrive30i',
    condition: 'like_new',
    year: 2023,
    size: null,
    color: 'Alpine White',
    photos: [
      'https://images.unsplash.com/photo-1556189250-72ba954cfc2b?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-07',
    lat: 25.1850,
    lng: 55.2637,
    city: 'Business Bay',
    distance: 4.0,
    favorites_count: 39,
    views_count: 412
  },
  {
    id: 'item-18',
    user_id: 'user-5',
    category: 'vehicles',
    type: 'Motorcycle',
    brand: 'Honda',
    model: 'CBR500R',
    condition: 'good',
    year: 2022,
    size: null,
    color: 'Grand Prix Red',
    photos: [
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1558980394-4c7c9299fe96?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-19',
    lat: 25.3380,
    lng: 55.4120,
    city: 'Sharjah',
    distance: 16.0,
    favorites_count: 21,
    views_count: 176
  },

  // ── SPORTS & LEISURE (4 items) ──────────────────────────────────────────
  {
    id: 'item-19',
    user_id: 'user-1',
    category: 'sports',
    type: 'Mountain Bike',
    brand: 'Trek',
    model: 'Marlin 7',
    condition: 'good',
    year: 2023,
    size: 'M Frame',
    color: 'Matte Black',
    photos: [
      'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-11',
    lat: 25.0780,
    lng: 55.1340,
    city: 'Dubai Marina',
    distance: 1.3,
    favorites_count: 29,
    views_count: 230
  },
  {
    id: 'item-20',
    user_id: 'user-4',
    category: 'sports',
    type: 'Yoga Mat & Kit',
    brand: 'Lululemon',
    model: 'The Reversible Mat 5mm',
    condition: 'like_new',
    year: 2025,
    size: '180x66 cm',
    color: 'Teal',
    photos: [
      'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=400&h=530&fit=crop'
    ],
    is_giveaway: true,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-21',
    lat: 25.1972,
    lng: 55.2744,
    city: 'Downtown Dubai',
    distance: 3.8,
    favorites_count: 14,
    views_count: 88
  },
  {
    id: 'item-21',
    user_id: 'user-8',
    category: 'sports',
    type: 'Dumbbell Set',
    brand: 'Bowflex',
    model: 'SelectTech 552',
    condition: 'good',
    year: 2024,
    size: '2-24 kg',
    color: 'Black/Red',
    photos: [
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-16',
    lat: 25.0740,
    lng: 55.1420,
    city: 'JLT',
    distance: 2.5,
    favorites_count: 33,
    views_count: 267
  },
  {
    id: 'item-22',
    user_id: 'user-demo',
    category: 'sports',
    type: 'Tennis Racket',
    brand: 'Wilson',
    model: 'Blade 98 V8',
    condition: 'like_new',
    year: 2025,
    size: '98 sq in',
    color: 'Green/Black',
    photos: [
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1617883861744-13b534e1a5eb?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-09',
    lat: 25.0780,
    lng: 55.1340,
    city: 'Dubai Marina',
    distance: 0.7,
    favorites_count: 11,
    views_count: 72
  },

  // ── BOOKS & MEDIA (4 items) ─────────────────────────────────────────────
  {
    id: 'item-23',
    user_id: 'user-4',
    category: 'books',
    type: 'Book Collection',
    brand: 'Various',
    model: 'Business & Self-Help Bundle (12 Books)',
    condition: 'good',
    year: 2023,
    size: null,
    color: null,
    photos: [
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-13',
    lat: 25.1972,
    lng: 55.2744,
    city: 'Downtown Dubai',
    distance: 3.2,
    favorites_count: 9,
    views_count: 54
  },
  {
    id: 'item-24',
    user_id: 'user-6',
    category: 'books',
    type: 'Vinyl Records',
    brand: 'Various Artists',
    model: 'Classic Rock Collection (20 LPs)',
    condition: 'fair',
    year: 2020,
    size: null,
    color: null,
    photos: [
      'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1461360228754-6e81c478b882?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=530&fit=crop'
    ],
    is_giveaway: true,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-26',
    lat: 24.4539,
    lng: 54.3773,
    city: 'Abu Dhabi',
    distance: 19.0,
    favorites_count: 17,
    views_count: 120
  },
  {
    id: 'item-25',
    user_id: 'user-2',
    category: 'books',
    type: 'Manga Collection',
    brand: 'Viz Media',
    model: 'One Piece Box Set 1 (Vol 1-23)',
    condition: 'like_new',
    year: 2024,
    size: null,
    color: null,
    photos: [
      'https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1612178537253-bccd437b730e?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1601645191163-3fc0d5d64e35?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1598153346810-860daa814c4b?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-04',
    lat: 25.0760,
    lng: 55.1330,
    city: 'JBR',
    distance: 1.0,
    favorites_count: 23,
    views_count: 189
  },
  {
    id: 'item-26',
    user_id: 'user-8',
    category: 'books',
    type: 'Board Games',
    brand: 'Various',
    model: 'Strategy Bundle (Catan + Ticket to Ride + Pandemic)',
    condition: 'good',
    year: 2024,
    size: null,
    color: null,
    photos: [
      'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1606503153255-59d7ae48de5b?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1632501641765-e568d28b0015?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1611371805429-8b5c1b2c34ba?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-22',
    lat: 25.0740,
    lng: 55.1420,
    city: 'JLT',
    distance: 2.3,
    favorites_count: 20,
    views_count: 145
  },

  // ── KIDS & BABY (3 items) ───────────────────────────────────────────────
  {
    id: 'item-27',
    user_id: 'user-5',
    category: 'kids',
    type: 'Stroller',
    brand: 'Bugaboo',
    model: 'Fox 5',
    condition: 'good',
    year: 2024,
    size: null,
    color: 'Midnight Black',
    photos: [
      'https://images.unsplash.com/photo-1590086782957-93c06ef21604?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1566004100477-7b3b6f6e1bca?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-03',
    lat: 25.3380,
    lng: 55.4120,
    city: 'Sharjah',
    distance: 15.5,
    favorites_count: 16,
    views_count: 132
  },
  {
    id: 'item-28',
    user_id: 'user-2',
    category: 'kids',
    type: 'LEGO Set',
    brand: 'LEGO',
    model: 'Technic Porsche 911 GT3 RS',
    condition: 'new',
    year: 2025,
    size: null,
    color: 'Orange',
    photos: [
      'https://images.unsplash.com/photo-1587654780291-39c9404d7dd0?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1560961911-ba7ef651a56c?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-25',
    lat: 25.0760,
    lng: 55.1330,
    city: 'JBR',
    distance: 0.9,
    favorites_count: 41,
    views_count: 356
  },
  {
    id: 'item-29',
    user_id: 'user-6',
    category: 'kids',
    type: 'Baby Clothes Bundle',
    brand: 'Mixed',
    model: '0-12 Months Bundle (25 pieces)',
    condition: 'good',
    year: 2025,
    size: '0-12M',
    color: 'Mixed Colors',
    photos: [
      'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1565462905097-5e701ef37ed1?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1604467707321-70d009801bf0?w=400&h=530&fit=crop'
    ],
    is_giveaway: true,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-24',
    lat: 24.4539,
    lng: 54.3773,
    city: 'Abu Dhabi',
    distance: 20.0,
    favorites_count: 7,
    views_count: 38
  },

  // ── PLANTS (4 items — mostly giveaways) ──────────────────────────────────
  {
    id: 'item-plant-1',
    user_id: 'user-3',
    category: 'plants',
    type: 'Indoor Plant',
    brand: 'Monstera',
    model: 'Deliciosa (Swiss Cheese Plant)',
    condition: 'like_new',
    year: 2025,
    size: '60 cm tall',
    color: 'Green',
    photos: [
      'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1637967886160-fd78dc3ce3f5?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1632207691143-643d2a4e0e19?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1598880940080-ff9a29891b85?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-26',
    lat: 25.2048,
    lng: 55.2708,
    city: 'Downtown Dubai',
    distance: 3.2,
    favorites_count: 18,
    views_count: 72
  },
  {
    id: 'item-plant-2',
    user_id: 'user-5',
    category: 'plants',
    type: 'Indoor Plant',
    brand: 'Sansevieria',
    model: 'Snake Plant (Mother-in-Law\'s Tongue)',
    condition: 'like_new',
    year: 2025,
    size: '45 cm tall',
    color: 'Green/Yellow',
    photos: [
      'https://images.unsplash.com/photo-1593482892540-4a4556a0e4e3?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1620127252536-03bdfcb5a1b8?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1599009434802-ca1dd09895e5?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1572969176547-f0c230757221?w=400&h=530&fit=crop'
    ],
    is_giveaway: true,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-25',
    lat: 24.4539,
    lng: 54.3773,
    city: 'Abu Dhabi',
    distance: 8.5,
    favorites_count: 24,
    views_count: 110
  },
  {
    id: 'item-plant-3',
    user_id: 'user-2',
    category: 'plants',
    type: 'Indoor Plant',
    brand: 'Spathiphyllum',
    model: 'Peace Lily',
    condition: 'good',
    year: 2025,
    size: '40 cm tall',
    color: 'Green/White',
    photos: [
      'https://images.unsplash.com/photo-1616690710400-a16d146927c5?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1620803366004-119b57f54cd6?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1593691509543-c55fb32e6948?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1597055181300-b7e3c6707cd4?w=400&h=530&fit=crop'
    ],
    is_giveaway: true,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-24',
    lat: 25.1972,
    lng: 55.2744,
    city: 'Business Bay',
    distance: 4.1,
    favorites_count: 31,
    views_count: 145
  },
  {
    id: 'item-plant-4',
    user_id: 'user-8',
    category: 'plants',
    type: 'Succulent Set',
    brand: 'Mixed',
    model: 'Succulent Collection (5 pots)',
    condition: 'like_new',
    year: 2026,
    size: '10-15 cm each',
    color: 'Green/Pink/Purple',
    photos: [
      'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=400&h=530&fit=crop'
    ],
    is_giveaway: true,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-27',
    lat: 25.0780,
    lng: 55.1340,
    city: 'Dubai Marina',
    distance: 1.5,
    favorites_count: 15,
    views_count: 63
  },

  // ── OTHER (2 items) ─────────────────────────────────────────────────────
  {
    id: 'item-30',
    user_id: 'user-1',
    category: 'other',
    type: 'Camping Tent',
    brand: 'Coleman',
    model: 'Sundome 4-Person',
    condition: 'like_new',
    year: 2024,
    size: '274x213 cm',
    color: 'Green/Grey',
    photos: [
      'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1445308394109-4ec2920981b1?w=400&h=530&fit=crop',
      'https://images.unsplash.com/photo-1563299796-17596ed6b017?w=400&h=530&fit=crop'
    ],
    is_giveaway: false,
    is_boosted: false,
    boost_expires_at: null,
    status: 'active',
    created_at: '2026-03-18',
    lat: 25.0780,
    lng: 55.1340,
    city: 'Dubai Marina',
    distance: 1.1,
    favorites_count: 13,
    views_count: 95
  }
];

// ─── MOCK SWAPS (for demo user profile) ─────────────────────────────────────
const MOCK_SWAPS = [
  {
    id: 'swap-1',
    proposer_id: 'user-demo',
    receiver_id: 'user-1',
    proposer_item_id: 'item-6',
    receiver_item_id: 'item-9',
    status: 'completed',
    created_at: '2026-03-10',
    completed_at: '2026-03-12',
    rating: 5
  },
  {
    id: 'swap-2',
    proposer_id: 'user-3',
    receiver_id: 'user-demo',
    proposer_item_id: 'item-12',
    receiver_item_id: 'item-11',
    status: 'completed',
    created_at: '2026-03-08',
    completed_at: '2026-03-09',
    rating: 4
  },
  {
    id: 'swap-3',
    proposer_id: 'user-demo',
    receiver_id: 'user-2',
    proposer_item_id: 'item-22',
    receiver_item_id: 'item-14',
    status: 'accepted',
    created_at: '2026-03-20',
    completed_at: null,
    rating: null
  },
  {
    id: 'swap-4',
    proposer_id: 'user-8',
    receiver_id: 'user-demo',
    proposer_item_id: 'item-26',
    receiver_item_id: 'item-6',
    status: 'pending',
    created_at: '2026-03-25',
    completed_at: null,
    rating: null
  },
  {
    id: 'swap-5',
    proposer_id: 'user-demo',
    receiver_id: 'user-5',
    proposer_item_id: 'item-11',
    receiver_item_id: 'item-10',
    status: 'completed',
    created_at: '2026-03-15',
    completed_at: '2026-03-17',
    rating: 5
  }
];

// ─── MOCK CONVERSATIONS ─────────────────────────────────────────────────────
const MOCK_CONVERSATIONS = [
  {
    id: 'conv-1',
    swap_id: 'swap-1',
    other_user: MOCK_USERS[0], // Ahmed Al-Maktoum
    item_title: 'Sony PlayStation 5',
    last_message: 'When can we meet?',
    unread_count: 2,
    messages: [
      { id: 'msg-1', sender_id: 'user-1', content: "Hi! I'm interested in your Polo Shirt. Is it still available?", created_at: '2026-03-20T10:00:00', is_system: false },
      { id: 'msg-2', sender_id: 'user-demo', content: "Yes, it's in perfect condition! Barely worn.", created_at: '2026-03-20T10:05:00', is_system: false },
      { id: 'msg-3', sender_id: 'user-1', content: "Great! I'd like to swap my PS5 for it.", created_at: '2026-03-20T10:08:00', is_system: false },
      { id: 'msg-4', sender_id: 'user-demo', content: 'Sounds good to me! Where should we meet?', created_at: '2026-03-20T10:12:00', is_system: false },
      { id: 'msg-5', sender_id: 'user-1', content: 'When can we meet?', created_at: '2026-03-20T10:15:00', is_system: false }
    ]
  },
  {
    id: 'conv-2',
    swap_id: 'swap-3',
    other_user: MOCK_USERS[1], // Fatima Al-Hashimi
    item_title: 'Herman Miller Aeron Chair',
    last_message: 'I can meet at Dubai Mall this weekend.',
    unread_count: 0,
    messages: [
      { id: 'msg-6', sender_id: 'user-demo', content: 'Hi Fatima! Love your Herman Miller chair. Would you swap it for my Tennis Racket?', created_at: '2026-03-21T14:00:00', is_system: false },
      { id: 'msg-7', sender_id: 'user-2', content: "Hi! That's a great racket. Let me think about it.", created_at: '2026-03-21T14:30:00', is_system: false },
      { id: 'msg-8', sender_id: 'user-2', content: "OK, I'm in! Where should we do the swap?", created_at: '2026-03-21T16:00:00', is_system: false },
      { id: 'msg-9', sender_id: 'user-demo', content: 'I can meet at Dubai Mall this weekend.', created_at: '2026-03-21T16:15:00', is_system: false }
    ]
  },
  {
    id: 'conv-3',
    swap_id: 'swap-4',
    other_user: MOCK_USERS[7], // Layla Nouri
    item_title: 'Board Games Bundle',
    last_message: 'Swap request sent! Waiting for your response.',
    unread_count: 1,
    messages: [
      { id: 'msg-10', sender_id: 'user-8', content: "Hey! I'd love to swap my board games for your Polo Shirt.", created_at: '2026-03-25T09:00:00', is_system: false },
      { id: 'msg-11', sender_id: 'user-8', content: 'All three games are in great condition, played only a few times.', created_at: '2026-03-25T09:02:00', is_system: false },
      { id: 'msg-12', sender_id: 'user-demo', content: 'Swap request sent! Waiting for your response.', created_at: '2026-03-25T09:05:00', is_system: true }
    ]
  }
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
window.DEMO_USER = DEMO_USER;
window.MOCK_ITEMS = MOCK_ITEMS;
window.MOCK_SWAPS = MOCK_SWAPS;
window.MOCK_CONVERSATIONS = MOCK_CONVERSATIONS;
window.BADGE_TIERS = BADGE_TIERS;
window.ITEM_CONDITIONS = ITEM_CONDITIONS;
window.CATEGORY_META = CATEGORY_META;

// Helper functions
window.getMockUserById = getMockUserById;
window.getMockItemsByUser = getMockItemsByUser;
window.getMockItemsByCategory = getMockItemsByCategory;
window.getMockGiveaways = getMockGiveaways;
window.getMockBoostedItems = getMockBoostedItems;
window.getMockItemsSorted = getMockItemsSorted;

console.log('[Swappo] Mock data loaded:', MOCK_ITEMS.length, 'items,', MOCK_USERS.length, 'users');
