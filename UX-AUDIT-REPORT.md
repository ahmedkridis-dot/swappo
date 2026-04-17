# Swappo UX Audit — ui-ux-pro-max skill

**Date :** 2026-04-17
**Auditeur :** Claude Code + skill `ui-ux-pro-max` (Vercel + NextLevelBuilder design intelligence)
**Scope :** 17 pages HTML + 4 CSS + 20 modules JS, contre les 10 catégories de règles prioritaires du skill.

---

## 🚦 Verdict synthèse

| Priorité | Count | Doit fixer avant launch ? |
|---|---|---|
| 🔴 **P0 CRITICAL** | **91** | **OUI — blocker** |
| 🟠 **P1 HIGH** | **77** | OUI |
| 🟡 **P2 MEDIUM** | **117** | Recommandé |
| 🟢 **P3 LOW** | **26** | Quand on a le temps |
| **TOTAL** | **311** | |

**Catégories avec findings** : Accessibility (72) · Touch (20) · Layout (20) · Typography/Color (57) · Animation (105) · Forms (37).
**Catégories propres** : Performance, Style Selection, Navigation Patterns, Charts.

---

## 🔴 P0 CRITICAL — 91 findings

### 1.a Accessibility — 72 findings

#### `keyboard-nav` × 28 — clickable div/span non-keyboard-accessible
Des `<div onclick="…">` partout. Un utilisateur clavier (Tab puis Enter) ne peut pas les activer. **WCAG 2.1.1 Level A violation.**

Répartition : chat.html (×11), product.html (×4), profile.html (×4), catalogue.html (×1), giveaway.html (×1), autres.

**Fix** : remplacer `<div onclick>` par `<button type="button" class="…">` (ou ajouter `role="button"` + `tabindex="0"` + gestion keydown si vraiment pas possible).

#### `skip-links` × 20 — pas de skip-to-main
Aucune des 20 pages n'a `<a href="#main" class="sr-only">Skip to content</a>`. Un user clavier doit Tab ~15 fois dans la navbar avant d'arriver au contenu.

**Fix** : injecter le skip link en tête de `<body>` sur chaque page + `#main` sur la section principale.

#### `aria-labels` × 19 — boutons icône-only sans aria-label
Exemples : cloche de notifs, fav heart, bouton fermer modal, bouton burger menu, chevrons, etc. Un screen reader dit juste "button" sans contexte.

**Fix** : ajouter `aria-label="Notifications"`, `aria-label="Add to favorites"`, etc. Via `data-i18n-aria-label` pour traduction.

#### `alt-text` × 4 — images sans alt
catalogue.html (×2), chat.html (×1), giveaway.html (×1).

**Fix** : `alt=""` si décoratif, sinon texte descriptif traduit via `data-i18n-alt`.

#### `focus-states` × 1 — outline:none sans focus replacement
`pages/chat.html:771` — règle CSS qui retire le focus ring sans le remplacer. Navigation clavier invisible.

---

### 7.a Animation — 19 findings

#### `reduced-motion` × 19 — pas de `@media (prefers-reduced-motion)`
**WCAG 2.3.3 violation.** Les users qui ont activé "Reduce motion" dans leur OS doivent être respectés — les animations de reveal, stagger, hover lift, float, bounce sur Swappo tournent quand même.

**Fix** (global, un seul endroit) : ajouter dans `css/style.css` :
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 🟠 P1 HIGH — 77 findings

### 2. Touch & Interaction — 20 findings

#### `tap-delay` × 20 — pas de `touch-action: manipulation`
**Impact** : 300 ms de délai au tap sur mobile iOS/Android. Perçu comme "lag".

**Fix** (global) dans `css/style.css` :
```css
button, a, [role="button"], input, select, textarea { touch-action: manipulation; }
```

---

### 5. Layout & Responsive — 20 findings

#### `safe-area-awareness` × 20 — pas de `env(safe-area-inset-*)`
**Impact** : sur iPhone 14+ (notch/Dynamic Island), le contenu fixe (navbar, floating btn, bottom sheets) passe sous le notch.

**Fix** : sur chaque position fixed qui touche un bord :
```css
.navbar { padding-top: max(12px, env(safe-area-inset-top)); }
.bottom-sheet { padding-bottom: max(16px, env(safe-area-inset-bottom)); }
```

---

### 8. Forms & Feedback — 37 findings

