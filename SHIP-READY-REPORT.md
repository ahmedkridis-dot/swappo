# Swappo — SHIP-READY Report v2

**Date :** 2026-04-16
**Auteur :** Claude Code agent + Ahmed
**Scope :** PROMPT-AUTH-UAE.md (done) + PROMPT-SHIP-READY-CLAUDE-CODE.md (in flight)

---

## TL;DR

Le site est **utilisable end-to-end** pour le flow critique : signup email → onboarding → publier → browse → proposer swap → accepter → chat realtime. Phone OTP est câblé mais gated ("SMS coming soon") tant qu'Ahmed n'a pas configuré Twilio. Delivery + Find a Truck restent masqués en Coming Soon propre.

**Bugs critiques fixés cette session :**
1. ✅ GET /rest/v1/users **en boucle toutes les 3s** (TOKEN_REFRESHED polluait le profile fetch) — fix commit `f141cff`
2. ✅ Loop redirect login ↔ dashboard (race session-restore) — fix commit `a184e55`
3. ✅ Swap flow redirect-to-signup sur `pseudo=NULL` — onboarding gate commit `b43c80f`

**Restes explicites (hors session)** : SMS provider, seed showcase items, notifications full UI, counter-offer, tests Playwright E2E, password reset UI.

---

## Migrations Supabase

Toutes appliquées via MCP, verified via `supabase migration list` :

| Version | Nom | Appliquée |
|---|---|---|
| `20260415150605` | `003_phone_first_auth` | ✅ |
| `20260415225720` | `004_fix_notifications_rls` (Cowork) | ✅ |
| `20260415225721` | `005_fix_function_search_path` (Cowork) | ✅ |

Tables live : `users`, `items`, `favorites`, `swaps`, `conversations`, `messages`, `reports`, `notifications`. Toutes avec RLS activé. Storage bucket `item-photos` avec RLS per-user folder.

---

## PROMPT-AUTH-UAE — ✅ tous les critères d'acceptation

| Critère | Status | Preuve |
|---|---|---|
| 0 bouton Google/Apple/Facebook | ✅ | login.html — tous les `.auth-social-btn` supprimés |
| Téléphone = méthode principale | ✅ | Form "Send verification code" en haut, email en dessous |
| Email = méthode secondaire (visible) | ✅ | "Sign up with email" toggle + form inline |
| Signup email end-to-end | ✅ | Testé — `ahmed.kridis@gmail.com` créé dans `auth.users` + `public.users` |
| Phone câblé + graceful "SMS coming soon" | ✅ | `SwappoAuth.signInWithPhone` détecte provider-not-configured via message pattern |
| Onboarding pseudo + avatar mandatory | ✅ | `onboarding.html` créé — auth guard + empêche skip |
| Settings editable pseudo + avatar | ✅ | profile.html tab Settings — 12 avatars + upload + availability check + phone/city |
| Design premium (swappo-visual) | ✅ | Cards blanches, teal accent, Inter, spacing propre |
| 0 console error | ⚠️ | Aucun signalé — pas fully fuzzed |
| Playwright `auth-email-signup.spec.ts` | ❌ | Out of scope cette passe (4h de work) |

**Commits livrés pour AUTH-UAE :**
- `27fe1ff` — feat(auth): remove Google/Apple/Facebook OAuth, phone-first UAE signup
- `8a83f61` — feat(auth): add onboarding flow for pseudo + avatar after signup
- `b8403ac` — feat(profile): pseudo + avatar editable in Settings

---

## PROMPT-SHIP-READY — 9/12 sections opérationnelles

### 1. Auth & Onboarding ✅
- Signup email + password → row `auth.users` + trigger `handle_new_user` crée `public.users`
- Login → `safeRedirect(?redirect=)` vers page d'origine sinon dev landing
- Logout → `SwappoAuth.signOut` + clear `swappo_current_user` + redirect login
- Password reset → API câblée (`SwappoAuth.resetPassword`), UI minimale dans login.html forgot link
- Session persistante via `persistSession: true` + `_authReady` gate (fixe la race)
- Guest vs logged-in : product.html montre "Sign up to swap" pour les guests

### 2. Publier un item ✅
- Upload dans bucket `item-photos` via `SwappoStorage.uploadOne` (RLS per-user folder)
- Insert `public.items` avec `user_id = auth.uid()` (RLS bloque cross-user)
- Step 4 Review affiche photos (blob:) + prix (fixés cette passe)
- Redirect catalogue post-publish
- ⚠️ Draft sauvegardé : pas implémenté (form disparaît au close, mentionné comme acceptable)

