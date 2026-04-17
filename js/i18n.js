/**
 * SWAPPO i18n — machinery + lazy language loader
 *
 * Translation data lives in js/i18n/<lang>.js (one file per language).
 * Each page loads js/i18n/en.js first as fallback, then this file.
 * initI18n() loads the user's saved language on top of EN when different.
 *
 * Supported languages: EN (fallback, always loaded), FR, AR, UR, RU.
 * RTL: AR and UR.
 */

// ========================================
// TRANSLATION STORAGE (populated by i18n/<lang>.js modules)
// ========================================

const translations = Object.create(null);

/**
 * Called by each js/i18n/<lang>.js file to register its dictionary.
 * Idempotent — re-registering merges into the existing dictionary.
 */
function __SWAPPO_I18N_REGISTER__(lang, dict) {
  translations[lang] = Object.assign(translations[lang] || {}, dict || {});
  // If the active language just arrived, refresh the DOM.
  if (lang === currentLanguage && typeof applyTranslations === 'function') {
    applyTranslations();
    updateLanguageSelector(lang);
  }
}
try { window.__SWAPPO_I18N_REGISTER__ = __SWAPPO_I18N_REGISTER__; } catch (e) {}

// Drain any registrations that landed before the machinery booted.
try {
  var queued = window.__SWAPPO_I18N_QUEUE__ || [];
  queued.forEach(function (entry) { __SWAPPO_I18N_REGISTER__(entry[0], entry[1]); });
  window.__SWAPPO_I18N_QUEUE__ = [];
} catch (e) {}

// ========================================
// DYNAMIC LANGUAGE LOADER
// ========================================

const _langPromises = Object.create(null);

function _resolveBasePath() {
  // Find ourselves in the DOM to compute the relative path to js/i18n/.
  var scripts = document.getElementsByTagName('script');
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].src || '';
    var idx = src.indexOf('/js/i18n.js');
    if (idx !== -1) return src.substring(0, idx + 4); // keep "/js"
  }
  // Fallback: same-origin path relative to the current page.
  return location.pathname.indexOf('/pages/') === 0 ? '../js' : 'js';
}

function loadLanguage(lang) {
  if (!lang) return Promise.resolve();
  if (translations[lang]) return Promise.resolve();              // already loaded
  if (_langPromises[lang]) return _langPromises[lang];           // in flight

  _langPromises[lang] = new Promise(function (resolve, reject) {
    var s = document.createElement('script');
    s.src = _resolveBasePath() + '/i18n/' + lang + '.js';
    s.async = true;
    s.onload = function () { resolve(); };
    s.onerror = function () {
      delete _langPromises[lang];
      reject(new Error('Failed to load language: ' + lang));
    };
    document.head.appendChild(s);
  });
  return _langPromises[lang];
}

// ========================================
// STATE
// ========================================

let currentLanguage = 'en';
const RTL_LANGUAGES = ['ar', 'ur'];
const STORAGE_KEY = 'swappo_language';
const LANGUAGE_CHANGED_EVENT = 'languageChanged';

// ========================================
// TRANSLATION FUNCTION
// ========================================

/**
 * Get translated string for current language, with EN fallback.
 */
function t(key, lang) {
  const code = lang || currentLanguage;
  if (translations[code] && translations[code][key]) return translations[code][key];
  if (translations.en && translations.en[key]) return translations.en[key];
  return key;
}

function getCurrentLang() { return currentLanguage; }

function detectBrowserLanguage() {
  const browserLang = navigator.language || navigator.userLanguage || 'en';
  const langCode = browserLang.split('-')[0];
  const supported = ['en', 'fr', 'ar', 'ur', 'ru'];
  return supported.indexOf(langCode) !== -1 ? langCode : 'en';
}

// ========================================
// APPLY TRANSLATIONS TO DOM
// ========================================

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (key) el.innerHTML = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.placeholder = t(key);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.title = t(key);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (key) el.setAttribute('aria-label', t(key));
  });
  document.querySelectorAll('[data-i18n-alt]').forEach(el => {
    const key = el.getAttribute('data-i18n-alt');
    if (key) el.alt = t(key);
  });
  document.querySelectorAll('[data-i18n-value]').forEach(el => {
    const key = el.getAttribute('data-i18n-value');
    if (key) el.value = t(key);
  });
}

// ========================================
// SET LANGUAGE + RTL
// ========================================

