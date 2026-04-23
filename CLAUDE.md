# Swappo — Instructions pour Claude Code
**Dernière mise à jour : 17 avril 2026**

## Qu'est-ce que Swappo ?
Swappo (swappo.ae) est la **première marketplace UAE dédiée au swap, achat, vente, don et recyclage**. 4 modes : Swap (troc), Buy/Sell (cash), Gift (gratuit), Recycle (éco). Chaque item a un prix visible. Les utilisateurs sont **anonymes jusqu'à l'acceptance mutuelle** d'une offre.

## Communication
- **Ahmed** est le fondateur. Il parle **français** — toujours répondre en français.
- Interface : **5 langues** — EN (primaire), FR, AR (RTL), UR (RTL), RU
- Tout nouveau texte UI → ajouter dans `js/i18n.js` en 5 langues, utiliser `data-i18n="key"` ou `t('key')`

## Statut du projet
- **Supabase** : CONNECTÉ et opérationnel (auth, DB, storage, realtime)
- **Vercel** : Déployé, auto-deploy depuis GitHub main
- **Stealth mode** : `swappo.ae` = Coming Soon. Dev URL = `swappo.ae/dev-a7f3k9mz2q.html` (NE PAS référencer home.html)
- **GitHub** : `https://github.com/ahmedkridis-dot/swappo.git` branche `main`
- **Site VIDE** : zéro items en production. Prêt à lancer. Les vrais users ajouteront les vrais items.

## Skills obligatoires
**AVANT de coder, lis ces fichiers :**
1. `../.claude/skills/swappo-dev/SKILL.md` — Toutes les règles business, flows, demo accounts, UI specs
2. `../.claude/skills/swappo-visual/SKILL.md` — Design system, animations, composants visuels

## Règles absolues (JAMAIS violer)

### 1. SWAP FIRST
- Ordre des mots partout : **"swapping, buying, selling, gifting"** — jamais "buying" en premier
- CTA principal : **"Start Swapping"** (pas "It's Free", pas "Start Now")
- Bouton primaire product page : **"Propose a Swap"** (teal)
- Ordre badges sur cartes : Swap > Buy > Gift
- Footer tagline : **"The UAE's first dedicated barter, gift & recycle platform."**

### 2. ANONYMITÉ jusqu'à acceptance
- Avant acceptance : pseudo hashé `Swapper#XXXX` + badge + rating. PAS de nom, PAS de photo.
- L'offre = notification système, PAS un chat.
- Après acceptance mutuelle : identités révélées, chat s'ouvre.
- Le chat n'existe JAMAIS avant acceptance.

### 3. PAS DE PAIEMENT sur Swappo
Swappo ne touche JAMAIS l'argent des deals entre users.
- Revenue = delivery fees + Pro subs + boosts + transport commission + vehicle inspection + ads
- Pour l'extra-cash entre users : on affiche 2 options (Cash au meetup / COD). Swappo ne traite rien et ne promeut aucun payment provider gratuitement. Slot sponsorisé futur.
- Stripe = UNIQUEMENT pour Pro (29 AED/mois) + boosts + delivery fees Swappo

### 4. FIND A TRUCK = canal business permanent
- Visible dans : footer, Deal Tracker du chat, catalogue sidebar, product page (grosses catégories)
- **PAS** dans le header/navbar principal
- Seul le formulaire d'inscription chauffeur peut afficher "Coming Soon"

### 5. PAS DE MODE DÉMO
- Le site est en PRODUCTION. Zéro `DemoAuth`, `DemoItems`, `DemoGiveaway`, `DemoChat`, `DemoNotifications`
- Tout lit et écrit dans **Supabase**. Jamais localStorage pour des données métier.
- `demo-engine.js` et `mock-data.js` sont dans `_archive/` — ne pas les réintroduire
- Utiliser `js/toast.js` pour les toasts (pas DemoNotifications.showToast)
- Utiliser `js/constants.js` pour les taxonomies (pas mock-data.js)

### 6. DESIGN — ne pas changer
- Couleurs : teal `#09B1BA`, fond blanc `#FFFFFF`, texte `#171717`
- Font : Inter (+ Poppins pour headings)
- CSS existants : `style.css`, `swappo-visual.css`, `swappo-modern-2026.css`, `landing-upgrade.css`
- **Ne pas modifier les CSS existants** sauf bug explicite
- Nouveaux composants → copier le style des composants existants

## Tech Stack
- **Frontend** : HTML / CSS / vanilla JS (PAS de React, PAS de Next.js, PAS de TypeScript)
- **Backend** : Supabase (auth, PostgreSQL, storage, realtime, RLS)
- **Mobile** : PWA first → Capacitor wrapper plus tard
- **Hosting** : Vercel (auto-deploy depuis GitHub main)
- **i18n** : `js/i18n.js` avec objet `translations` + data-i18n + RTL auto pour AR/UR
- **Location** : Browser GPS + OpenStreetMap Nominatim
- **Design** : Vinted-inspired, voir skill `swappo-visual`

