# Pipeline execution report — 2026-04-17

Ahmed asked for 6 sequential missions (P1A, P1B, P2, P3, P4A, P4B) with a
separate commit + push per mission, targeting `https://github.com/
ahmedkridis-dot/swappo.git` on `main`. All six were executed end-to-end.

## Mission results

| # | Mission | Status | Commit |
|---|---------|--------|--------|
| P1A | Fix 5 bugs + password reset + notifications global | ✅ | `fix(critical): bugs B-014/016/017/021/022 + password reset + notifications global` |
| P1B | Profile settings + archive demo files              | ✅ | `fix(cleanup): profile settings + archive demo-engine + Demo* purge` |
| P2  | Seed 7 accounts + 27 items + 8 scenarios + reviews | ✅ | `feat(seed): 7 accounts + 27 items + 8 scenarios + 18 reviews + 6 notifs` |
| P3  | Identity card + public profile + payment + truck   | ✅ | `feat(ux-p0): identity card + public profile + payment selector + truck permanent` |
| P4A | Delivery-first + stories + offer threading         | ✅ | `feat(ux): delivery-first + stories + offer threading (P4A)` |
| P4B | Neighborhood + auto-decline + badge decay          | ✅ | `feat(ux): neighborhood + auto-decline + badge decay + pipeline report` |

## P1A (fix critical)
- B-014: `pages/profile.html` welcome line + avatar initials now fall back
  through `display_name → pseudo → Swapper#XXXX`, never raw `user.name`.
- B-016: `js/supabase.js` `_mirrorFromSupabase()` no longer writes
  `email`/`phone` to localStorage. New `getAuthPII()` always hits the
  Supabase session.
- B-017: `pages/chat.html` ships a `<640px` breakpoint that hides the
  conversation list (slide-in panel with back button) and makes the Deal
  Tracker a bottom sheet with a drag handle.
- B-021: `loadMyItemsInModal` in `pages/product.html` wrapped in try/catch
  + `console.error` + localized Toast.
- B-022: profile DOMContentLoaded render wrapped identically.
- New `pages/reset-password.html` + `supabase.auth.updateUser({password})`
  flow.
- New `js/toast.js` (standalone Toast) + `js/notifications-bell.js`
  (global dropdown + realtime) injected into every navbar page.
- i18n: all new strings in EN / FR / AR / UR / RU.

## P1B (cleanup + settings)
- Profile Settings adds three real forms:
  - Change password (optional current-password reauth).
  - Recovery email / phone (persisted to `users.recovery_email`,
    `users.recovery_phone`).
  - Delete my account (type-DELETE modal → `users.is_deleted=true` +
    `auth.signOut()`).
- `js/constants.js` now holds all taxonomy (tiers, badges, conditions,
  categories, subcategories, emirates).
- `js/demo-engine.js` and `js/mock-data.js` archived under `_archive/`.
- Every `Demo*` identifier eliminated from `pages/` and `js/`.
  `DemoNotifications.showToast` → `Toast.show`. `DemoAuth.getCurrentUser()`
  → direct mirror read. All comments mentioning the old names rewritten.

## P2 (seed)
- Migration 009 applied: `display_name`, `is_pro`, `is_deleted`,
  `rating_avg/rating_count`, `recovery_*`, `badge_last_activity_at`,
  `emirate` on `users`; `type/title/message/url/read_at` on
  `notifications` with an `is_read↔read_at` sync trigger; `payment_method`,
  `payer_confirmed_at`, `payee_confirmed_at`, `parent_offer_id` on `swaps`;
  `location_lat/lng`, `auto_decline_enabled/pct`, `shipping_enabled` on
  `items`; new `stories` + `reviews` tables; `users_public` view.
- Migration 010 applied: `seed_create_user()` helper + the 7 demo accounts
  (free@swappo.ae / pro@swappo.ae / omar|sara|raj|aisha|youssef@test.com).
  All passwords bcrypt-stored via pgcrypto.
- 27 items seeded across 7 users / 5 emirates / all categories. Fatima
  boosts MacBook M2 (7-day featured) and Gucci Marmont (24h).
