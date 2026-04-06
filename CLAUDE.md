# Swappo — Project Instructions for Claude Code

## What is Swappo?
Swappo (swappo.ae) is the **UAE's first barter platform**. Users swap items (clothing to cars) using a **subscription model**. No cash changes hands between users — Swappo monetizes via monthly subscription tiers that grant a quota of swaps per month. Identity is revealed automatically when both parties accept a swap. Think Vinted meets a freemium subscription model.

## Communication
- **Ahmed** is the project owner. He speaks **French** — always respond in French.
- Interface languages: **English** (primary), **French**, **Arabic**, **Urdu** (all 4 via i18n.js)

## Tech Stack
- **Frontend**: HTML / CSS / vanilla JS (static prototype — currently built)
- **Backend**: Supabase (auth, PostgreSQL database, storage, real-time chat) — TO BE CONNECTED
- **Mobile**: PWA first (manifest.json + sw.js already exist), then Capacitor for app stores
- **Location**: Browser GPS + OpenStreetMap Nominatim reverse geocoding (free, no API key)
- **Hosting target**: Vercel or Netlify
- **Design**: Vinted-inspired — white backgrounds, teal (#09B1BA) primary, clean cards, Inter font
- **Logo**: `<i class="fas fa-handshake"></i> Swappo` (handshake icon + text, everywhere)

## CSS Variables (Design Tokens)
```css
--primary: #09B1BA;
--primary-dark: #078A91;
--primary-light: #E6F7F8;
--secondary: #FF4B55;
--accent: #FF8C00;
--bg: #FFFFFF;
--bg-light: #F7F7F7;
--text: #171717;
--text-secondary: #555555;
--text-muted: #999999;
--border: #EBEBEB;
--radius: 8px;
--font: 'Inter', sans-serif;
```

## File Structure
```
ehvoila/
├── index.html              ← Homepage
├── manifest.json           ← PWA manifest
├── sw.js                   ← Service Worker
├── CLAUDE.md               ← This file (project instructions)
├── css/
│   └── style.css           ← Global design system
├── js/
│   ├── app.js              ← GPS, favorites, filters
│   └── i18n.js             ← Multilingual (EN/FR/AR/UR + RTL support)
├── img/
│   ├── icon-192.svg        ← PWA icon (handshake + SWAPPO)
│   └── icon-512.svg        ← PWA icon large
└── pages/
    ├── login.html          ← "Join the Swap" (signup/login)
    ├── catalogue.html      ← "Swap Market" (browse items)
    ├── publier.html        ← "Drop an Item" (list item — 4-step wizard)
    ├── giveaway.html       ← "Gift Corner" (free items)
    ├── product.html        ← Product detail page
    ├── profile.html        ← "My Swaps" (user profile/dashboard)
    └── chat.html           ← "SwapChat" (messaging)
```

## Swappo Vocabulary (Custom Branding)
| Standard        | Swappo Name       |
|----------------|-------------------|
| Home           | Home              |
| Catalogue      | **Swap Market**   |
| Post Item      | **Drop an Item**  |
| My Profile     | **My Swaps**      |
| Giveaways      | **Gift Corner**   |
| Messages       | **SwapChat**      |
| Login/Signup   | **Join the Swap** |
| Notifications  | **SwapAlerts**    |

## Core Business Rules (CRITICAL — never violate these)

### 1. Subscription-Based Swap Access
Users get a monthly quota of swaps based on their plan. Identity is revealed automatically when BOTH parties accept a swap (counts as 1 swap from each user's quota). Never show real names, photos, or contact info before mutual acceptance.

### 2. Subscription Tiers
| | Free | Bronze (19 AED/mo) | Silver (39 AED/mo) | Premium (69 AED/mo) |
|---|---|---|---|---|
| Swaps/month | 2 | 4 | 6 | Unlimited |
| Giveaway claims/month | 1 | 2 | 3 | 5 |
| Boosts/month | 0 | 1 | 2 | 4 |
| Badge | Newcomer | Bronze | Silver | Premium |
| Ads | Yes | Reduced | Reduced | No ads |
| Identity reveal | Included in swap | Included | Included | Included |

### 3. No Free-Text Descriptions
Product listings use ONLY structured form fields (dropdowns, selects). NO open text area for descriptions. This is an anti-circumvention measure — prevents users from sneaking contact info into descriptions.

### 4. Giveaway Rules
- Must have badge ⭐ (1+ completed swap) to access Gift Corner
- Claims limited by subscription tier (Free: 1/mo, Bronze: 2/mo, Silver: 3/mo, Premium: 5/mo)
- Claiming locks that category for 30 days (anti-reseller)

### 5. Chat Security
- In-app chat only (SwapChat)
- Auto-filter phone numbers, emails, and links
- Chat opens only after swap is mutually accepted

### 6. Content Moderation
Banned: weapons, drugs, adult toys, nudity, counterfeit, medications
3-level filtering: category blacklist → AI photo detection → user reports (3 reports = auto-suspend)

### 7. Guest Teaser Model
- Guests CAN browse and see products (last 2 photos hidden)
- Guests CANNOT: propose, like, publish, access giveaways, chat
- Pages must be SEO-indexable

## Badge System (6 Tiers + 5 Special)
### Tier badges (swap count):
- 🌱 Newcomer: 0 | ⭐ Swapper: 1 | 🔥 Active: 5 | 💎 Pro: 15 | 🏆 Elite: 30 | 👑 Legend: 75

### Special badges (stackable):
- 🎁 Generous Heart (5+ donations) | 🌍 Community Builder (5 referrals) | ⚡ Speed Swapper (exchange <48h) | 🛡️ Trusted Trader (10 consecutive, 0 disputes) | 🔍 Category Expert (5 in same category)

**Badges NEVER give free points — they are status only.**

## Revenue Streams (6)
1. Subscription tiers (core ~65%) — Bronze 19, Silver 39, Premium 69 AED/mo
2. Boost listings (~15%) — Bronze 1/mo, Silver 2/mo, Premium 4/mo, extra boosts purchasable
3. Advertising (~10%) — shown to Free and reduced for Bronze/Silver
4. Delivery partnerships Fetchr/Aramex (~5%)
5. High-value transaction fees (~3%) — Vehicles category
6. Data insights (long-term)

## Product Categories (8)
1. Clothing & Accessories
2. Books & Media
3. Kids & Baby
4. Sports & Leisure
5. Furniture & Home
6. Electronics & Phones
7. Vehicles
8. Other

## Multi-Swap
Users can offer 2-3 items against 1 (from MVP). Counts as 1 swap from each user's quota.

## Rating System
After exchange: both rate 1-5 stars. Public on profile. 3 reports → auto-suspend.

## Notifications (from Day 1)
- Push via PWA Web Push API
- Email via Supabase / Resend
- Triggers: swap proposal, swap accepted, new message, boost expiring, giveaway near you, badge unlocked, swap quota almost reached, subscription renewal

## Premium Subscription (69 AED/month) — Top Tier
- Unlimited swaps per month
- Premium badge
- No ads
- 4 boosts/month
- 5 giveaway claims/month

## UAE / Legal Context
- **Operating Company**: Hannibal General Trading - L.L.C - S.P.C
- **Registry No.**: 6158841 (Abu Dhabi - ADRA)
- **Economic Licence No.**: CN-5592284
- **Legal Form**: LLC - Sole Proprietorship Company
- **Licensed Activities**: E-Commerce Through Websites (4791018), E-Commerce Through Social Media (4791019), General Trading (4690018)
- **Owner**: Ahmed Ben Kridis Agrebi (100%)
- **Address**: Abu Dhabi, UAE
- **Licence Expiry**: 11/11/2026
- **Payments**: Apple Pay, Google Pay, Cards, Tabby, Stripe/Tap for subscriptions
- **Trademark**: "Swappo" to be registered via Ministry of Economy (~800-1,500 AED)
- **Applicable Law**: UAE Federal Laws, Federal Decree Law No. 14/2023 (E-Commerce), Federal Law No. 15/2020 (Consumer Protection)
- **Jurisdiction**: Courts of Abu Dhabi, UAE
- **No SVF license needed** — subscription model is standard SaaS
- **Legal pages**: Terms & Conditions, Privacy Policy, Cookie Policy (already created, need update to subscription model)

## Payment Policy (decided 2026-04-07)

Swappo processes payments via Stripe for ONLY these services:
- Pro subscriptions (29 AED/month or 249 AED/year)
- Boosts (5/10/25 AED per item promotion)
- Delivery service fees (Phase 2, ~20 AED per delivery)

Swappo NEVER processes:
- Cash top-ups between users (negotiation tool only, exchanged in person)
- Direct user-to-user payments (would require PSP license)

For swaps with cash top-up + delivery (Phase 2), the courier collects
cash via COD (Cash on Delivery) service. Swappo only charges the
delivery + COD service fees, never touches the user-to-user cash.

The cash top-up component on `pages/product.html` is purely a negotiation
tool — no fees, no Stripe calls, no commission. Users settle the cash
hand-to-hand at the swap meetup.

## What To Do Next
Priority tasks for backend connection:
1. Set up Supabase project (auth, database schema, storage buckets)
2. Connect login.html to Supabase Auth (email + Google/Apple/Facebook OAuth)
3. Create database tables: users, subscriptions, items, swaps, messages, ratings, badges
4. Connect publier.html to item creation (Supabase insert + Storage for photos)
5. Connect catalogue.html to real data (Supabase queries with filters)
6. Implement real-time chat via Supabase Realtime
7. Add subscription logic (tier check, swap quota tracking, monthly reset)
8. Integrate payment for subscriptions (Stripe or Tap Payments for UAE)
9. Deploy to Vercel/Netlify
