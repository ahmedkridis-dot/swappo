---
name: swappo-i18n
description: "**Swappo Internationalization System**: Complete i18n toolkit ensuring every text on every page is properly translated in all 5 languages (EN, AR, FR, UR, RU) with RTL support. MANDATORY TRIGGERS: any new page creation, any new component, any text modification, any UI label, any form field, any error message, any button, any notification, any placeholder, any tooltip, any badge name, any category label, any status label, any page title, any meta tag. Use this skill EVERY TIME you write or modify ANY text visible to the user — even a single word. Also use when adding a new language, fixing translation bugs, or doing a translation audit. If you are about to write a hardcoded string in HTML or JS, STOP and use this skill instead."
---

# Swappo i18n — Internationalization System

## Why This Matters

Swappo serves the UAE — a country with 200+ nationalities. Users switch languages and expect EVERYTHING to change. A single untranslated "Good" or "Next →" destroys trust. The rule is simple: if a user can see it, it must be translated.

## Supported Languages

| Code | Language | Direction | Flag |
|------|----------|-----------|------|
| EN   | English  | LTR       | 🇬🇧  |
| AR   | Arabic   | **RTL**   | 🇦🇪  |
| FR   | French   | LTR       | 🇫🇷  |
| UR   | Urdu     | **RTL**   | 🇵🇰  |
| RU   | Russian  | LTR       | 🇷🇺  |

English is the default. Arabic and Urdu require RTL layout.

## The Golden Rule

```
ZERO hardcoded strings in HTML or JavaScript.
Every visible text → translation key → translations file.
No exceptions. Ever.
```