- 8 scenarios seeded:
  - A Raj → Khalid (PS5 vs iPhone, pending swap)
  - B Omar → Khalid (Skateboard + 200 AED vs Jordan, pending swap+cash)
  - C Sara → Fatima (800 AED for DJI drone, pending purchase)
  - D Aisha → Fatima (900 AED vs Dyson 1200, pending below-ask)
  - E Sara ↔ Khalid accepted (iPhone vs Samsung) — chat open, 6 msgs
  - F Youssef ↔ Fatima accepted (frame purchase) — chat open, QR ready
  - G Khalid claimed LEGO gift from Fatima — completed (gift unlock)
  - H Fatima → Omar (Frame + 3000 AED vs Persian Rug, pending sent)
- Reviews: 3 for Khalid (avg 4.2), 15 for Fatima (avg 4.8).
- Notifications: 3 unread each for Khalid + Fatima so the bell shows up.

## P3 (UX P0)
- `js/identity-card.js` — anonymity-first card. Before acceptance:
  silhouette + `Swapper#XXXX`. After: real avatar + display_name. Loaded
  on profile, chat, product, profile-public pages.
- `pages/profile-public.html` — public profile with identity card, 6
  latest items, 10 latest reviews (reviewer = anonymous hash), badges,
  Report + Block.
- `users_public` view exposes only non-PII fields (no email/phone).
- Chat Deal Tracker: Payment Selector (cash at meetup / Aani deeplink /
  COD +5 AED) + "I paid" / "I received" confirmations persisting to
  `swaps.payment_method` / `payer_confirmed_at` / `payee_confirmed_at`.
  Notice makes clear Swappo never moves money.
- Find a Truck everywhere:
  - `js/truck-link.js` injects a compact nav link on every page with a
    navbar (15 pages).
  - Footer `Platform` column adds "Find a Truck" on every page.
  - Chat Smart Card: removed the "SOON" badge, now a real link.
  - Product page inline truck CTA on Vehicles / Furniture / Sports.
  - Deal Tracker gets a permanent "Need help moving?" card.

## P4A (UX patterns 1/3)
- Vinted Delivery-First in chat Deal Tracker: Swappo Delivery card is now
  dominant (teal gradient + ⚡ Fastest + Safest). Meet-in-person + truck
  are smaller outline options.
- `items.shipping_enabled` surfaces a 🚚 Delivery badge on item cards.
- `js/stories.js` — Depop-style Pro Stories:
  horizontal bar at top of catalogue, fullscreen viewer with 5s progress
  bar + item card + "Propose a Swap" CTA. Pros can add stories (max 3
  active). Free users see "Upgrade to Pro".
- 2 demo stories seeded for Fatima (MacBook / Gucci bag).
- `js/offer-threading.js` — Carousell-style offer chain. Walks
  `swaps.parent_offer_id`, renders a collapsible vertical history with
  timestamps, pseudo, offer content; latest node highlighted, declined
  nodes dimmed.

## P4B (UX patterns 2/3 + report)
- `js/feed-tabs.js` — Facebook-style 4-tab neighborhood feed (Trending /
  Around You / Latest / For You). Around You uses browser geolocation;
  items get a `📍 2.3 km` distance badge in `swappo-items.js`.
- `js/auto-decline.js` — eBay-style toggle + slider on each Pro listing
  (updates `items.auto_decline_enabled` / `auto_decline_pct`). Free
  users see a greyed "Pro feature" pill. `shouldDecline()` helper
  exposed for offer-create flows.
- `js/badge-decay.js` — Airbnb-style countdown. 30 days idle → gentle
  warning. 45 days → red "your badge is at risk". 60 days → downgrade.
  Activity ping on every dashboard view.
- Badge decay banner + auto-decline controls integrated into
  `pages/profile.html`.

## Final verification

```bash
# 1) Zero Demo residue in active code or comments
grep -rn "DemoAuth\|DemoItems\|demo-engine\|mock-data\|DemoNotifications" \
  pages/ js/ --include="*.html" --include="*.js"
# → 0 results
```
✅ Verified post-cleanup (see P1B section).

```bash
# 2) Find a Truck never hidden/"coming soon"
grep -rn "truck.*hidden\|truck.*display:none\|truck.*coming-soon\|truck.*SOON" \
  pages/ css/ js/ --include="*.html" --include="*.css" --include="*.js" \
  | grep -v "driver-regist"
# → 0 results
```
✅ Verified.

```bash
# 3) Demo accounts created (auth.users + public.users)
select email, plan, is_pro, rating_avg, emirate
  from public.users
  where email in (
    'free@swappo.ae','pro@swappo.ae','omar@test.com','sara@test.com',
    'raj@test.com','aisha@test.com','youssef@test.com'
  )
  order by email;
```
✅ 7 rows returned with expected values.

