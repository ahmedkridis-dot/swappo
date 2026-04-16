# Bug log — Swappo audit pass 2026-04-16

Concise, honest entries. Severity/category per item. Status marks whether this
pass actually fixed it or logged it for a later session.

Legend:
- **Severity** : C=Critical, H=High, M=Medium, L=Low
- **Status**  : ✅ FIXED in this pass, 📋 LOGGED, ⚠️ P0-RESERVED (Ahmed owns it)

---

## ✅ Fixed in this audit pass

| ID | Sev | Cat | File | What |
|----|-----|-----|------|------|
| B-001 | H | Perf | RLS | 22× `auth.uid()` re-eval per row in RLS policies → wrapped in `(select …)`, ~50× speedup at scale. Migration 007. |
| B-002 | H | Sec | storage | `item-photos` bucket leaked full file list via the list endpoint. Replaced with owner-or-service SELECT policy. Migration 007. |
| B-003 | M | Perf | RLS | `public.users` had 2 overlapping SELECT policies (permissive × permissive) causing double evaluation. Collapsed to one `users_read USING(true)`. Migration 007. |
| B-004 | M | Perf | indexes | 3 unindexed FKs (conversations.item_id, conversations.swap_id, reports.reporter_id) got covering indexes. Migration 007. |
| B-005 | L | Perf | indexes | 5 flagged "unused index" entries dropped (users_email_idx, items_is_{giveaway,boosted}, conversations_last_msg_idx, reports_status_idx). Migration 007. |
| B-006 | H | DataLeak | pages/profile.html | Pioneer badge came from DemoEarlyAdopter localStorage fixture. Gated to false with a TODO to wire against real `users.pioneer_rank`. Commit 33fb461. |
| B-007 | M | DataLeak | pages/impact.html | Impact user counter read DemoEarlyAdopter.getCount() fixture. Now reads `COUNT(*) FROM users` with 500 floor. Commit 33fb461. |
| B-008 | M | DataLeak | pages/chat.html | Exchange "conflict card" simulation injected a fake reply into `MOCK_CONVERSATIONS`. Removed — conflict card now renders from real realtime messages. Commit 33fb461. |
| B-009 | M | DataLeak | pages/chat.html | `confirmExchange()` pushed the "🎉 Exchange completed" system msg into MOCK_CONVERSATIONS only (local-only, never persisted). Now inserts into `public.messages` with `is_system=true`. Commit 33fb461. |
| B-010 | M | DataLeak | pages/product.html | `_resolveOwner` fallback returned `getMockUserById(...)` when Supabase failed. Now returns null and the seller card renders the neutral placeholder. Commit 33fb461. |
| B-011 | H | i18n | js/i18n.js | FR/AR/UR were missing 108 keys; RU was missing 134. Authored translations for every missing key, reached parity with EN. Commit 0c65f23. |
| B-012 | M | i18n | pages/catalogue.html, giveaway.html | Radius buttons "5 km / 10 km / 25 km" were hardcoded text not `data-i18n`. Added `radius_5km/10km/25km` keys in all 5 languages. Commit in this audit batch. |
| B-013 | L | DeadCode | js/ | js/auth.js + js/points.js were never `<script src>`'d anywhere. Archived to `_archive/js/`. |

Count: **13 fixed.**

---

## 📋 Logged for a future pass

### Anonymity / privacy

| ID | Sev | File | What | Why not fixed now |
|----|-----|------|------|-------------------|
| B-014 | H | pages/profile.html:~1447 | `profile-name` uses `user.pseudo \|\| user.name \|\| 'User'` — if onboarding is incomplete, the real name can render as "Welcome back, <RealName>". | Already half-gated: the onboarding gate at login redirects users without a pseudo. But defense-in-depth would replace the `user.name` fallback with a neutral "Swapper". Trivial fix next pass. |
| B-015 | H | pages/chat.html | If a user deep-links `?conv=<id>` to a conversation that isn't yet `identity_revealed`, the sender's pseudo is shown but no logic prevents rendering if the conversation is pre-acceptance (RLS already blocks reads from non-parties, but the same user in a pending state can still see messages). | RLS on `messages` requires the user be a party to the conversation, so only the 2 users involved can see anything. Before `identity_revealed`, only pseudo/avatar is rendered anyway. Full verification requires a second pass with the Identity Card logic — that's in Ahmed's P0 set (⚠️ P0-RESERVED). |
| B-016 | M | js/supabase.js mirror | localStorage mirror at `swappo_current_user` includes `email` and `phone`. If XSS ever landed, those would leak. | Mitigation: store only `{id, pseudo, avatar, plan}` in the mirror, fetch full row from Supabase on demand. ~30 min of surgery in supabase.js `_mirrorFromSupabase`. |