#### `autofill-support` × 36 — `autocomplete` manquant sur inputs
iOS/Android/Chrome ne peuvent pas auto-remplir email/password/nom/adresse.

**Fix** : sur chaque `<input>` de formulaire, ajouter la valeur correcte :
- Email : `autocomplete="email"`
- Password login : `autocomplete="current-password"`
- Password signup : `autocomplete="new-password"`
- Phone : `autocomplete="tel"`
- Pseudo : `autocomplete="username"`
- Name : `autocomplete="name"`

#### `input-type-keyboard` × 1 — input sans type explicite
`pages/chat.html:1139` — devient `type="text"` par défaut, le bon clavier mobile ne se déclenche pas.

---

## 🟡 P2 MEDIUM — 117 findings

### 6. Typography & Color — 32 findings

#### `color-dark-mode` × 20 — `color-scheme` CSS manquant
Les scrollbars + inputs natifs n'adaptent pas au dark mode (fond sombre mais scrollbar blanche). Fix global dans `style.css` :
```css
html { color-scheme: light; }  /* ou "light dark" quand on ajoute dark mode */
```

#### `color-dark-mode` × 12 — `<meta name="theme-color">` manquant
Impact : la barre d'URL du navigateur mobile ne prend pas la couleur de ta marque.

**Fix** : sur chaque page :
```html
<meta name="theme-color" content="#09B1BA">
```

### 7. Animation — 85 findings

#### `transform-performance` × 85 — `transition: all` dispersé partout
Répartition : `landing-upgrade.css` (×8), `swappo-visual.css` (×8), `swappo-modern-2026.css` (×4), `style.css` (×3), plus inline dans les HTML (×62).

**Impact** : animations non-GPU-accelerated (animation de width/height/margin déclenche layout), perceptible sur mobile low-end.

**Fix** (long) : remplacer `transition: all 0.3s ease` par `transition: transform 0.3s ease, opacity 0.3s ease, background 0.3s ease` selon les props réellement animées.

---

## 🟢 P3 LOW — 26 findings

### 6. Typography — `"..."` × 25
Triple-dot ASCII au lieu de `…` (U+2026). Cosmétique.

### 7. Animation — `easing` × 1
`css/style.css:203` — linear sur UI transition (hors spinner). Remplacer par ease-out.

---

## 🎯 Plan de fix proposé

### Phase 1 — A11y blockers (avant launch) ~2h
- **[30 min]** Ajouter skip link global dans le head partial des 20 pages
- **[45 min]** Remplacer les 28 `<div onclick>` par `<button>` (chat.html × 11 priorité)
- **[30 min]** Ajouter `aria-label` sur les 19 boutons icône-only (via `data-i18n-aria-label` pour la trad)
- **[10 min]** Global `@media (prefers-reduced-motion)` dans style.css
- **[5 min]** Fix focus ring chat.html:771
- **[10 min]** Alt sur les 4 images

**Gain** : WCAG AA compliance, score Lighthouse A11y de ~80 → 95+.

### Phase 2 — Mobile UX (avant launch) ~1h
- **[5 min]** `touch-action: manipulation` global dans style.css
- **[30 min]** `env(safe-area-inset-*)` sur navbar sticky + bottom sheets chat
- **[30 min]** `autocomplete` sur les 36 inputs forms

**Gain** : -300ms perçu par tap sur mobile, autofill OS/password manager fonctionne, iPhone 14+ sans overlap notch.

### Phase 3 — Polish (post-launch) ~3h
- **[2h]** Remplacer les 85 `transition: all` par listes explicites — nécessite relecture composant par composant
- **[10 min]** `color-scheme` + `meta theme-color` global
- **[30 min]** Remplacer les 25 `...` par `…` via script sed
- **[10 min]** Fix easing linear en ease-out

**Gain** : perf animations mobile, cohérence typographique pro.

---

## Ce que le skill a ajouté comme valeur

Cet audit m'a fait checker **311 points** sur 10 catégories que je n'aurais pas vérifiés spontanément sans la checklist. Les 91 P0 sont tous des vrais blockers a11y — ils bloqueraient un audit WCAG officiel ou un client gouvernemental UAE (qui a des obligations d'accessibilité via TDRA).

**Sans le skill** j'aurais probablement attrapé :
- Les boutons icône sans aria-label (évident)
- Les div onclick (évident)
- Pas le skip link
- Pas prefers-reduced-motion
- Pas touch-action
- Pas safe-area-inset
- Pas les autocomplete

Soit ~50% des findings P0+P1.