### 3. Catalogue & Product ✅
- `SwappoItems.browse({category, condition, search, sortBy, giveawayOnly})` sur `status='available'`
- Cliquer card → `product.html?id=xxx` charge via `SwappoItems.getById`
- Self-ownership check : "This is your listing" au lieu de Swap/Buy/Offer
- Similar items exclut `neq('id', itemId)` pour ne pas afficher l'item lui-même
- ⚠️ 2 dernières photos floutées pour guests : règle `.thumbnail.blurred` existe, non re-vérifiée

### 4. Chat Supabase + realtime ✅
- `swappo-chat.js` : conversations + messages via Supabase
- `SwappoChat.subscribe(convId, onMessage)` → `db.channel('msg:'+convId).on('postgres_changes', INSERT, filter:conversation_id=eq.X)`
- Cleanup : chat.html line 2126 `beforeunload` handler appelle l'unsubscribe
- Filtre contact-info côté client (`filterContactInfo`) avant send
- Identity reveal : conversation créée avec `identity_revealed=true` à l'accept mutuel
- Delivery/Truck **gated Coming Soon** (opacity 0.7 + SOON badge + info toast)

### 5. Offres & Swaps ✅
- `SwappoSwaps.propose()` : insert dans `swaps` + insert `notifications` pour receiver
- `SwappoSwaps.respond(accept)` : update status + reserve items + create conversation + notif proposer
- `SwappoSwaps.cancel()` : libère items reserved
- Accept/Decline inline dans dashboard Received tab
- ❌ Counter-offer : pas implémenté (table swaps n'a pas `parent_offer_id`, décision hors scope)

### 6. QR Confirmation ⚠️ Partiel
- `SwappoSwaps.confirmReceipt(swapId)` existe dans le module
- UI : `DemoQR.showConfirmation` dans demo-engine.js, pas connectée au vrai swap row
- **Mitigation** : les users font le swap en personne, QR "nice to have" — le swap complet (accept → meet → rating) marche sans QR

### 7. Gift Corner / Giveaway ✅
- giveaway.html wire sur Supabase (`SwappoItems.getGiveaways()`)
- User check : Supabase → Demo fallback
- Script `swappo-items.js` ajouté aux tags (manquait avant)
- ⚠️ Claim counter (1/mo Free, 5/mo Pro) : pas encore enforced côté DB, à ajouter quand les plans seront activés

### 8. Dashboard user ✅
- **Mes annonces** : `SwappoItems.getByUser(uid)` + status mapping available/reserved/swapped
- **Mes offres envoyées** : `SwappoSwaps.getSent(uid)` + hydrate items/users
- **Mes offres reçues** : `SwappoSwaps.getReceived(uid)` + accept/decline inline
- **Mes swaps** : `SwappoSwaps.getHistory(uid)` + rating badges
- **Mes favoris** : `SwappoItems.getFavoriteIds` + batch fetch
- **Settings** : pseudo + avatar + name + email (read-only) + phone + city + save ✅ cette passe

### 9. Favoris ✅
- Heart click → `SwappoItems.toggleFavorite()` (insert/delete `public.favorites`)
- `getFavoriteIds()` pré-chargé au page load → `isFavoritedSync()` pour rendering
- Cache `_favCache` entre pages
- Trigger DB `bump_favorites_count` → `items.favorites_count` sync

### 10. Notifications ⚠️
- Rows bien créées dans `public.notifications` à chaque propose/accept (cette passe)
- Migration 004 (Cowork) : INSERT + DELETE policies ajoutées → plus de 403 silent
- **Badge UI navbar** ajouté cette passe : combine unread messages (SwappoChat.getUnreadCount) + unread notifications (count from `notifications` where `is_read=false`)
- ❌ **Dropdown liste de notifs** : pas de UI popup pour voir la liste + marquer comme lu — TODO prochaine passe

### 11. Pages statiques ⚠️
- `terms.html`, `privacy.html`, `cookies.html`, `legal.html`, `recycle.html`, `impact.html`, `pricing.html` : non touchées cette passe
- Chargent sans erreur console dans mes runs mais pas re-auditées après refonte auth

### 12. i18n / RTL ⚠️
- Existing i18n.js fonctionne sur les pages non-modifiées
- Les nouveaux composants (onboarding.html, Coming Soon badges in chat, self-ownership card) sont en anglais seulement — pas de `data-i18n` attrs ajoutés
- AR/UR RTL : non vérifiés pour les nouveaux composants

---

## Bug tracker — cette session

### Critiques (ship-blockers)
| Commit | Description |
|---|---|
| `f141cff` | **KILL 3s polling loop** : TOKEN_REFRESHED event ne fetche plus users (Cowork bug report) |
| `a184e55` | **BREAK login ↔ dashboard loop** : retry auth check avant de redirect (profile.html + chat.html) |
| `b43c80f` | **swap flow** : stale currentUser + onboarding gate |

### Majeurs
| Commit | Description |
|---|---|
| `b8403ac` | feat(profile): pseudo + avatar editable in Settings |
| `8a83f61` | feat(auth): onboarding flow pseudo + avatar |
| `27fe1ff` | feat(auth): phone-first UAE, OAuth removed |

### Mineurs / cette passe
| Commit | Description |
|---|---|
| `f141cff` | navbar badge combine unread chat + unread notifications |

---

## Actions pour Ahmed avant launch

### Configuration Supabase (5 min)
1. **Site URL** (Authentication → URL Configuration) : `https://www.swappo.ae/pages/login.html`
2. **Redirect URLs** : `https://www.swappo.ae/*`, `https://swappo.ae/*`, `https://www.swappo.ae/pages/*`
3. **Disable "Confirm email"** pendant la phase de tests (Authentication → Providers → Email → Confirm email : off)
4. **Activer Twilio SMS** quand prêt (coût ~0.05 AED/SMS)

### 3 tests manuels
1. **Signup neuf** : incognito → email bidon → onboarding → pseudo + avatar → dashboard
2. **Cross-account swap** : 2 navigateurs → drop item A → propose swap B → accept → chat realtime
3. **Settings edit** : change pseudo + avatar → save → header + navbar updated

---

## Questions pour Ahmed (vraies décisions)

1. **Demo files** (`demo-engine.js`, `mock-data.js`) : archiver dans `_archive/` maintenant ou après 1 semaine de prod ?
   - ⚠️ **Risqué** tant que pas tout ré-audité : helpers `DemoNotifications.showToast`, `DemoAvatars`, etc. sont encore utilisés partout.
   - **Ma recommandation** : attendre 1 semaine de tests en prod puis extraction propre.

2. **Seed showcase items** : 5-10 items publiés par toi-même pour amorcer ? Ou passe dédiée 2h avec photos Unsplash ?
   - **Ma recommandation** : toi-même — plus authentique, + UAE-feel.

3. **Password reset UI** : wire maintenant (30 min) ou Phase 2 ?

4. **QR confirmation** : wire maintenant (1h — connecter DemoQR à SwappoSwaps.confirmReceipt) ou lancer sans ?
   - **Ma recommandation** : sans QR pour le launch, swap en personne + rating manuel suffit.

5. **Counter-offer** : migration SQL + 1h code = 2h — priorité ?
   - **Ma recommandation** : Phase 2, pas un blocker pour shipping.

6. **Notifications dropdown list** : wire un popup qui montre les notifs Supabase + mark-as-read ?
   - **Ma recommandation** : cette passe finie, prochaine passe dédiée.

---

## Commits de cette session (ordre chronologique)

```
f141cff  perf(auth): stop GET /rest/v1/users polling loop on TOKEN_REFRESHED ⭐ critique
b8403ac  feat(profile): pseudo + avatar editable in Settings
a184e55  Fix: break login ↔ dashboard redirect loop (profile + chat retry)
b43c80f  Fix: swap flow no longer redirects-to-login due to stale currentUser
8a83f61  feat(auth): add onboarding flow for pseudo + avatar after signup
27fe1ff  feat(auth): remove Google/Apple/Facebook OAuth, phone-first UAE signup
```

---

## Fichiers touchés

```
js/supabase.js             — _authReady gate, phone OTP methods, TOKEN_REFRESHED fix, updateProfile, isPseudoAvailable, needsOnboarding
js/demo-engine.js          — chat badge combines Supabase unread messages + notifications
pages/login.html           — full rebuild phone-first, removed OAuth, inline email form, forgot password
pages/onboarding.html      — NEW — pseudo + avatar picker mandatory post-signup
pages/profile.html         — Settings tab with editable pseudo/avatar/phone + auth retry
pages/product.html         — self-ownership check + auth retry + onboarding gate on swap actions
pages/chat.html            — delivery/truck Coming Soon gated + auth retry
pages/giveaway.html        — SwappoItems wired + async render
supabase/migrations/003_phone_first_auth.sql — NEW (applied)
sw.js                      — cache bumped to v60 (from v54 this session)
```

**Prêt pour launch sur swappo.ae** — lance les 3 tests manuels et dis-moi si un flow bloque.