If you catch yourself writing `<h2>Popular right now</h2>`, stop. It must be `<h2 data-i18n="home.popular_now"></h2>` (or whatever the project's i18n pattern is).

---

## Translation File Structure

Each language has its own JSON file. Keys are organized by page/section:

```
translations/
├── en.json    (English — source of truth)
├── ar.json    (Arabic)
├── fr.json    (French)
├── ur.json    (Urdu)
└── ru.json    (Russian)
```

### Key Naming Convention

Use dot-notation with this hierarchy: `page.section.element`

```json
{
  "common": {
    "next": "Next",
    "back": "Back",
    "submit": "Submit",
    "cancel": "Cancel",
    "see_all": "See all",
    "loading": "Loading...",
    "search_placeholder": "Search items..."
  },
  "nav": {
    "gift_corner": "Gift Corner",
    "kids": "Kids",
    "clothing": "Clothing",
    "electronics": "Electronics",
    "gaming": "Gaming & Consoles",
    "vehicles": "Vehicles",
    "all_categories": "All Categories",
    "drop_item": "Drop an Item",
    "join_swap": "Join the Swap"
  },
  "home": {
    "hero_title": "Someone needs what you have. Swap it.",
    "hero_subtitle": "The UAE's first barter platform. Trade items with your community. Start free.",
    "hero_cta": "Join the Swap",
    "popular_now": "Popular right now",
    "early_adopter_title": "Join the first 500 Early Adopters",
    "early_adopter_badge": "Pioneer badge",
    "early_adopter_plan": "Bronze plan FREE 6 months",
    "early_adopter_cta": "Claim your spot"
  },
  "publish": {
    "step_category": "Category",
    "step_details": "Details",
    "step_photos": "Photos",
    "step_review": "Review",
    "title": "What are you listing?",
    "subtitle": "Step {current} of {total} — Select a category",
    "next": "Next"
  },
  "categories": {
    "clothing_accessories": "Clothing & Accessories",
    "books_media": "Books & Media",
    "kids_baby": "Kids & Baby",
    "plants": "Plants",
    "sports_leisure": "Sports & Leisure",
    "furniture_home": "Furniture & Home",
    "electronics_phones": "Electronics & Phones",
    "vehicles": "Vehicles",
    "bags_accessories": "Bags & Accessories",
    "gaming_consoles": "Gaming & Consoles",
    "other": "Other"
  },
  "condition": {
    "new": "New",
    "like_new": "Like New",
    "good": "Good",
    "fair": "Fair"
  },
  "product_card": {
    "swap_button": "Propose a Swap",
    "favorite": "Add to favorites",
    "views": "{count} views"
  },
  "auth": {
    "login": "Log in",
    "signup": "Sign up",
    "email": "Email",
    "password": "Password",
    "forgot_password": "Forgot password?",
    "no_account": "Don't have an account?",
    "already_account": "Already have an account?"
  },
  "meta": {
    "page_title": "Swappo — Swap your stuff. No cash needed.",
    "page_description": "The UAE's first barter platform."
  }
}
```

---

## How to Apply Translations

### Pattern 1 — Data Attribute (recommended for static text)
```html
<h2 data-i18n="home.popular_now">Popular right now</h2>
<button data-i18n="common.next">Next</button>
<input data-i18n-placeholder="common.search_placeholder" placeholder="Search items...">
```

The English text stays as fallback. The i18n system replaces it at runtime.

### Pattern 2 — JavaScript (for dynamic text)
```javascript
// Use the translation function
const label = t('condition.good');  // Returns "Good" / "جيد" / "Bon état" / etc.

// For interpolation
const step = t('publish.subtitle', { current: 1, total: 4 });
// → "Step 1 of 4 — Select a category"
```

### Pattern 3 — Product Data (for database values)
Product conditions and categories stored in the database use English keys. The display layer MUST translate them:

```javascript
// WRONG — displays raw database value
cardElement.textContent = product.condition; // "good"

// CORRECT — translates the value
cardElement.textContent = t('condition.' + product.condition); // "جيد" in Arabic
```

Same for categories:
```javascript
// WRONG
tagElement.textContent = product.category; // "electronics"

// CORRECT
tagElement.textContent = t('categories.' + product.category); // "إلكترونيات"
```

---

## RTL Support Rules

When the language is Arabic (AR) or Urdu (UR), the entire layout must flip:

### HTML Direction
```javascript
// Set on language switch
document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
document.documentElement.lang = currentLang;
```

### CSS Rules
```css
/* Use logical properties — these flip automatically in RTL */
.card {
  margin-inline-start: 16px;   /* NOT margin-left */
  padding-inline-end: 24px;    /* NOT padding-right */
  text-align: start;           /* NOT text-align: left */
  border-inline-start: 3px solid #09B1BA; /* NOT border-left */
}

/* For flexbox/grid, direction reverses automatically with dir="rtl" */
/* But check these manually: */
.timeline::before {
  /* Line position needs [dir="rtl"] override */
}

[dir="rtl"] .timeline::before {
  left: auto;
  right: 50%;
}

/* Icons that imply direction need flipping */
[dir="rtl"] .arrow-icon {
  transform: scaleX(-1);
}

/* Numbers stay LTR even in RTL context */
.price, .phone-number, .stat-number {
  direction: ltr;
  unicode-bidi: embed;
}
```

### What to Check in RTL
- Navigation order reverses (right to left)
- Breadcrumbs flip direction
- Form labels align to the right
- Icons with directionality (arrows, chevrons) flip
- Progress bars fill from right to left
- Timeline line moves to the right side
- Scroll direction on carousels reverses
- Search icon moves to the right of the input
- Close (X) buttons stay consistent

---

## The i18n Checklist

**Run this checklist EVERY TIME you create or modify a page:**

### 1. Text Audit
- [ ] Every `<h1>` through `<h6>` has `data-i18n`
- [ ] Every `<p>` with visible text has `data-i18n`
- [ ] Every `<button>` and `<a>` with text has `data-i18n`
- [ ] Every `<label>` has `data-i18n`
- [ ] Every `<input placeholder>` has `data-i18n-placeholder`
- [ ] Every `<option>` in `<select>` has `data-i18n`
- [ ] Every tooltip / title attribute has `data-i18n-title`
- [ ] Every error message in JS uses `t('key')`
- [ ] Every success/notification message uses `t('key')`
- [ ] Every confirmation dialog uses `t('key')`

### 2. Dynamic Data
- [ ] Product conditions (Good, Like New, etc.) are translated at display time
- [ ] Category tags on product cards are translated at display time
- [ ] Badge names are translated
- [ ] Date/time formats adapt to locale
- [ ] Number formats adapt to locale (comma vs dot for decimals)

### 3. Page Meta
- [ ] `<title>` tag is translated
- [ ] `<meta name="description">` is translated
- [ ] Open Graph tags (og:title, og:description) are translated

### 4. RTL Check (for AR and UR)
- [ ] Page renders correctly in RTL
- [ ] No text overlap or overflow
- [ ] Icons with direction are flipped
- [ ] Forms align properly
- [ ] Navigation reverses

### 5. Translation Files
- [ ] New keys added to ALL 5 language files (en, ar, fr, ur, ru)
- [ ] No empty translation values (every key has a real translation)
- [ ] No English text in non-English files (common mistake: copying en.json and forgetting to translate)
- [ ] Plurals handled where needed

---

## Common Mistakes to Avoid

### Mistake 1: Hardcoded text in template literals
```javascript
// WRONG
element.innerHTML = `<span class="badge">Pioneer</span>`;

// CORRECT
element.innerHTML = `<span class="badge">${t('badges.pioneer')}</span>`;
```

### Mistake 2: Concatenating translated strings
```javascript
// WRONG — word order differs between languages
const msg = t('swap.you_have') + ' ' + count + ' ' + t('swap.items');

// CORRECT — use interpolation
const msg = t('swap.item_count', { count: count });
// en: "You have {count} items"
// ar: "لديك {count} عنصر"
// fr: "Vous avez {count} articles"
```

### Mistake 3: Forgetting alt text on images
```html
<!-- WRONG -->
<img src="eco.svg" alt="Eco friendly">

<!-- CORRECT -->
<img src="eco.svg" data-i18n-alt="impact.eco_friendly" alt="Eco friendly">
```

### Mistake 4: CSS content property
```css
/* WRONG — not translatable */
.required::after { content: " (required)"; }

/* CORRECT — use data attribute */
.required::after { content: attr(data-required-text); }
```
Then set `data-required-text` via JS using the translation system.

### Mistake 5: Forgetting number/currency formatting
```javascript
// WRONG
priceElement.textContent = product.price + ' AED';

// CORRECT
priceElement.textContent = new Intl.NumberFormat(currentLocale).format(product.price) + ' ' + t('common.currency');
```

---

## Adding a New Language

When a new language needs to be added:

1. Create the new translation file (e.g., `hi.json` for Hindi)
2. Copy `en.json` as the starting point
3. Translate ALL keys — do not leave any in English
4. Add the language to the selector UI (flag + code)
5. Determine if it's RTL or LTR
6. Test EVERY page in the new language
7. Check all dynamic data (conditions, categories, badges) render in the new language

---

## When Building a NEW Page

Follow this order:

1. **Plan all text content** — list every visible string on the page
2. **Add translation keys** to en.json first (source of truth)
3. **Add translations** to ar.json, fr.json, ur.json, ru.json
4. **Build the HTML** using `data-i18n` attributes everywhere
5. **Build the JS** using `t()` for all dynamic text
6. **Test in EN** — verify all text appears
7. **Test in AR** — verify translations + RTL layout
8. **Test in RU** — verify translations appear (catches missing keys)
9. **Run the checklist** above

Never build a page in English first and "add translations later." Build with i18n from the start — it's the same effort and prevents forgetting strings.

---

## Quick Reference: Translation Keys for Swappo

See `references/translation-keys.md` for the complete list of all existing translation keys organized by page. Always check this file before adding new keys to avoid duplicates or inconsistent naming.
