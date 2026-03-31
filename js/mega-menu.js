/**
 * mega-menu.js
 * Complete mega-menu data structure and interaction logic for Swappo barter platform.
 * Vanilla JS, self-contained. Attaches globals to window.
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. DATA
  // ---------------------------------------------------------------------------

  var MEGA_MENU_DATA = [
    { key: 'gift_corner', icon: 'fas fa-gift', href: 'giveaway.html', special: true },
    {
      key: 'kids', icon: 'fas fa-baby', href: 'catalogue.html?category=kids',
      subs: [
        { key: 'kids_see_all', icon: '\u{1F441}', href: 'catalogue.html?category=kids' },
        { key: 'kids_girls', icon: '\u{1F467}', href: 'catalogue.html?category=kids&gender=girl', items: ['kids_clothing', 'kids_toys', 'kids_strollers', 'kids_furniture', 'kids_feeding', 'kids_books'] },
        { key: 'kids_boys', icon: '\u{1F466}', href: 'catalogue.html?category=kids&gender=boy', items: ['kids_clothing', 'kids_toys', 'kids_strollers', 'kids_furniture', 'kids_feeding', 'kids_books'] },
        { key: 'kids_unisex', icon: '\u{1F476}', href: 'catalogue.html?category=kids&gender=unisex', items: ['kids_clothing', 'kids_toys', 'kids_strollers', 'kids_furniture', 'kids_feeding', 'kids_books'] }
      ]
    },
    { key: 'plants', icon: 'fas fa-leaf', href: 'catalogue.html?category=plants' },
    {
      key: 'clothing', icon: 'fas fa-tshirt', href: 'catalogue.html?category=clothing',
      subs: [
        { key: 'clothing_see_all', icon: '\u{1F441}', href: 'catalogue.html?category=clothing' },
        { key: 'clothing_men', icon: '\u{1F454}', href: 'catalogue.html?category=clothing&gender=male', items: ['cl_shirts', 'cl_tshirts', 'cl_trousers', 'cl_jeans', 'cl_shorts', 'cl_suits', 'cl_jackets', 'cl_sweaters', 'cl_underwear', 'cl_men_shoes', 'cl_traditional'] },
        { key: 'clothing_women', icon: '\u{1F457}', href: 'catalogue.html?category=clothing&gender=female', items: ['cl_dresses', 'cl_tops', 'cl_women_trousers', 'cl_skirts', 'cl_abayas', 'cl_women_jackets', 'cl_women_sweaters', 'cl_lingerie', 'cl_women_shoes', 'cl_swimwear'] },
        { key: 'clothing_kids', icon: '\u{1F476}', href: 'catalogue.html?category=clothing&gender=kids', items: ['cl_baby', 'cl_girl', 'cl_boy', 'cl_teen_girl', 'cl_teen_boy', 'cl_kids_shoes'] },
        { key: 'clothing_unisex', icon: '\u26A7', href: 'catalogue.html?category=clothing&gender=unisex', items: ['cl_sportswear', 'cl_pyjamas', 'cl_accessories'] }
      ]
    },
    {
      key: 'bags_accessories', icon: 'fas fa-shopping-bag', href: 'catalogue.html?category=bags_accessories',
      subs: [
        { key: 'bags_see_all', icon: '\u{1F441}', href: 'catalogue.html?category=bags_accessories' },
        { key: 'bags_bags', icon: '\u{1F45C}', href: 'catalogue.html?category=bags_accessories&zone=bags', items: ['bag_handbags', 'bag_backpacks', 'bag_luggage', 'bag_sports', 'bag_clutches', 'bag_business', 'bag_tote'] },
        { key: 'bags_accessories', icon: '\u231A', href: 'catalogue.html?category=bags_accessories&zone=accessories', items: ['acc_watches', 'acc_sunglasses', 'acc_jewellery', 'acc_belts', 'acc_wallets', 'acc_scarves', 'acc_hats'] }
      ]
    },
    { key: 'electronics', icon: 'fas fa-mobile-alt', href: 'catalogue.html?category=electronics' },
    {
      key: 'gaming', icon: 'fas fa-gamepad', href: 'catalogue.html?category=gaming',
      subs: [
        { key: 'gaming_see_all', icon: '\u{1F441}', href: 'catalogue.html?category=gaming' },
        { key: 'gaming_consoles', icon: '\u{1F3AE}', href: 'catalogue.html?category=gaming&zone=consoles_hardware', items: ['gm_consoles', 'gm_pc_gaming', 'gm_monitors', 'gm_components', 'gm_controllers', 'gm_headsets', 'gm_keyboards', 'gm_chairs'] },
        { key: 'gaming_games', icon: '\u{1F579}', href: 'catalogue.html?category=gaming&zone=games', items: ['gm_ps5', 'gm_xbox', 'gm_switch', 'gm_pc_games', 'gm_retro'] },
        { key: 'gaming_accessories', icon: '\u{1F3A7}', href: 'catalogue.html?category=gaming&zone=accessories', items: ['gm_mousepads', 'gm_webcams', 'gm_led', 'gm_stands', 'gm_cards', 'gm_figures'] }
      ]
    },
    { key: 'furniture', icon: 'fas fa-couch', href: 'catalogue.html?category=furniture' },
    { key: 'vehicles', icon: 'fas fa-car', href: 'catalogue.html?category=vehicles' },
    { key: 'sports', icon: 'fas fa-futbol', href: 'catalogue.html?category=sports' },
    { key: 'books', icon: 'fas fa-book', href: 'catalogue.html?category=books' },
    { key: 'all', icon: 'fas fa-th', href: 'catalogue.html' }
  ];

  window.MEGA_MENU_DATA = MEGA_MENU_DATA;

  // ---------------------------------------------------------------------------
  // 2. ENGLISH FALLBACK LABELS  (keyed by i18n key without 'mega_' prefix)
  // ---------------------------------------------------------------------------

  var FALLBACK_LABELS = {
    gift_corner: 'Gift Corner',
    kids: 'Kids',
    kids_see_all: 'See All Kids',
    kids_girls: 'Girls',
    kids_boys: 'Boys',
    kids_unisex: 'Unisex',
    kids_clothing: 'Clothing',
    kids_toys: 'Toys',
    kids_strollers: 'Strollers & Car Seats',
    kids_furniture: 'Furniture',
    kids_feeding: 'Feeding',
    kids_books: 'Books & Learning',
    plants: 'Plants',
    clothing: 'Clothing',
    clothing_see_all: 'See All Clothing',
    clothing_men: 'Men',
    clothing_women: 'Women',
    clothing_kids: 'Kids',
    clothing_unisex: 'Unisex',
    cl_shirts: 'Shirts',
    cl_tshirts: 'T-Shirts',
    cl_trousers: 'Trousers',
    cl_jeans: 'Jeans',
    cl_shorts: 'Shorts',
    cl_suits: 'Suits',
    cl_jackets: 'Jackets',
    cl_sweaters: 'Sweaters',
    cl_underwear: 'Underwear',
    cl_men_shoes: 'Men Shoes',
    cl_traditional: 'Traditional Wear',
    cl_dresses: 'Dresses',
    cl_tops: 'Tops',
    cl_women_trousers: 'Women Trousers',
    cl_skirts: 'Skirts',
    cl_abayas: 'Abayas & Modest Wear',
    cl_women_jackets: 'Women Jackets',
    cl_women_sweaters: 'Women Sweaters',
    cl_lingerie: 'Lingerie',
    cl_women_shoes: 'Women Shoes',
    cl_swimwear: 'Swimwear',
    cl_baby: 'Baby',
    cl_girl: 'Girl',
    cl_boy: 'Boy',
    cl_teen_girl: 'Teen Girl',
    cl_teen_boy: 'Teen Boy',
    cl_kids_shoes: 'Kids Shoes',
    cl_sportswear: 'Sportswear',
    cl_pyjamas: 'Pyjamas',
    cl_accessories: 'Accessories',
    bags_accessories: 'Bags & Accessories',
    bags_see_all: 'See All Bags & Accessories',
    bags_bags: 'Bags',
    bag_handbags: 'Handbags',
    bag_backpacks: 'Backpacks',
    bag_luggage: 'Luggage',
    bag_sports: 'Sports Bags',
    bag_clutches: 'Clutches',
    bag_business: 'Business Bags',
    bag_tote: 'Tote Bags',
    acc_watches: 'Watches',
    acc_sunglasses: 'Sunglasses',
    acc_jewellery: 'Jewellery',
    acc_belts: 'Belts',
    acc_wallets: 'Wallets',
    acc_scarves: 'Scarves',
    acc_hats: 'Hats',
    electronics: 'Electronics',
    gaming: 'Gaming',
    gaming_see_all: 'See All Gaming',
    gaming_consoles: 'Consoles & Hardware',
    gaming_games: 'Games',
    gaming_accessories: 'Gaming Accessories',
    gm_consoles: 'Consoles',
    gm_pc_gaming: 'PC Gaming',
    gm_monitors: 'Monitors',
    gm_components: 'Components',
    gm_controllers: 'Controllers',
    gm_headsets: 'Headsets',
    gm_keyboards: 'Keyboards & Mice',
    gm_chairs: 'Gaming Chairs',
    gm_ps5: 'PS5 Games',
    gm_xbox: 'Xbox Games',
    gm_switch: 'Switch Games',
    gm_pc_games: 'PC Games',
    gm_retro: 'Retro Games',
    gm_mousepads: 'Mousepads',
    gm_webcams: 'Webcams',
    gm_led: 'LED Strips & Lighting',
    gm_stands: 'Stands & Mounts',
    gm_cards: 'Gift Cards',
    gm_figures: 'Figures & Collectibles',
    furniture: 'Furniture',
    vehicles: 'Vehicles',
    sports: 'Sports',
    books: 'Books',
    all: 'All Categories'
  };

  // ---------------------------------------------------------------------------
  // 3. HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Returns '' if the current page is inside the pages/ directory, '../' otherwise.
   */
  function getMegaPagePrefix() {
    var path = window.location.pathname;
    if (path.indexOf('/pages/') !== -1 || path.endsWith('/pages')) {
      return '';
    }
    return 'pages/';
  }

  window.getMegaPagePrefix = getMegaPagePrefix;

  /**
   * Resolve an href with the correct prefix.
   */
  function resolveHref(href, isSubpage) {
    if (typeof isSubpage === 'boolean') {
      return isSubpage ? href : 'pages/' + href;
    }
    return getMegaPagePrefix() + href;
  }

  /**
   * Get the label for a key: try i18n first, then fallback.
   */
  function label(key) {
    var i18nKey = 'mega_' + key;
    // If a global i18n function exists, use it
    if (typeof window.t === 'function') {
      var translated = window.t(i18nKey);
      if (translated && translated !== i18nKey) return translated;
    }
    return FALLBACK_LABELS[key] || key.replace(/_/g, ' ');
  }

  /**
   * Detect mobile viewport.
   */
  function isMobile() {
    return window.innerWidth < 768;
  }

  // ---------------------------------------------------------------------------
  // 4. RENDER MEGA MENU BAR (HTML string)
  // ---------------------------------------------------------------------------

  /**
   * Returns the HTML string for the Level 1 horizontal mega-menu bar.
   * @param {boolean} isSubpage - true if page is in pages/ dir
   */
  function renderMegaMenuBar(isSubpage) {
    var html = '<nav class="mega-menu-bar" role="navigation" aria-label="Category navigation">';
    html += '<div class="mega-menu-bar__inner">';

    for (var i = 0; i < MEGA_MENU_DATA.length; i++) {
      var cat = MEGA_MENU_DATA[i];
      var href = resolveHref(cat.href, isSubpage);
      var hasSubs = cat.subs && cat.subs.length > 0;
      var specialClass = cat.special ? ' mega-menu-item--special' : '';
      var subClass = hasSubs ? ' mega-menu-item--has-subs' : '';

      html += '<div class="mega-menu-item' + specialClass + subClass + '" data-category="' + cat.key + '">';
      html += '<a href="' + href + '" class="mega-menu-item__link">';
      html += '<i class="' + cat.icon + '"></i> ';
      html += '<span data-i18n="mega_' + cat.key + '">' + label(cat.key) + '</span>';
      if (hasSubs) {
        html += ' <span class="mega-menu-caret">\u25BE</span>';
      }
      html += '</a>';
      html += '</div>';
    }

    html += '</div>';
    html += '</nav>';
    return html;
  }

  window.renderMegaMenuBar = renderMegaMenuBar;

  // ---------------------------------------------------------------------------
  // 5. DROPDOWN RENDERING (internal)
  // ---------------------------------------------------------------------------

  /**
   * Build the dropdown panel HTML for a given category.
   */
  function buildDropdownHTML(cat) {
    if (!cat.subs || !cat.subs.length) return '';

    var prefix = getMegaPagePrefix();
    var html = '';

    html += '<div class="mega-dropdown" data-for="' + cat.key + '">';
    html += '<div class="mega-dropdown__inner">';

    // Left column: Level 2 subcategories
    html += '<div class="mega-left">';
    for (var i = 0; i < cat.subs.length; i++) {
      var sub = cat.subs[i];
      var hasItems = sub.items && sub.items.length > 0;
      var itemClass = 'mega-left__item' + (hasItems ? ' mega-left__item--expandable' : '');
      if (i === 0) itemClass += ' mega-left__item--see-all';

      html += '<a href="' + prefix + sub.href + '" class="' + itemClass + '" data-sub-key="' + sub.key + '">';
      html += '<span class="mega-left__icon">' + sub.icon + '</span> ';
      html += '<span class="mega-left__label" data-i18n="mega_' + sub.key + '">' + label(sub.key) + '</span>';
      if (hasItems) {
        html += ' <span class="mega-left__arrow">\u203A</span>';
      }
      html += '</a>';
    }
    html += '</div>';

    // Right column: Level 3 sub-items (one panel per subcategory)
    html += '<div class="mega-right">';
    for (var j = 0; j < cat.subs.length; j++) {
      var sub2 = cat.subs[j];
      if (!sub2.items || !sub2.items.length) continue;

      html += '<div class="mega-right__panel" data-panel-for="' + sub2.key + '">';
      html += '<div class="mega-right__grid">';
      for (var k = 0; k < sub2.items.length; k++) {
        var itemKey = sub2.items[k];
        html += '<a href="' + prefix + sub2.href + '&sub=' + itemKey + '" class="mega-right__link">';
        html += '<span data-i18n="mega_' + itemKey + '">' + label(itemKey) + '</span>';
        html += '</a>';
      }
      html += '</div>';
      html += '</div>';
    }
    html += '</div>';

    html += '</div>'; // .mega-dropdown__inner
    html += '</div>'; // .mega-dropdown

    return html;
  }

  // ---------------------------------------------------------------------------
  // 6. MOBILE DRAWER RENDERING (internal)
  // ---------------------------------------------------------------------------

  function buildMobileDrawerHTML() {
    var prefix = getMegaPagePrefix();
    var html = '';

    html += '<div class="mega-mobile-drawer">';
    html += '<div class="mega-mobile-drawer__header">';
    html += '<span class="mega-mobile-drawer__title"><span data-i18n="mega_all">All Categories</span></span>';
    html += '<button class="mega-mobile-drawer__close" aria-label="Close menu">&times;</button>';
    html += '</div>';
    html += '<div class="mega-mobile-drawer__body">';

    for (var i = 0; i < MEGA_MENU_DATA.length; i++) {
      var cat = MEGA_MENU_DATA[i];
      var hasSubs = cat.subs && cat.subs.length > 0;

      html += '<div class="mega-mobile-cat" data-category="' + cat.key + '">';

      // Category header row
      html += '<div class="mega-mobile-cat__header">';
      html += '<a href="' + prefix + cat.href + '" class="mega-mobile-cat__link">';
      html += '<i class="' + cat.icon + '"></i> <span data-i18n="mega_' + cat.key + '">' + label(cat.key) + '</span>';
      html += '</a>';
      if (hasSubs) {
        html += '<button class="mega-mobile-cat__toggle" aria-label="Expand">+</button>';
      }
      html += '</div>';

      // Accordion body
      if (hasSubs) {
        html += '<div class="mega-mobile-cat__body">';
        for (var j = 0; j < cat.subs.length; j++) {
          var sub = cat.subs[j];
          var hasItems = sub.items && sub.items.length > 0;

          html += '<div class="mega-mobile-sub">';
          html += '<div class="mega-mobile-sub__header">';
          html += '<a href="' + prefix + sub.href + '" class="mega-mobile-sub__link">';
          html += '<span class="mega-mobile-sub__icon">' + sub.icon + '</span> <span data-i18n="mega_' + sub.key + '">' + label(sub.key) + '</span>';
          html += '</a>';
          if (hasItems) {
            html += '<button class="mega-mobile-sub__toggle" aria-label="Expand">+</button>';
          }
          html += '</div>';

          if (hasItems) {
            html += '<div class="mega-mobile-sub__body">';
            for (var k = 0; k < sub.items.length; k++) {
              var itemKey = sub.items[k];
              html += '<a href="' + prefix + sub.href + '&sub=' + itemKey + '" class="mega-mobile-item">';
              html += '<span data-i18n="mega_' + itemKey + '">' + label(itemKey) + '</span>';
              html += '</a>';
            }
            html += '</div>';
          }

          html += '</div>'; // .mega-mobile-sub
        }
        html += '</div>'; // .mega-mobile-cat__body
      }

      html += '</div>'; // .mega-mobile-cat
    }

    html += '</div>'; // .mega-mobile-drawer__body
    html += '</div>'; // .mega-mobile-drawer

    return html;
  }

  // ---------------------------------------------------------------------------
  // 7. INJECT CSS (scoped styles for the mega-menu)
  // ---------------------------------------------------------------------------

  function injectStyles() {
    if (document.getElementById('mega-menu-styles')) return;

    var css = '';

    // Overlay
    css += '.mega-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.35);z-index:999;opacity:0;transition:opacity 200ms ease;pointer-events:none;}';
    css += '.mega-overlay--visible{opacity:1;pointer-events:auto;}';

    // Bar
    css += '.mega-menu-bar{background:#fff;border-bottom:1px solid #e0e0e0;position:relative;z-index:1001;overflow-x:auto;-webkit-overflow-scrolling:touch;}';
    css += '.mega-menu-bar__inner{display:flex;align-items:center;max-width:1200px;margin:0 auto;padding:0 8px;gap:0;}';
    css += '.mega-menu-item{position:relative;flex-shrink:0;}';
    css += '.mega-menu-item__link{display:flex;align-items:center;gap:6px;padding:10px 14px;font-size:13px;color:#333;text-decoration:none;white-space:nowrap;transition:background 150ms,color 150ms;}';
    css += '.mega-menu-item__link:hover,.mega-menu-item--active .mega-menu-item__link{background:#f5f5f5;color:#09B1BA;}';
    css += '.mega-menu-item--special .mega-menu-item__link{color:#FF4B55;font-weight:600;}';
    css += '.mega-menu-caret{font-size:10px;opacity:0.5;}';

    // Dropdown
    css += '.mega-dropdown{position:absolute;top:100%;left:0;right:0;width:100%;max-width:1200px;margin:0 auto;background:#fff;box-shadow:0 8px 24px rgba(0,0,0,0.12);border-radius:0 0 8px 8px;z-index:1002;overflow:hidden;transform:translateY(-8px);opacity:0;transition:transform 200ms ease,opacity 200ms ease;pointer-events:none;}';
    css += '.mega-dropdown--open{transform:translateY(0);opacity:1;pointer-events:auto;}';
    css += '.mega-dropdown__inner{display:flex;min-height:260px;}';

    // Left column
    css += '.mega-left{width:220px;min-width:220px;border-right:1px solid #eee;padding:12px 0;display:flex;flex-direction:column;}';
    css += '.mega-left__item{display:flex;align-items:center;gap:8px;padding:9px 18px;font-size:13px;color:#333;text-decoration:none;transition:background 150ms,color 150ms;cursor:pointer;}';
    css += '.mega-left__item:hover,.mega-left__item--active{background:#E6F7F8;color:#09B1BA;}';
    css += '.mega-left__item--see-all{font-weight:600;border-bottom:1px solid #eee;margin-bottom:4px;padding-bottom:12px;}';
    css += '.mega-left__icon{font-size:16px;width:22px;text-align:center;}';
    css += '.mega-left__arrow{margin-left:auto;opacity:0.4;font-size:16px;}';

    // Right column
    css += '.mega-right{flex:1;padding:16px 24px;position:relative;}';
    css += '.mega-right__panel{display:none;}';
    css += '.mega-right__panel--visible{display:block;}';
    css += '.mega-right__grid{display:flex;flex-wrap:wrap;gap:6px 24px;}';
    css += '.mega-right__link{display:block;padding:6px 0;font-size:13px;color:#555;text-decoration:none;min-width:140px;transition:color 150ms;}';
    css += '.mega-right__link:hover{color:#09B1BA;}';

    // Mobile drawer
    css += '.mega-mobile-drawer{position:fixed;top:0;left:0;width:85%;max-width:360px;height:100%;background:#fff;z-index:1100;transform:translateX(-100%);transition:transform 250ms ease;overflow-y:auto;-webkit-overflow-scrolling:touch;box-shadow:4px 0 16px rgba(0,0,0,0.15);}';
    css += '.mega-mobile-drawer--open{transform:translateX(0);}';
    css += '.mega-mobile-drawer__header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #eee;background:#fafafa;}';
    css += '.mega-mobile-drawer__title{font-size:16px;font-weight:600;color:#333;}';
    css += '.mega-mobile-drawer__close{background:none;border:none;font-size:24px;cursor:pointer;color:#666;padding:4px 8px;}';
    css += '.mega-mobile-drawer__body{padding:8px 0;}';

    css += '.mega-mobile-cat{border-bottom:1px solid #f0f0f0;}';
    css += '.mega-mobile-cat__header{display:flex;align-items:center;justify-content:space-between;}';
    css += '.mega-mobile-cat__link{flex:1;display:flex;align-items:center;gap:10px;padding:12px 16px;font-size:14px;color:#333;text-decoration:none;}';
    css += '.mega-mobile-cat__toggle{background:none;border:none;font-size:20px;padding:12px 16px;cursor:pointer;color:#888;}';
    css += '.mega-mobile-cat__body{display:none;padding-left:16px;background:#fafafa;}';
    css += '.mega-mobile-cat__body--open{display:block;}';

    css += '.mega-mobile-sub{border-top:1px solid #f0f0f0;}';
    css += '.mega-mobile-sub__header{display:flex;align-items:center;justify-content:space-between;}';
    css += '.mega-mobile-sub__link{flex:1;display:flex;align-items:center;gap:8px;padding:10px 12px;font-size:13px;color:#444;text-decoration:none;}';
    css += '.mega-mobile-sub__icon{font-size:15px;width:20px;text-align:center;}';
    css += '.mega-mobile-sub__toggle{background:none;border:none;font-size:18px;padding:10px 14px;cursor:pointer;color:#888;}';
    css += '.mega-mobile-sub__body{display:none;padding-left:20px;background:#f5f5f5;}';
    css += '.mega-mobile-sub__body--open{display:block;}';

    css += '.mega-mobile-item{display:block;padding:8px 12px;font-size:13px;color:#555;text-decoration:none;border-top:1px solid #eee;}';
    css += '.mega-mobile-item:hover{color:#09B1BA;}';

    // Responsive: hide bar scroll on desktop
    css += '@media(min-width:768px){.mega-menu-bar::-webkit-scrollbar{height:3px;}.mega-menu-bar::-webkit-scrollbar-thumb{background:#ccc;border-radius:3px;}}';

    var style = document.createElement('style');
    style.id = 'mega-menu-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // 8. STATE & INTERACTION
  // ---------------------------------------------------------------------------

  var _state = {
    activeCategory: null,
    activeSub: null,
    overlay: null,
    dropdownContainer: null,
    mobileDrawer: null,
    mobileOverlay: null,
    initialized: false,
    resizeTimer: null
  };

  /**
   * Close everything: dropdown, overlay, mobile drawer.
   */
  function closeMegaMenu() {
    // Desktop dropdown
    var openDropdowns = document.querySelectorAll('.mega-dropdown--open');
    for (var i = 0; i < openDropdowns.length; i++) {
      openDropdowns[i].classList.remove('mega-dropdown--open');
    }

    // Active bar items
    var activeItems = document.querySelectorAll('.mega-menu-item--active');
    for (var j = 0; j < activeItems.length; j++) {
      activeItems[j].classList.remove('mega-menu-item--active');
    }

    // Active left items
    var activeLeftItems = document.querySelectorAll('.mega-left__item--active');
    for (var k = 0; k < activeLeftItems.length; k++) {
      activeLeftItems[k].classList.remove('mega-left__item--active');
    }

    // Right panels
    var visiblePanels = document.querySelectorAll('.mega-right__panel--visible');
    for (var l = 0; l < visiblePanels.length; l++) {
      visiblePanels[l].classList.remove('mega-right__panel--visible');
    }

    // Overlay
    if (_state.overlay) {
      _state.overlay.classList.remove('mega-overlay--visible');
    }

    // Mobile drawer
    if (_state.mobileDrawer) {
      _state.mobileDrawer.classList.remove('mega-mobile-drawer--open');
    }
    if (_state.mobileOverlay) {
      _state.mobileOverlay.classList.remove('mega-overlay--visible');
    }

    _state.activeCategory = null;
    _state.activeSub = null;
  }

  window.closeMegaMenu = closeMegaMenu;

  /**
   * Open a dropdown for a specific category (desktop).
   */
  function openDropdown(catKey) {
    closeMegaMenu();

    var dropdown = document.querySelector('.mega-dropdown[data-for="' + catKey + '"]');
    var menuItem = document.querySelector('.mega-menu-item[data-category="' + catKey + '"]');

    if (!dropdown || !menuItem) return;

    menuItem.classList.add('mega-menu-item--active');
    dropdown.classList.add('mega-dropdown--open');
    if (_state.overlay) _state.overlay.classList.add('mega-overlay--visible');

    _state.activeCategory = catKey;

    // Activate first subcategory that has items, or the first one
    var firstExpandable = dropdown.querySelector('.mega-left__item--expandable');
    if (firstExpandable) {
      activateSubItem(dropdown, firstExpandable.getAttribute('data-sub-key'));
    }
  }

  /**
   * Activate a Level 2 sub-item: highlight it and show the right panel.
   */
  function activateSubItem(dropdown, subKey) {
    // Deactivate all
    var allLeft = dropdown.querySelectorAll('.mega-left__item');
    for (var i = 0; i < allLeft.length; i++) {
      allLeft[i].classList.remove('mega-left__item--active');
    }
    var allPanels = dropdown.querySelectorAll('.mega-right__panel');
    for (var j = 0; j < allPanels.length; j++) {
      allPanels[j].classList.remove('mega-right__panel--visible');
    }

    // Activate the target
    var targetLeft = dropdown.querySelector('.mega-left__item[data-sub-key="' + subKey + '"]');
    if (targetLeft) targetLeft.classList.add('mega-left__item--active');

    var targetPanel = dropdown.querySelector('.mega-right__panel[data-panel-for="' + subKey + '"]');
    if (targetPanel) targetPanel.classList.add('mega-right__panel--visible');

    _state.activeSub = subKey;
  }

  // ---------------------------------------------------------------------------
  // 9. DESKTOP EVENT BINDING
  // ---------------------------------------------------------------------------

  function bindDesktopEvents() {
    var bar = document.querySelector('.mega-menu-bar');
    if (!bar) return;

    var megaArea = document.querySelector('.mega-menu-wrapper');
    if (!megaArea) megaArea = bar.parentElement;

    // Hover on Level 1 items with subs
    var catItems = bar.querySelectorAll('.mega-menu-item--has-subs');
    for (var i = 0; i < catItems.length; i++) {
      (function (item) {
        item.addEventListener('mouseenter', function () {
          if (isMobile()) return;
          var catKey = item.getAttribute('data-category');
          openDropdown(catKey);
        });
        // Prevent click default on parent link if has subs (allow navigating via sub links)
        item.querySelector('.mega-menu-item__link').addEventListener('click', function (e) {
          if (isMobile()) return;
          if (item.classList.contains('mega-menu-item--has-subs')) {
            e.preventDefault();
            var catKey = item.getAttribute('data-category');
            openDropdown(catKey);
          }
        });
      })(catItems[i]);
    }

    // Mouse leave the whole mega area closes the dropdown
    megaArea.addEventListener('mouseleave', function () {
      if (isMobile()) return;
      closeMegaMenu();
    });

    // Hover on Level 2 items
    document.addEventListener('mouseenter', function (e) {
      if (isMobile()) return;
      var leftItem = e.target.closest('.mega-left__item');
      if (!leftItem) return;
      var dropdown = leftItem.closest('.mega-dropdown');
      if (!dropdown) return;
      var subKey = leftItem.getAttribute('data-sub-key');
      if (subKey) activateSubItem(dropdown, subKey);
    }, true);
  }

  // ---------------------------------------------------------------------------
  // 10. MOBILE EVENT BINDING
  // ---------------------------------------------------------------------------

  function bindMobileEvents() {
    if (!_state.mobileDrawer) return;

    // Close button
    var closeBtn = _state.mobileDrawer.querySelector('.mega-mobile-drawer__close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeMegaMenu);
    }

    // Category accordion toggles
    var catToggles = _state.mobileDrawer.querySelectorAll('.mega-mobile-cat__toggle');
    for (var i = 0; i < catToggles.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var catDiv = btn.closest('.mega-mobile-cat');
          var body = catDiv.querySelector('.mega-mobile-cat__body');
          if (!body) return;

          var isOpen = body.classList.contains('mega-mobile-cat__body--open');

          // Close all other category bodies
          var allBodies = _state.mobileDrawer.querySelectorAll('.mega-mobile-cat__body--open');
          for (var j = 0; j < allBodies.length; j++) {
            allBodies[j].classList.remove('mega-mobile-cat__body--open');
            var otherBtn = allBodies[j].closest('.mega-mobile-cat').querySelector('.mega-mobile-cat__toggle');
            if (otherBtn) otherBtn.textContent = '+';
          }

          if (!isOpen) {
            body.classList.add('mega-mobile-cat__body--open');
            btn.textContent = '\u2212'; // minus sign
          }
        });
      })(catToggles[i]);
    }

    // Sub-category accordion toggles
    var subToggles = _state.mobileDrawer.querySelectorAll('.mega-mobile-sub__toggle');
    for (var k = 0; k < subToggles.length; k++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var subDiv = btn.closest('.mega-mobile-sub');
          var body = subDiv.querySelector('.mega-mobile-sub__body');
          if (!body) return;

          var isOpen = body.classList.contains('mega-mobile-sub__body--open');

          // Close all other sub bodies within the same category
          var parentCat = btn.closest('.mega-mobile-cat__body');
          if (parentCat) {
            var allSubBodies = parentCat.querySelectorAll('.mega-mobile-sub__body--open');
            for (var j = 0; j < allSubBodies.length; j++) {
              allSubBodies[j].classList.remove('mega-mobile-sub__body--open');
              var otherBtn = allSubBodies[j].closest('.mega-mobile-sub').querySelector('.mega-mobile-sub__toggle');
              if (otherBtn) otherBtn.textContent = '+';
            }
          }

          if (!isOpen) {
            body.classList.add('mega-mobile-sub__body--open');
            btn.textContent = '\u2212';
          }
        });
      })(subToggles[k]);
    }
  }

  /**
   * Open the mobile drawer.
   */
  function openMobileDrawer() {
    if (!_state.mobileDrawer) return;
    _state.mobileDrawer.classList.add('mega-mobile-drawer--open');
    if (_state.mobileOverlay) _state.mobileOverlay.classList.add('mega-overlay--visible');
  }

  window.openMobileDrawer = openMobileDrawer;

  // ---------------------------------------------------------------------------
  // 11. GLOBAL EVENTS
  // ---------------------------------------------------------------------------

  function bindGlobalEvents() {
    // Escape key closes everything
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        closeMegaMenu();
      }
    });

    // Overlay click closes
    if (_state.overlay) {
      _state.overlay.addEventListener('click', closeMegaMenu);
    }
    if (_state.mobileOverlay) {
      _state.mobileOverlay.addEventListener('click', closeMegaMenu);
    }

    // Handle resize: close menus on viewport change, reconfigure mode
    window.addEventListener('resize', function () {
      clearTimeout(_state.resizeTimer);
      _state.resizeTimer = setTimeout(function () {
        closeMegaMenu();
      }, 150);
    });

    // Mobile tap on Level 1 items with subs
    var bar = document.querySelector('.mega-menu-bar');
    if (bar) {
      var catItems = bar.querySelectorAll('.mega-menu-item--has-subs .mega-menu-item__link');
      for (var i = 0; i < catItems.length; i++) {
        (function (link) {
          link.addEventListener('click', function (e) {
            if (!isMobile()) return;
            e.preventDefault();
            openMobileDrawer();
          });
        })(catItems[i]);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 12. INIT
  // ---------------------------------------------------------------------------

  /**
   * Initialize the mega-menu: inject styles, build DOM, bind events.
   */
  function initMegaMenu() {
    if (_state.initialized) return;

    injectStyles();

    var bar = document.querySelector('.mega-menu-bar');
    if (!bar) return;

    // Wrap bar for mouse-leave detection
    var wrapper = bar.parentElement;
    if (!wrapper.classList.contains('mega-menu-wrapper')) {
      var newWrapper = document.createElement('div');
      newWrapper.className = 'mega-menu-wrapper';
      newWrapper.style.position = 'relative';
      bar.parentNode.insertBefore(newWrapper, bar);
      newWrapper.appendChild(bar);
      wrapper = newWrapper;
    }

    // Create dropdown container (positioned relative to wrapper)
    var dropdownContainer = document.createElement('div');
    dropdownContainer.className = 'mega-dropdown-container';
    dropdownContainer.style.position = 'relative';
    wrapper.appendChild(dropdownContainer);
    _state.dropdownContainer = dropdownContainer;

    // Build dropdowns for each category with subs
    for (var i = 0; i < MEGA_MENU_DATA.length; i++) {
      var cat = MEGA_MENU_DATA[i];
      if (cat.subs && cat.subs.length > 0) {
        var html = buildDropdownHTML(cat);
        dropdownContainer.insertAdjacentHTML('beforeend', html);
      }
    }

    // Create desktop overlay
    var overlay = document.createElement('div');
    overlay.className = 'mega-overlay';
    document.body.appendChild(overlay);
    _state.overlay = overlay;

    // Create mobile drawer
    var mobileOverlay = document.createElement('div');
    mobileOverlay.className = 'mega-overlay';
    mobileOverlay.style.zIndex = '1099';
    document.body.appendChild(mobileOverlay);
    _state.mobileOverlay = mobileOverlay;

    var drawerDiv = document.createElement('div');
    drawerDiv.innerHTML = buildMobileDrawerHTML();
    _state.mobileDrawer = drawerDiv.firstChild;
    document.body.appendChild(_state.mobileDrawer);

    // Bind events
    bindDesktopEvents();
    bindMobileEvents();
    bindGlobalEvents();

    _state.initialized = true;
  }

  window.initMegaMenu = initMegaMenu;

})();