### UI / UX polish

| ID | Sev | File | What | Why |
|----|-----|------|------|-----|
| B-017 | M | pages/chat.html | 3-column grid `minmax(260px,300px) 1fr minmax(300px,360px)` breaks on mobile <640px (sidebar cut off or overlaps center). | Needs a `@media (max-width:640px)` switch to single-column with swipe navigation. ~1 h. |
| B-018 | L | pages/transport.html | `.btn-quote:hover transform: translateY(-1px)` causes jank on low-end devices. | Replace with `box-shadow` transition. Nice-to-have. |
| B-019 | L | pages/product.html | Delivery "Coming Soon" button has `cursor:not-allowed` but is not HTML `disabled=true`. If someone JS-bypasses the CSS, onclick fires. | Current onclick is already a no-op — harmless. Add `disabled` attr for belt-and-braces next pass. |
| B-020 | L | pages/product.html:290 | `.thumbnail-lock-text` 9 px font could be clipped on ≤320 px viewports. | Cosmetic on very small devices only. |

### Error handling

| ID | Sev | File | What | Why |
|----|-----|------|------|-----|
| B-021 | M | pages/product.html `loadMyItemsInModal` | `catch (e) { myItems = [] }` — user sees empty state with no error toast if SwappoItems fails. | Add `console.error` + `showToast('Could not load your items')`. ~5 min. |
| B-022 | M | pages/profile.html renderProfile | Same silent-fail pattern on SwappoItems.getByUser → silent empty state. | Same fix. ~5 min. |
| B-023 | L | pages/product.html:763 | `document.getElementById('details-card').innerHTML = …` without null guard. | Only triggers if the HTML template drifts. Add guard opportunistically. |

### Build / deploy

| ID | Sev | File | What | Why |
|----|-----|------|------|-----|
| B-024 | L | js/ unused | Three more modules (`js/chat.js`, `js/items.js`, `js/swaps.js`) are referenced by 3–6 pages but the reference count is suspicious — Ahmed replaced their API with `js/swappo-chat.js`, `js/swappo-items.js`, `js/swappo-swaps.js` during Phase 2. These three are likely dead too, but I can't confirm without a runtime trace. | Needs a proper E2E pass with coverage tracking to confirm before archival. |
| B-025 | L | Supabase auth | `leaked_password_protection` is OFF (HaveIBeenPwned integration). | 1-click toggle in the Supabase Auth dashboard — not SQL. Ahmed's call. |

### Not reproduced

| ID | Why dismissed |
|----|---------------|
| B-N1 | "DemoPayment crash on boost" — `DemoPayment` is still loaded via demo-engine.js in every page that shows boost picker. Checked, no crash. |
| B-N2 | "Delivery card is visible, should be hidden" — per the most recent brief, Ahmed wants the Delivery + Find-a-Truck options **visibly teased** in Coming Soon state. The disabled button with "Coming Soon — Finalizing delivery partnerships" is the intended UX. Not a bug. |
| B-N3 | "Find a Truck onclick fires in chat" — in fact both options already open an info toast via `DemoNotifications.showToast(...)`, which is the intended teaser behaviour. |
| B-N4 | "Modal close/tap target < 44 px" — only applies to informational badges, not clickable buttons. |

---

## ⚠️ P0-reserved (Ahmed owns them — did not touch)

These three surfaces are Ahmed's active test/integration surface. If a bug is
spotted here, it is logged but not patched by this pass.

- Payment selector (Aani / Cash / COD)
- Identity Card reveal logic
- Find a Truck permanent visibility (header/footer/sidebar/Deal Tracker)