/**
 * Set the active language. If its dictionary hasn't been fetched yet,
 * loadLanguage() will fetch js/i18n/<lang>.js on demand and the DOM
 * will refresh automatically via __SWAPPO_I18N_REGISTER__.
 */
function setLanguage(lang) {
  if (!['en', 'fr', 'ar', 'ur', 'ru'].includes(lang)) {
    console.warn('[i18n] unsupported language', lang, '— falling back to en');
    lang = 'en';
  }
  currentLanguage = lang;

  try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}

  document.documentElement.lang = lang;
  const isRTL = RTL_LANGUAGES.indexOf(lang) !== -1;
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.body.classList.toggle('rtl', isRTL);

  applyLanguageFonts(lang);

  // Apply what we already have (may be partial until the dict loads) then
  // refresh again once the dict arrives.
  applyTranslations();
  updateLanguageSelector(lang);

  loadLanguage(lang).then(function () {
    applyTranslations();
    updateLanguageSelector(lang);
  }).catch(function (err) {
    console.error('[i18n]', err);
  });

  document.dispatchEvent(new CustomEvent(LANGUAGE_CHANGED_EVENT, {
    detail: { language: lang, isRTL: isRTL }
  }));
}

function applyLanguageFonts(lang) {
  let fontFamily = '';
  if (lang === 'ar')      fontFamily = '"Cairo", "Droid Arabic Naskh", "Arabic Typesetting", sans-serif';
  else if (lang === 'ur') fontFamily = '"Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", sans-serif';
  else                    fontFamily = ''; // inherit from style.css (Inter)
  document.documentElement.style.fontFamily = fontFamily;
}

// ========================================
// LANGUAGE SELECTOR UI
// ========================================

const LANG_LIST = [
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'ar', label: 'AR', flag: '🇦🇪' },
  { code: 'ur', label: 'UR', flag: '🇵🇰' },
  { code: 'ru', label: 'RU', flag: '🇷🇺' }
];

function createLanguageSelector() {
  if (document.getElementById('swappo-language-selector')) return;

  const current = LANG_LIST.find(l => l.code === currentLanguage) || LANG_LIST[0];

  const dropdown = document.createElement('div');
  dropdown.id = 'swappo-language-selector';
  dropdown.className = 'lang-dropdown';

  const toggle = document.createElement('button');
  toggle.className = 'lang-dropdown-toggle';
  toggle.innerHTML = '<span class="flag">' + current.flag + '</span> <span class="label">' + current.label + '</span> <i class="fas fa-chevron-down lang-arrow"></i>';
  dropdown.appendChild(toggle);

  const menu = document.createElement('div');
  menu.className = 'lang-dropdown-menu';

  LANG_LIST.forEach(function (lang) {
    const item = document.createElement('button');
    item.className = 'lang-dropdown-item' + (lang.code === currentLanguage ? ' active' : '');
    item.setAttribute('data-lang', lang.code);
    item.innerHTML = '<span class="flag">' + lang.flag + '</span> <span class="label">' + lang.label + '</span>';
    item.addEventListener('click', function (e) {
      e.stopPropagation();
      setLanguage(lang.code);
      menu.classList.remove('open');
      toggle.classList.remove('open');
    });
    menu.appendChild(item);
  });
  dropdown.appendChild(menu);

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    const open = menu.classList.toggle('open');
    toggle.classList.toggle('open', open);
  });
  document.addEventListener('click', function () {
    menu.classList.remove('open');
    toggle.classList.remove('open');
  });

  const navbarActions = document.querySelector('.navbar-actions');
  if (navbarActions) navbarActions.insertBefore(dropdown, navbarActions.firstChild);
  else document.body.appendChild(dropdown);

  injectLanguageSelectorCSS();
}

function updateLanguageSelector(lang) {
  const current = LANG_LIST.find(l => l.code === lang) || LANG_LIST[0];
  const toggle = document.querySelector('.lang-dropdown-toggle');
  if (toggle) {
    toggle.innerHTML = '<span class="flag">' + current.flag + '</span> <span class="label">' + current.label + '</span> <i class="fas fa-chevron-down lang-arrow"></i>';
  }
  document.querySelectorAll('.lang-dropdown-item').forEach(function (item) {
    item.classList.toggle('active', item.getAttribute('data-lang') === lang);
  });
}