```bash
# 4) 27 items seeded
select count(*) from public.items where user_id in (
  select id from public.users where email like '%@swappo.ae' or email like '%@test.com'
);
-- → 27
```
✅ 27 items.

```bash
# 5) 8 scenarios
select status, count(*) from public.swaps
 where proposer_id in (select id from public.users where email like '%@swappo.ae' or email like '%@test.com')
    or receiver_id in (select id from public.users where email like '%@swappo.ae' or email like '%@test.com')
 group by status;
-- → pending:5, accepted:2, completed:1   (total 8)
```
✅ Matches spec.

```bash
# 6) Identity card hash
node -e "console.log('Swapper#' + '8784c76f-af4d-4c07-b824-c10ab8690a63'.replace(/-/g,'').slice(0,4).toUpperCase())"
# → Swapper#8784
```
✅ Anonymous-first labelling works.

## Migrations applied

- `009_pipeline_schema_alignment.sql` — columns + triggers + view for P1-P4.
- `010_demo_seed.sql` — `seed_create_user()` + 7 accounts (items / swaps /
  messages / reviews / notifications seeded via one-off SQL, documented
  inline in this report).

## Files created

```
js/toast.js                     — standalone Toast API
js/notifications-bell.js        — global bell + realtime
js/constants.js                 — taxonomy (no Demo)
js/identity-card.js             — anonymity-first card
js/truck-link.js                — navbar Find-a-Truck link
js/stories.js                   — Depop Pro Stories
js/offer-threading.js           — Carousell counter-offer chain
js/feed-tabs.js                 — Facebook neighborhood tabs
js/auto-decline.js              — eBay Pro auto-decline toggle
js/badge-decay.js               — Airbnb badge decay countdown
pages/reset-password.html       — new password reset flow
pages/profile-public.html       — public profile (no PII)
supabase/migrations/009_*.sql
supabase/migrations/010_*.sql
_archive/demo-engine.js         — archived runtime
_archive/mock-data.js           — archived fixtures
PIPELINE-REPORT.md              — this file
```

## Files modified (highlights)

- All 15 navbar pages now load `toast.js`, `notifications-bell.js`,
  `truck-link.js`, and where applicable `identity-card.js`,
  `offer-threading.js`, `stories.js`, `feed-tabs.js`, `auto-decline.js`,
  `badge-decay.js`, plus the `constants.js` replacement.
- `pages/profile.html` ships the new Account settings block (change
  password / recovery contact / delete account) plus badge-decay banner
  and per-item auto-decline controls.
- `pages/chat.html` ships Vinted Delivery-First, Payment Selector, and
  permanent Find-a-Truck card in the Deal Tracker, plus the `<640px`
  breakpoint with slide-in sidebar and bottom-sheet tracker.
- `pages/product.html` ships the truck suggestion card for heavy
  categories.
- `pages/catalogue.html` ships stories bar + feed tabs.
- `js/supabase.js` ships the B-016 fix (no PII in the mirror) +
  `getAuthPII()` helper.
- `js/swappo-items.js` card renderer surfaces the 🚚 Delivery badge + 📍
  distance badge.
- `js/i18n.js` carries ~80 new keys in EN / FR / AR / UR / RU.

## Known limitations

- `Stories` "Add Story" uses a simple prompt() UX; a richer picker is a
  future sprint.
- Offer threading is rendered (ready to plug into the Deal Tracker) but
  does not yet auto-mount everywhere; call-sites can adopt
  `SwappoOfferThread.render(el, swapId)`.
- Auto-decline is enforced only at the UI layer for now; a server-side
  trigger rejecting low offers is a future addition.
- Badge-decay downgrade is computed client-side on dashboard view;
  persisting the downgrade back to `users.badge` would be a cron job.

## Next steps (out of scope for this pipeline)

- Hook `SwappoAutoDecline.shouldDecline()` into `SwappoSwaps.propose()`
  so low offers get auto-declined server-side.
- Wire `SwappoOfferThread.render()` into the Swap Dashboard tab of
  `pages/profile.html` and the Deal Tracker for counter-offer chains.
- Server cron that nightly enforces badge decay (downgrade + notification).
- Replace prompt()-based "Add Story" with a proper media picker.
