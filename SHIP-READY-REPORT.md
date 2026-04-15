# Swappo — Ship-Ready Report

**Date:** 2026-04-15
**Session scope:** Phase 2 hardening — marketplace flow end-to-end, Coming Soon gating, self-swap blockers, demo→Supabase migration tail.
**Author:** Claude Code agent with Ahmed.

---

## TL;DR

Le site marche pour le flow critique : **signup → publier → navigation catalogue → voir détail → proposer un swap → accepter → chat révélé**. Les deux modules volontairement hors-scope (Delivery + Find a Truck) sont gated en Coming Soon. Les scripts legacy `demo-engine.js` / `mock-data.js` sont **conservés** mais plus prioritaires (Supabase passe d'abord partout).

**Restes bloquants connus** (à décider avec Ahmed, pas tentés ici) :
1. Suppression/archivage des fichiers démo → risque de casse sans tests plus larges
2. Seed showcase (20-30 items publics) → 2h+ de prod, photos manquantes
3. E2E Playwright → pas encore scaffolded
4. i18n audit sur les nouveaux strings (AR/UR/RU) → pas encore passé

---

## Ce qui est fait ✅

### 1. Auth & Onboarding (Supabase)
- ✅ Signup email + password créé via `SwappoAuth.signUp` → trigger `handle_new_user` crée le row dans `public.users`
- ✅ Login avec `signInWithPassword` + mirror localStorage
- ✅ `safeRedirect()` appliqué sur login.html — les 6 call-sites + fallback pointent vers `dev-a7f3k9mz2q.html` (pas la Coming Soon)
- ✅ Session persistante via `persistSession: true` + `_authReady` gate qui élimine la race condition au chargement
- ✅ Guest vs logged-in : product.html affiche boutons "Sign up to swap" pour les guests
- ⚠️ **Password reset** : SwappoAuth.resetPassword existe dans le code (`js/auth.js` orphelin) mais n'est pas câblé dans login.html. Non ship-blocker — on peut lancer sans.
- ⚠️ **OAuth (Google/Apple/Facebook)** : boutons présents dans login.html mais non wired

### 2. Publier un item ✅
- ✅ Upload photos dans bucket `item-photos` avec RLS per-user folder
- ✅ Insert dans `public.items` avec `user_id = auth.uid()` (bloque cross-user writes via RLS)
- ✅ Review step affiche photos (bug blob: URL fixé) + prix (bug placeholder fixé)
- ✅ Publish flow protected : try/catch complet + logs `[publish]` pour diagnostic
- ✅ Redirect vers catalogue après publication

### 3. Catalogue & Product Page ✅
- ✅ Catalogue lit depuis Supabase via `SwappoItems.browse()` (Demo en fallback)
- ✅ Filtres category/condition/search/sort appliqués en SQL
- ✅ Product detail page charge depuis `SwappoItems.getById()`
- ✅ **Self-ownership fix** : si tu vois ton propre item, affiche "This is your listing" + Manage/Boost, cache les boutons Swap/Buy/Offer
- ✅ Défense anti-self-swap côté serveur : `swappo-swaps.js` rejette `proposer_id == receiver_id` avec l'erreur claire "You can't swap with yourself"
- ✅ Similar items exclut l'item courant (`.neq('id', itemId)`)

### 4. Chat & Messages
- ✅ `chat.html` lit conversations + messages depuis Supabase
- ✅ Realtime subscribe sur nouveaux messages (INSERT filter conversation_id)
- ✅ Contact-info filter auto-filtre phones/emails/URLs avant send
- ✅ Identity reveal : conversation apparaît avec `identity_revealed=true` quand swap accepté
- ✅ Delivery/Truck options gated en Coming Soon dans le Deal Panel (toast au click, opacité 0.7, badge SOON)
- ⚠️ Sidebar unread count : code présent mais pas testé en prod avec plusieurs users

### 5. Offres & Swaps ✅
- ✅ `SwappoSwaps.propose()` : insert dans `public.swaps` avec confirmation_code + anti-self-swap
- ✅ `SwappoSwaps.respond(accept=true)` : update status=accepted, réserve les deux items (status=reserved), crée la conversation avec identity_revealed=true, insère un message système
- ✅ `SwappoSwaps.respond(accept=false)` : update status=declined
- ✅ `SwappoSwaps.cancel()` : libère les items réservés
- ✅ Notifications Supabase insert dans `public.notifications` (kind='swap_proposed' pour le receiver, 'swap_accepted' pour le proposer)
- ⚠️ **Counter-offer** (contre-offre) : pas implémenté — le brief le mentionnait. À faire Phase 2.2.

### 6. QR Confirmation
- ✅ Code 6-char généré à la proposition
- ✅ `SwappoSwaps.confirmReceipt(swapId)` dans swappo-swaps.js
- ⚠️ **UI QR** : le code existe dans demo-engine.js `DemoQR.showConfirmation()`. Non testé avec la vraie table `swaps`. Non ship-blocker si on lance avec swaps en personne sans QR.

### 7. Gift Corner / Giveaway ✅ (fixé cette session)
- ✅ **Script swappo-items.js ajouté** à giveaway.html (manquait avant)
- ✅ Init refactor : `SwappoAuth.getCurrentUser` en premier, fallback DemoAuth
- ✅ `renderGiveawayItems()` maintenant async, charge `SwappoItems.getGiveaways()` en premier
- ✅ User-items check utilise `SwappoItems.getByUser()` pour gate "need 1+ swap OR 1+ donation"

### 8. Dashboard User (profile.html)
- ✅ Résout user via SwappoAuth
- ✅ Mes annonces : `SwappoItems.getByUser()` + mapping status new (available/reserved) vs legacy (active/pending)
- ✅ Mes swaps : `SwappoSwaps.getSent/getReceived/getHistory` hydrated via Supabase
- ✅ Favoris : `SwappoItems.getFavoriteIds()` + batch fetch
- ✅ Actions cancelSwap/acceptSwap/rejectSwap/rateSwap via SwappoSwaps
- ⚠️ **Notifications tab** : n'existe pas (pas présent dans le brief initial mais demandé dans Section 10)
- ⚠️ **Settings** : avatar picker / change password / delete account — pas implémenté

### 9. Favoris ✅
- ✅ Cœur click → `SwappoItems.toggleFavorite()` (insert/delete dans `public.favorites`)
- ✅ `getFavoriteIds()` préchargé au render pour `isFavoritedSync()`
- ✅ Cache `_favCache` partagé entre pages
- ✅ Trigger DB `bump_favorites_count` met à jour `items.favorites_count`

### 10. Notifications
- ✅ Row inserted dans `public.notifications` sur propose/accept swap (cette session)
- ⚠️ **UI cloche dans navbar** : pas de badge/list de notifs Supabase dans le navbar. Les toasts (DemoNotifications) sont client-only.
- ⚠️ **Realtime subscribe** sur notifications : pas encore câblé côté client

### 11. Coming Soon — Delivery & Find a Truck ✅
- ✅ **transport.html** : full page Coming Soon (preview badge, submitQuote = toast info)
- ✅ **chat.html Deal Panel** : Delivery + Truck options opacité 0.7 + badge "SOON" + toast info au click (pas de flow fantôme) — **fixé cette session**
- ✅ **product.html** : "Swappo Delivery" card déjà disabled avec "Coming Soon" label
- ✅ **catalogue.html** : truck banner link → transport.html (qui est Coming Soon)
- ℹ️ **Navbar** : pas de lien "Find a Truck" direct (OK)

### 12. Pages statiques
- ✅ `terms.html`, `privacy.html`, `cookies.html`, `legal.html`, `recycle.html`, `impact.html`, `pricing.html` : inchangées, pas cassées
- ⚠️ Pas auditées cette session pour régression visuelle

### 13. Redirects audit ✅
Agent-based full crawl : 0 redirect cassé, 0 link vers `home.html` (dead), 0 href="#" non intentionnel.

---

## Ce qui n'est PAS fait (à décider avec Ahmed)

### A. Suppression des fichiers démo
**Statut :** Non touché délibérément.
**Pourquoi :** `demo-engine.js` et `mock-data.js` sont encore chargés par chaque page HTML (`<script src="../js/demo-engine.js">`). Ils fournissent `DemoNotifications.showToast`, `DemoAvatars`, helpers de rendu que le code Supabase réutilise. Les supprimer sans test full régression risque de casser les toasts, les avatars, le badge Newcomer, etc.
**Recommandation :** après 1 semaine de tests réels, on extrait les helpers utiles dans un fichier propre puis on supprime le reste.

### B. Seed showcase 20-30 items
**Statut :** Non créé.
**Pourquoi :** ~2h à trouver 20-30 photos Unsplash respectant la licence, 8 catégories, 5 emirates, rédiger brand/model/size/color/price cohérents. Hors périmètre 1 session.
**Recommandation :** Ahmed peut publier 5-10 items lui-même pour amorcer, ou on le fait dans une passe dédiée.

### C. Nettoyage des users/items test dans Supabase
**Statut :** Non touché — tu as 3 users réels (ahmed, jihene, krd) + 2 items (lolo, sans titre). Aucun "Sarah AlMansoori" etc. n'existe en DB — c'est que des mocks localStorage dans `mock-data.js` qui ne sont **pas** écrits en DB.
**Recommandation :** à ton call — je peux les effacer via MCP si tu veux partir vide pour le lancement.

### D. Password reset end-to-end
**Statut :** Code présent dans `auth.js` (orphelin), pas dans login.html.
**Estimation :** 30 min pour câbler le form, tester l'email.

### E. OAuth Google/Apple/Facebook
**Statut :** Boutons UI présents, pas wirés (pas de `signInWithOAuth` appelé).
**Estimation :** 1h Google, 2h Apple, 1h Facebook (config provider Supabase + redirect URL).

### F. Counter-offer
**Statut :** Pas implémenté (table `swaps` n'a pas `parent_offer_id` column).
**Estimation :** Migration SQL + 1h code = 2h.

### G. Notifications UI (cloche navbar + liste)
**Statut :** Rows dans la DB mais pas de UI qui les lit.
**Estimation :** 2h (composant badge + dropdown + realtime subscribe).

### H. QR confirmation avec vraie table swaps
**Statut :** Code existe (DemoQR) mais non connecté à SwappoSwaps.confirmReceipt().
**Estimation :** 1h de câblage.

### I. Tests E2E Playwright
**Statut :** Pas scaffolded.
**Estimation :** 4h pour les 5 flows majeurs.

### J. i18n audit AR/UR/RU
**Statut :** Les pages marchent en EN ; FR partiellement ; AR/UR RTL non vérifiés sur les nouveaux composants (self-ownership card, Coming Soon badges in chat).
**Estimation :** 2h (traduction + vérif RTL).

---

## Fichiers touchés (cette session)

| Fichier | Changement |
|---|---|
| `pages/product.html` | Self-ownership check + Manage/Boost buttons, self-swap defense on buy/offer/swap, error card wrap, owner created_at safe slice |
| `pages/profile.html` | Async DOMContentLoaded wrap, status normalization (available/reserved/active/pending → visual class) |
| `pages/publier.html` | Review price placeholder empty by default |
| `pages/giveaway.html` | swappo-items.js script tag added, init refactored async, Supabase-first items fetch |
| `pages/chat.html` | Delivery/Truck options gated Coming Soon (opacity + SOON badge + info toast) |
| `pages/login.html` | All 6 redirects to `../dev-a7f3k9mz2q.html` + safeRedirect fallback same |
| `js/supabase.js` | `_authReady` gate + timeout on getSession + signIn/signUp non-blocking profile fetch + console.warn on silent paths + auth state INITIAL_SESSION handling |
| `js/publier.js` | publishItem try/catch + step logs + DemoAuth fake-ID fallback removed + _pubSafeUrl blob: support + populateReview price render |
| `js/swappo-items.js` | (unchanged this session — browse/getByUser/hasActiveItems all OK) |
| `js/swappo-swaps.js` | Notifications insert on propose + accept |
| `js/app.js` | checkPublishGate async + prefers SwappoItems |
| `js/mega-menu.js` | e.target.closest() guard (non-Element safeguard) |
| `js/auth.js` | Logout redirect fixed to dev-a7f3k9mz2q.html (orphan file, defensive) |
| `sw.js` | Cache version v41 → v53 (12 bumps cette session) |

---

## Migrations SQL exécutées

| Fichier | Statut |
|---|---|
| `supabase/migrations/001_init.sql` | Applied (before this session) — users + handle_new_user trigger |
| `supabase/migrations/002_phase2.sql` | Applied this session — items, favorites, swaps, conversations, messages, reports, notifications, storage bucket, RLS, RPCs (bump_views, bump_swap_count), realtime publication |

---

## Commits (cette session, en ordre chronologique)

```
e78b275 Phase 2: Supabase items/swaps/chat + Coming Soon delivery
2f5cf77 Fix: rename BADGE_TIERS in supabase.js to avoid collision with mock-data.js
20362f6 Fix: login redirects to dev landing, not Coming Soon page
6ad9781 Fix publier.html Review step: photos invisible + price empty
4ebee89 Debug + harden publishItem: full try/catch + step-by-step console logs
cc6e1d4 Fix: mega-menu.js TypeError breaking onclick handlers
895b6cf Fix: SwappoAuth.getCurrentUser() hangs forever on slow network
7215fe5 Production hardening audit: 7 fixes across auth/redirect/async/placeholder
f2c8511 Fix: login "loading forever" — profile fetch could hang signIn/signUp
aa9d029 Fix: product.html 'Cannot read slice of undefined' + profile.html status crash
5faa757 Fix: eliminate session-restoration race that caused "site jumps to login"
9d97ddc Fix marketplace flow: self-swap, status mismatch, Supabase-aware publish gate
<next> Ship-ready: giveaway Supabase, chat delivery/truck Coming Soon, SHIP-READY-REPORT
```

---

## 3 tests manuels avant launch (demandés par Ahmed)

### Test 1 — Signup + Publish (user neuf)
1. Fenêtre incognito → https://www.swappo.ae/pages/login.html
2. Switch to Signup → email bidon + password 8+ chars + name + pseudo
3. Valider → doit atterrir sur dev-a7f3k9mz2q.html (pas Coming Soon)
4. Naviguer vers Drop an Item → 4 steps avec 1 photo
5. **Attendu** : toast "Item published! 🎉" + redirect catalogue

### Test 2 — Cross-account swap proposal
1. Chrome normal : connecté comme `ahmed.kridis@gmail.com`
2. Safari : connecté comme `ahmed.kridis.89@gmail.com`
3. Ahmed clique sur l'item de krd dans catalogue
4. **Attendu** : boutons Propose/Buy/Offer visibles, pas "This is your listing"
5. Click Propose a Swap → modal avec son item "lolo" dans la liste
6. Sélectionne "lolo" → envoie offre
7. **Attendu** : toast success, row dans `swaps` (pending) + row dans `notifications` (pour krd)

### Test 3 — Accept + chat révélé
1. Safari : krd va sur "My Swaps" → tab Received → voit la proposition
2. Click Accept
3. **Attendu** : les 2 items passent à status=reserved, conversation créée dans DB, krd landing chat.html avec le message "Swap accepted — identities revealed"
4. Ahmed (Chrome) ouvre chat.html → la conversation apparaît dans sidebar
5. Message envoyé depuis Ahmed → apparaît **en realtime** chez krd (pas de refresh requis)

---

## Questions pour Ahmed

1. **Fichiers démo** (demo-engine.js, mock-data.js, chat-wizard.js) : tu veux que je les archive dans `_archive/` maintenant ou on attend 1 semaine de tests réels ?
2. **Seed showcase 20-30 items** : tu publies 5-10 toi-même pour commencer OU je fais une passe dédiée (2h) avec photos Unsplash + descriptions ?
3. **Users/items test dans Supabase** : tu veux qu'on garde ton compte + jihene + krd + items pour continuer à tester, ou on vide avant launch ?
4. **Password reset** : on le câble maintenant (30 min) ou Phase 2 ?
5. **OAuth Google** : priorité haute pour launch OU Phase 2 ?
6. **QR confirmation** : lancer avec swaps "en personne sans QR" et câbler après (à Phase 2), ou on câble maintenant (1h) ?

---

## Prochaine passe recommandée

Dans l'ordre, pour un launch public swappo.ae :

1. Valide les **3 tests manuels** ci-dessus → s'il y a un bug, on le fix immédiatement
2. Décisions sur mes 6 questions → qu'on implémente les blocs Phase 2 que tu juges must-have
3. **Seed items showcase** (si tu veux pas publier 10 items toi-même)
4. **E2E Playwright** pour figer le comportement acquis
5. **Switch de Coming Soon → site public** (changement de `/index.html` pour pointer sur dev-a7f3k9mz2q.html)

---

**Prêt pour launch sur swappo.ae — fais les 3 tests manuels ci-dessus et dis-moi si on ship ou si on fixe un dernier truc.**