function injectLanguageSelectorCSS() {
  if (document.getElementById('swappo-i18n-styles')) return;
  const style = document.createElement('style');
  style.id = 'swappo-i18n-styles';
  style.textContent = [
    '.lang-dropdown { position: relative; z-index: 100; }',
    '.lang-dropdown-toggle { background: transparent; border: 1px solid #e0e0e0; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; color: #555; display: flex; align-items: center; gap: 6px; white-space: nowrap; transition: all 0.2s ease; font-family: inherit; }',
    '.lang-dropdown-toggle:hover, .lang-dropdown-toggle.open { border-color: #09B1BA; color: #09B1BA; }',
    '.lang-dropdown-toggle .flag { font-size: 16px; }',
    '.lang-dropdown-toggle .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }',
    '.lang-arrow { font-size: 9px; transition: transform 0.2s ease; margin-left: 2px; }',
    '.lang-dropdown-toggle.open .lang-arrow { transform: rotate(180deg); }',
    '.lang-dropdown-menu { position: absolute; top: calc(100% + 6px); right: 0; background: white; border: 1px solid #e0e0e0; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); padding: 6px; min-width: 130px; opacity: 0; visibility: hidden; transform: translateY(-8px); transition: all 0.2s ease; }',
    '.lang-dropdown-menu.open { opacity: 1; visibility: visible; transform: translateY(0); }',
    '.lang-dropdown-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border: none; background: transparent; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; color: #555; transition: all 0.15s ease; font-family: inherit; }',
    '.lang-dropdown-item:hover { background: #f0fbfc; color: #09B1BA; }',
    '.lang-dropdown-item.active { background: #09B1BA; color: white; }',
    '.lang-dropdown-item.active:hover { background: #078A91; }',
    '.lang-dropdown-item .flag { font-size: 16px; }',
    '.lang-dropdown-item .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }',
    'html[dir="rtl"] .lang-dropdown-menu { right: auto; left: 0; }',
    'html[dir="rtl"] .lang-dropdown-toggle, html[dir="rtl"] .lang-dropdown-item { flex-direction: row-reverse; }',
    /* Global RTL helpers */
    'html[dir="rtl"] { direction: rtl; text-align: right; }',
    'body.rtl [style*="flex-direction: row"] { flex-direction: row-reverse; }',
    'html[dir="rtl"] .navbar, html[dir="rtl"] .navbar-menu { flex-direction: row-reverse; }',
    'html[dir="rtl"] .navbar-logo { margin-left: auto; margin-right: 0; }',
    'html[dir="rtl"] .search-bar { margin-right: auto; margin-left: 20px; }',
    'html[dir="rtl"] .search-input { padding-left: 40px; padding-right: 16px; text-align: right; }',
    'html[dir="rtl"] .search-input::placeholder { text-align: right; }',
    'html[dir="rtl"] .search-icon { right: auto; left: 12px; }',
    'html[dir="rtl"] .card, html[dir="rtl"] .product-card, html[dir="rtl"] .category-grid, html[dir="rtl"] .form-group { direction: rtl; }',
    'html[dir="rtl"] .product-price { margin-left: 0; margin-right: auto; }',
    'html[dir="rtl"] .form-group label, html[dir="rtl"] .form-group input, html[dir="rtl"] .form-group textarea, html[dir="rtl"] .form-group select { text-align: right; }',
    'html[dir="rtl"] .btn-group { flex-direction: row-reverse; }',
    'html[dir="rtl"] .btn { margin-left: 0; margin-right: 8px; }',
    'html[dir="rtl"] .btn:last-child { margin-right: 0; }',
    'html[dir="rtl"] .rounded-left { border-radius: 0 8px 8px 0; }',
    'html[dir="rtl"] .rounded-right { border-radius: 8px 0 0 8px; }'
  ].join('\n');
  document.head.appendChild(style);
}

// ========================================
// INIT
// ========================================

function initI18n() {
  let savedLang = null;
  try { savedLang = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  const initialLang = savedLang || 'en';
  setLanguage(initialLang);
  createLanguageSelector();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initI18n);
} else {
  initI18n();
}

// ========================================
// PUBLIC API
// ========================================

window.i18n = {
  t: t,
  setLanguage: setLanguage,
  getCurrentLang: getCurrentLang,
  detectBrowserLanguage: detectBrowserLanguage,
  applyTranslations: applyTranslations,
  loadLanguage: loadLanguage,
  translations: translations
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { t, setLanguage, getCurrentLang, detectBrowserLanguage, applyTranslations, loadLanguage, translations };
}