## CSS Variables (Design Tokens)
```css
--primary: #09B1BA;      /* Teal principal */
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

## Structure fichiers
```
ehvoila/
├── index.html                  ← Coming Soon (public)
├── dev-a7f3k9mz2q.html        ← Homepage réelle (dev URL)
├── CLAUDE.md                   ← CE FICHIER
├── manifest.json / sw.js       ← PWA
├── css/
│   ├── style.css               ← Design system global
│   ├── swappo-visual.css       ← Composants visuels
│   ├── swappo-modern-2026.css  ← Modernisation
│   └── landing-upgrade.css     ← Landing page
├── js/
│   ├── supabase.js             ← Client Supabase + helpers auth
│   ├── i18n.js                 ← Traductions 5 langues
│   ├── app.js                  ← GPS, favorites, filtres
│   ├── swappo-items.js         ← CRUD items Supabase
│   ├── swappo-swaps.js         ← CRUD swaps/offers Supabase
│   ├── swappo-chat.js          ← Chat realtime Supabase
│   ├── swappo-storage.js       ← Upload photos Supabase Storage
│   ├── toast.js                ← Notifications toast (remplace DemoNotifications)
│   ├── constants.js            ← Taxonomies catégories/conditions/badges
│   ├── identity-card.js        ← Composant Identity Card anonyme/révélé
│   ├── notifications-bell.js   ← Cloche notifs globale
│   ├── truck-link.js           ← Injection Find a Truck
│   ├── stories.js              ← Stories Pro (Depop-style)
│   ├── offer-threading.js      ← Threading contre-offres
│   ├── feed-tabs.js            ← Tabs catalogue (Trending/Around You/Latest/For You)
│   ├── auto-decline.js         ← Auto-decline Pro
│   ├── badge-decay.js          ← Badge decay Airbnb-style
│   ├── mega-menu.js            ← Mega menu catégories
│   ├── publier.js              ← Formulaire publication item
│   ├── chat.js / items.js / swaps.js ← Legacy helpers
│   └── _archive/               ← demo-engine.js, mock-data.js (MORT, ne pas utiliser)
├── pages/
│   ├── login.html              ← Join the Swap (signup/login Supabase Auth)
│   ├── onboarding.html         ← Pseudo + avatar après signup
│   ├── catalogue.html          ← Swap Market (browse + filtres + tabs)
│   ├── publier.html            ← Drop an Item (4 étapes + GPS)
│   ├── product.html            ← Page produit (Propose Swap / Buy / Make Offer)
│   ├── profile.html            ← My Swaps (dashboard complet)
│   ├── profile-public.html     ← Profil public read-only
│   ├── chat.html               ← SwapChat (realtime + Deal Tracker)
│   ├── giveaway.html           ← Gift Corner
│   ├── pricing.html            ← Free vs Pro
│   ├── transport.html          ← Find a Truck
│   ├── recycle.html            ← Recycle Hub
│   ├── impact.html             ← Swappo Impact
│   ├── reset-password.html     ← Reset mot de passe
│   ├── terms.html / privacy.html / cookies.html / legal.html
│   └── contact.html            ← Contact (+971 54 312 5559)
└── sql/
    └── schema.sql + migrations via Supabase MCP
```

## Business Model v5 (avril 2026)
| Plan | Prix | Détails |
|------|------|---------|
| **Free** | 0 | Unlimited listings/swaps/purchases, 1 gift claim/mois, 5% fee delivery, ads |
| **Pro** | 29 AED/mois (249/an) | 0% fee, 3 boosts/mois, 5 gift claims/mois, no ads, 💎 badge, analytics, Stories |

### Revenue streams (6)
1. **Delivery fees** (~30%) — marge sur livreur tiers
2. **Pro subscriptions** (~15%) — 29 AED/mois
3. **Boosts** (~15%) — 5/10/25 AED par promotion
4. **Find a Truck** (~10%) — commission 10-15% sur transporteurs
5. **Vehicle inspection** (~5%) — partenariat garages
6. **Ads** (~5%) — sur version Free

## Supabase — Tables principales
- `auth.users` — Comptes (email/phone, Supabase Auth)
- `profiles` / `users_public` (view) — Pseudo, avatar, rating, badges, is_pro
- `items` — Listings (title, category, brand, model, condition, price, modes, photos, GPS)
- `swaps` — Offres/échanges (proposer_id, receiver_id, items, status, payment_method)
- `conversations` + `messages` — Chat realtime
- `notifications` — Bell dropdown
- `reviews` — Ratings post-échange
- `stories` — Stories Pro 24h
- Toutes les tables ont RLS activé

## Vocabulaire Swappo
| Standard | Swappo |
|----------|--------|
| Home | Home |
| Catalogue | **Swap Market** |
| Post Item | **Drop an Item** |
| My Profile | **My Swaps** |
| Giveaways | **Gift Corner** |
| Messages | **SwapChat** |
| Login/Signup | **Join the Swap** |
| Notifications | **SwapAlerts** |

## Navbar standard (header)
Logo | Search | Chat icon | Profile icon | "Join the Swap" | "Drop an Item"
**PAS** de Find a Truck dans le header.

## UAE / Legal
- **Société** : Hannibal General Trading L.L.C - S.P.C
- **Abu Dhabi** — ADRA Registry No. 6158841
- **TDRA e-activity** : NOL-26-100000206 (valide jusqu'au 09/04/2027)
- **Contact** : +971 54 312 5559 / contact@swappo.ae

## Erreurs à ne JAMAIS reproduire
1. **DemoNotifications.showToast** → utiliser `Toast.show()` depuis `js/toast.js`
2. **DemoItems.browse / DemoItems.renderCard** → utiliser `SwappoItems` depuis `js/swappo-items.js`
3. **Chat avant acceptance** → le chat n'existe JAMAIS avant acceptance mutuelle
4. **"Buy" avant "Swap"** → Swap toujours en premier
5. **Items démo dans le catalogue** → le site est VIDE en production
6. **localStorage pour données métier** → Supabase uniquement
7. **Modifier les CSS sans demander** → copier le style existant
8. **Find a Truck dans le header** → seulement footer, Deal Tracker, catalogue sidebar
9. **Clés i18n manquantes** → chaque string en 5 langues, zéro `snake_case` affiché
10. **Reveal d'identité avant acceptance** → pseudo + badge seulement
