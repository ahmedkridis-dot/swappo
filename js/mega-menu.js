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
    {
      key: 'gift_corner', icon: 'fas fa-gift', href: 'giveaway.html', special: true,
      subs: [
        { key: 'gift_see_all', icon: '\u{1F441}', href: 'giveaway.html' },
        { key: 'gift_sets', icon: '\u{1F381}', href: 'giveaway.html?type=gift_sets', items: ['gift_birthday', 'gift_anniversary', 'gift_housewarming', 'gift_thankyou', 'gift_graduation', 'gift_wedding', 'gift_babyshower', 'gift_justbecause'] },
        { key: 'gift_for_kids', icon: '\u{1F9F8}', href: 'giveaway.html?type=for_kids', items: ['gift_toys', 'gift_kids_books', 'gift_kids_clothing', 'gift_creative_kits'] },
        { key: 'gift_for_her', icon: '\u{1F469}', href: 'giveaway.html?type=for_her', items: ['gift_jewelry', 'gift_beauty', 'gift_fashion', 'gift_home_decor'] },
        { key: 'gift_for_him', icon: '\u{1F468}', href: 'giveaway.html?type=for_him', items: ['gift_tech', 'gift_watches', 'gift_grooming', 'gift_outdoor_gear'] },
        { key: 'gift_home', icon: '\u{1F3E0}', href: 'giveaway.html?type=home', items: ['gift_candles', 'gift_kitchen', 'gift_decor', 'gift_plants_pots'] },
        { key: 'gift_handmade', icon: '\u{1F3A8}', href: 'giveaway.html?type=handmade', items: ['gift_art', 'gift_crafts', 'gift_custom'] },
        { key: 'gift_luxury', icon: '\u{1F49D}', href: 'giveaway.html?type=luxury', items: ['gift_designer', 'gift_premium_sets', 'gift_collectibles'] }
      ]
    },
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
    {
      key: 'electronics', icon: 'fas fa-mobile-alt', href: 'catalogue.html?category=electronics',
      subs: [
        { key: 'elec_see_all', icon: '\u{1F441}', href: 'catalogue.html?category=electronics' },
        { key: 'elec_phones', icon: '\u{1F4F1}', href: 'catalogue.html?category=electronics&type=phones', items: ['elec_iphone', 'elec_samsung', 'elec_huawei', 'elec_pixel', 'elec_oneplus', 'elec_xiaomi', 'elec_other_phones', 'elec_phone_cases'] },
        { key: 'elec_laptops', icon: '\u{1F4BB}', href: 'catalogue.html?category=electronics&type=laptops', items: ['elec_macbook', 'elec_windows', 'elec_chromebook', 'elec_tablets', 'elec_ipad'] },
        { key: 'elec_cameras', icon: '\u{1F4F7}', href: 'catalogue.html?category=electronics&type=cameras', items: ['elec_dslr', 'elec_mirrorless', 'elec_action_cam', 'elec_drones', 'elec_lenses'] },
        { key: 'elec_audio', icon: '\u{1F3A7}', href: 'catalogue.html?category=electronics&type=audio', items: ['elec_headphones', 'elec_earbuds', 'elec_speakers', 'elec_soundbars', 'elec_microphones'] },
        { key: 'elec_wearables', icon: '\u231A', href: 'catalogue.html?category=electronics&type=wearables', items: ['elec_apple_watch', 'elec_samsung_watch', 'elec_fitness', 'elec_smart_glasses'] },
        { key: 'elec_tvs', icon: '\u{1F4FA}', href: 'catalogue.html?category=electronics&type=tvs', items: ['elec_led_oled', 'elec_monitors', 'elec_projectors'] },
        { key: 'elec_accessories', icon: '\u{1F50C}', href: 'catalogue.html?category=electronics&type=accessories', items: ['elec_chargers', 'elec_powerbanks', 'elec_adapters', 'elec_storage'] },
        { key: 'elec_smart_home', icon: '\u{1F3E0}', href: 'catalogue.html?category=electronics&type=smart_home', items: ['elec_smart_speakers', 'elec_smart_lights', 'elec_security_cams', 'elec_thermostats'] }
      ]
    },
    {
      key: 'gaming', icon: 'fas fa-gamepad', href: 'catalogue.html?category=gaming',
      subs: [
        { key: 'gaming_see_all', icon: '\u{1F441}', href: 'catalogue.html?category=gaming' },
        { key: 'gaming_consoles', icon: '\u{1F3AE}', href: 'catalogue.html?category=gaming&zone=consoles_hardware', items: ['gm_consoles', 'gm_pc_gaming', 'gm_monitors', 'gm_components', 'gm_controllers', 'gm_headsets', 'gm_keyboards', 'gm_chairs'] },
        { key: 'gaming_games', icon: '\u{1F579}', href: 'catalogue.html?category=gaming&zone=games', items: ['gm_ps5', 'gm_xbox', 'gm_switch', 'gm_pc_games', 'gm_retro'] },
        { key: 'gaming_accessories', icon: '\u{1F3A7}', href: 'catalogue.html?category=gaming&zone=accessories', items: ['gm_mousepads', 'gm_webcams', 'gm_led', 'gm_stands', 'gm_cards', 'gm_figures'] }
      ]
    },
    {
      key: 'furniture', icon: 'fas fa-couch', href: 'catalogue.html?category=furniture',
      subs: [
        { key: 'furn_see_all', icon: '\u{1F441}', href: 'catalogue.html?category=furniture' },
        { key: 'furn_living', icon: '\u{1F6CB}', href: 'catalogue.html?category=furniture&type=living', items: ['furn_sofas', 'furn_coffee_tables', 'furn_tv_stands', 'furn_shelving', 'furn_rugs', 'furn_armchairs', 'furn_bean_bags'] },
        { key: 'furn_bedroom', icon: '\u{1F6CF}', href: 'catalogue.html?category=furniture&type=bedroom', items: ['furn_beds', 'furn_mattresses', 'furn_wardrobes', 'furn_dressers', 'furn_nightstands', 'furn_mirrors'] },
        { key: 'furn_dining', icon: '\u{1F37D}', href: 'catalogue.html?category=furniture&type=dining', items: ['furn_dining_tables', 'furn_chairs', 'furn_bar_stools', 'furn_buffets'] },
        { key: 'furn_office', icon: '\u{1F3E2}', href: 'catalogue.html?category=furniture&type=office', items: ['furn_desks', 'furn_office_chairs', 'furn_bookshelves', 'furn_filing'] },
        { key: 'furn_kids_room', icon: '\u{1F476}', href: 'catalogue.html?category=furniture&type=kids_room', items: ['furn_kids_beds', 'furn_study_desks', 'furn_toy_storage', 'furn_wall_decor'] },
        { key: 'furn_outdoor', icon: '\u{1F3E1}', href: 'catalogue.html?category=furniture&type=outdoor', items: ['furn_patio', 'furn_loungers', 'furn_garden_tables', 'furn_bbq', 'furn_outdoor_cushions'] },
        { key: 'furn_decor', icon: '\u{1F3A8}', href: 'catalogue.html?category=furniture&type=decor', items: ['furn_wall_art', 'furn_vases', 'furn_cushions_throws', 'furn_candles', 'furn_clocks', 'furn_photo_frames'] },
        { key: 'furn_lighting', icon: '\u{1F4A1}', href: 'catalogue.html?category=furniture&type=lighting', items: ['furn_floor_lamps', 'furn_table_lamps', 'furn_ceiling_lights', 'furn_fairy_lights', 'furn_smart_lights'] }
      ]
    },
    {
      key: 'vehicles', icon: 'fas fa-car', href: 'catalogue.html?category=vehicles',
      subs: [
        { key: 'veh_see_all', icon: '\u{1F441}', href: 'catalogue.html?category=vehicles' },
        { key: 'veh_cars', icon: '\u{1F697}', href: 'catalogue.html?category=vehicles&type=cars', items: ['veh_sedan', 'veh_suv', 'veh_hatchback', 'veh_convertible', 'veh_electric', 'veh_luxury', 'veh_sports_car', 'veh_pickup'] },
        { key: 'veh_motorcycles', icon: '\u{1F3CD}', href: 'catalogue.html?category=vehicles&type=motorcycles', items: ['veh_sport_bikes', 'veh_cruisers', 'veh_dirt_bikes', 'veh_motor_scooters', 'veh_electric_moto'] },
        { key: 'veh_bicycles', icon: '\u{1F6B2}', href: 'catalogue.html?category=vehicles&type=bicycles', items: ['veh_road_bikes', 'veh_mountain_bikes', 'veh_city_hybrid', 'veh_kids_bikes', 'veh_ebikes'] },
        { key: 'veh_scooters', icon: '\u{1F6F4}', href: 'catalogue.html?category=vehicles&type=scooters', items: ['veh_electric_scooters', 'veh_kick_scooters', 'veh_hoverboards'] },
        { key: 'veh_boats', icon: '\u{1F6A4}', href: 'catalogue.html?category=vehicles&type=boats', items: ['veh_jet_skis', 'veh_kayaks', 'veh_inflatable', 'veh_sailing'] },
        { key: 'veh_parts', icon: '\u{1F527}', href: 'catalogue.html?category=vehicles&type=parts', items: ['veh_tires', 'veh_engines', 'veh_body_parts', 'veh_interiors', 'veh_batteries'] },
        { key: 'veh_accessories', icon: '\u{1F3CE}', href: 'catalogue.html?category=vehicles&type=accessories', items: ['veh_gps_dashcams', 'veh_car_seats', 'veh_roof_racks', 'veh_cleaning_kits', 'veh_car_audio'] }
      ]
    },
    {
      key: 'sports', icon: 'fas fa-futbol', href: 'catalogue.html?category=sports',
      subs: [
        { key: 'sport_see_all', icon: '\u{1F441}', href: 'catalogue.html?category=sports' },
        { key: 'sport_gym', icon: '\u{1F3CB}', href: 'catalogue.html?category=sports&type=gym', items: ['sport_running_shoes', 'sport_weights', 'sport_resistance', 'sport_yoga_mats', 'sport_gym_machines', 'sport_jump_ropes', 'sport_boxing', 'sport_foam_rollers'] },
        { key: 'sport_team', icon: '\u26BD', href: 'catalogue.html?category=sports&type=team', items: ['sport_football', 'sport_basketball', 'sport_cricket', 'sport_rugby', 'sport_volleyball', 'sport_baseball'] },
        { key: 'sport_racket', icon: '\u{1F3BE}', href: 'catalogue.html?category=sports&type=racket', items: ['sport_tennis', 'sport_badminton', 'sport_padel', 'sport_table_tennis', 'sport_squash'] },
        { key: 'sport_water', icon: '\u{1F3CA}', href: 'catalogue.html?category=sports&type=water', items: ['sport_surfboards', 'sport_paddleboards', 'sport_snorkeling', 'sport_diving', 'sport_wetsuits', 'sport_swimwear'] },
        { key: 'sport_cycling', icon: '\u{1F6B4}', href: 'catalogue.html?category=sports&type=cycling', items: ['sport_road_bikes', 'sport_mtb', 'sport_helmets', 'sport_cycling_gear', 'sport_bike_accessories'] },
        { key: 'sport_outdoor', icon: '\u26FA', href: 'catalogue.html?category=sports&type=outdoor', items: ['sport_tents', 'sport_sleeping_bags', 'sport_backpacks', 'sport_hiking_boots', 'sport_camping_stoves', 'sport_fishing'] },
        { key: 'sport_golf', icon: '\u{1F3CC}', href: 'catalogue.html?category=sports&type=golf', items: ['sport_golf_clubs', 'sport_golf_bags', 'sport_golf_shoes', 'sport_balls_tees', 'sport_golf_acc'] },
        { key: 'sport_wear', icon: '\u{1F45F}', href: 'catalogue.html?category=sports&type=wear', items: ['sport_men_wear', 'sport_women_wear', 'sport_kids_wear', 'sport_compression'] }
      ]
    },
    {
      key: 'books', icon: 'fas fa-book', href: 'catalogue.html?category=books',
      subs: [
        { key: 'books_see_all', icon: '\u{1F441}', href: 'catalogue.html?category=books' },
        { key: 'books_books', icon: '\u{1F4DA}', href: 'catalogue.html?category=books&type=books', items: ['books_fiction', 'books_nonfiction', 'books_children', 'books_comics', 'books_arabic', 'books_selfhelp', 'books_cooking', 'books_religion', 'books_science', 'books_business'] },
        { key: 'books_textbooks', icon: '\u{1F4D6}', href: 'catalogue.html?category=books&type=textbooks', items: ['books_school', 'books_university', 'books_language', 'books_test_prep', 'books_certifications'] },
        { key: 'books_music', icon: '\u{1F3B5}', href: 'catalogue.html?category=books&type=music', items: ['books_vinyl', 'books_cds', 'books_instruments', 'books_sheet_music'] },
        { key: 'books_movies', icon: '\u{1F3AC}', href: 'catalogue.html?category=books&type=movies', items: ['books_dvd_bluray', 'books_box_sets', 'books_documentaries'] },
        { key: 'books_videogames', icon: '\u{1F3AE}', href: 'catalogue.html?category=books&type=videogames', items: ['books_ps5', 'books_xbox', 'books_nintendo', 'books_pc_games', 'books_retro'] },
        { key: 'books_magazines', icon: '\u{1F4F0}', href: 'catalogue.html?category=books&type=magazines', items: ['books_mag_fashion', 'books_mag_tech', 'books_mag_lifestyle', 'books_mag_arabic'] },
        { key: 'books_art_supplies', icon: '\u{1F3A8}', href: 'catalogue.html?category=books&type=art', items: ['books_paints', 'books_sketchbooks', 'books_craft_kits', 'books_calligraphy'] }
      ]
    },
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
    // Gift Corner
    gift_see_all: 'See All Gifts',
    gift_sets: 'Gift Sets',
    gift_for_kids: 'For Kids',
    gift_for_her: 'For Her',
    gift_for_him: 'For Him',
    gift_home: 'Home Gifts',
    gift_handmade: 'Handmade',
    gift_luxury: 'Luxury Gifts',
    gift_birthday: 'Birthday',
    gift_anniversary: 'Anniversary',
    gift_housewarming: 'Housewarming',
    gift_thankyou: 'Thank You',
    gift_graduation: 'Graduation',
    gift_wedding: 'Wedding',
    gift_babyshower: 'Baby Shower',
    gift_justbecause: 'Just Because',
    gift_toys: 'Toys',
    gift_kids_books: 'Books',
    gift_kids_clothing: 'Clothing',
    gift_creative_kits: 'Creative Kits',
    gift_jewelry: 'Jewelry',
    gift_beauty: 'Beauty',
    gift_fashion: 'Fashion',
    gift_home_decor: 'Home Décor',
    gift_tech: 'Tech',
    gift_watches: 'Watches',
    gift_grooming: 'Grooming',
    gift_outdoor_gear: 'Outdoor Gear',
    gift_candles: 'Candles & Diffusers',
    gift_kitchen: 'Kitchen',
    gift_decor: 'Décor',
    gift_plants_pots: 'Plants & Pots',
    gift_art: 'Art',
    gift_crafts: 'Crafts',
    gift_custom: 'Custom Items',
    gift_designer: 'Designer Items',
    gift_premium_sets: 'Premium Sets',
    gift_collectibles: 'Collectibles',

    // Electronics
    electronics: 'Electronics',
    elec_see_all: 'See All Electronics',
    elec_phones: 'Phones',
    elec_laptops: 'Laptops',
    elec_cameras: 'Cameras',
    elec_audio: 'Audio',
    elec_wearables: 'Wearables',
    elec_tvs: 'TVs & Screens',
    elec_accessories: 'Accessories',
    elec_smart_home: 'Smart Home',
    elec_iphone: 'iPhone',
    elec_samsung: 'Samsung',
    elec_huawei: 'Huawei',
    elec_pixel: 'Google Pixel',
    elec_oneplus: 'OnePlus',
    elec_xiaomi: 'Xiaomi',
    elec_other_phones: 'Other Phones',
    elec_phone_cases: 'Phone Cases',
    elec_macbook: 'MacBook',
    elec_windows: 'Windows Laptops',
    elec_chromebook: 'Chromebook',
    elec_tablets: 'Tablets',
    elec_ipad: 'iPad',
    elec_dslr: 'DSLR',
    elec_mirrorless: 'Mirrorless',
    elec_action_cam: 'Action Cameras',
    elec_drones: 'Drones',
    elec_lenses: 'Lenses',
    elec_headphones: 'Headphones',
    elec_earbuds: 'Earbuds',
    elec_speakers: 'Speakers',
    elec_soundbars: 'Soundbars',
    elec_microphones: 'Microphones',
    elec_apple_watch: 'Apple Watch',
    elec_samsung_watch: 'Samsung Watch',
    elec_fitness: 'Fitness Trackers',
    elec_smart_glasses: 'Smart Glasses',
    elec_led_oled: 'LED/OLED TV',
    elec_monitors: 'Monitors',
    elec_projectors: 'Projectors',
    elec_chargers: 'Chargers & Cables',
    elec_powerbanks: 'Power Banks',
    elec_adapters: 'Adapters',
    elec_storage: 'Storage (USB/SD)',
    elec_smart_speakers: 'Smart Speakers',
    elec_smart_lights: 'Smart Lights',
    elec_security_cams: 'Security Cameras',
    elec_thermostats: 'Thermostats',

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
    // Furniture
    furniture: 'Furniture',
    furn_see_all: 'See All Furniture',
    furn_living: 'Living Room',
    furn_bedroom: 'Bedroom',
    furn_dining: 'Dining',
    furn_office: 'Office',
    furn_kids_room: 'Kids Room',
    furn_outdoor: 'Outdoor',
    furn_decor: 'Décor',
    furn_lighting: 'Lighting',
    furn_sofas: 'Sofas',
    furn_coffee_tables: 'Coffee Tables',
    furn_tv_stands: 'TV Stands',
    furn_shelving: 'Shelving',
    furn_rugs: 'Rugs',
    furn_armchairs: 'Armchairs',
    furn_bean_bags: 'Bean Bags',
    furn_beds: 'Beds & Frames',
    furn_mattresses: 'Mattresses',
    furn_wardrobes: 'Wardrobes',
    furn_dressers: 'Dressers',
    furn_nightstands: 'Nightstands',
    furn_mirrors: 'Mirrors',
    furn_dining_tables: 'Dining Tables',
    furn_chairs: 'Chairs',
    furn_bar_stools: 'Bar Stools',
    furn_buffets: 'Buffets & Sideboards',
    furn_desks: 'Desks',
    furn_office_chairs: 'Office Chairs',
    furn_bookshelves: 'Bookshelves',
    furn_filing: 'Filing Cabinets',
    furn_kids_beds: 'Kids Beds',
    furn_study_desks: 'Study Desks',
    furn_toy_storage: 'Toy Storage',
    furn_wall_decor: 'Wall Décor',
    furn_patio: 'Patio Sets',
    furn_loungers: 'Sun Loungers',
    furn_garden_tables: 'Garden Tables',
    furn_bbq: 'BBQ & Grills',
    furn_outdoor_cushions: 'Outdoor Cushions',
    furn_wall_art: 'Wall Art',
    furn_vases: 'Vases',
    furn_cushions_throws: 'Cushions & Throws',
    furn_candles: 'Candles',
    furn_clocks: 'Clocks',
    furn_photo_frames: 'Photo Frames',
    furn_floor_lamps: 'Floor Lamps',
    furn_table_lamps: 'Table Lamps',
    furn_ceiling_lights: 'Ceiling Lights',
    furn_fairy_lights: 'Fairy Lights',
    furn_smart_lights: 'Smart Lights',

    // Vehicles
    vehicles: 'Vehicles',
    veh_see_all: 'See All Vehicles',
    veh_cars: 'Cars',
    veh_motorcycles: 'Motorcycles',
    veh_bicycles: 'Bicycles',
    veh_scooters: 'Scooters',
    veh_boats: 'Boats',
    veh_parts: 'Parts',
    veh_accessories: 'Accessories',
    veh_sedan: 'Sedan',
    veh_suv: 'SUV',
    veh_hatchback: 'Hatchback',
    veh_convertible: 'Convertible',
    veh_electric: 'Electric/Hybrid',
    veh_luxury: 'Luxury',
    veh_sports_car: 'Sports Car',
    veh_pickup: 'Pickup/Truck',
    veh_sport_bikes: 'Sport Bikes',
    veh_cruisers: 'Cruisers',
    veh_dirt_bikes: 'Dirt Bikes',
    veh_motor_scooters: 'Motorized Scooters',
    veh_electric_moto: 'Electric Motorcycles',
    veh_road_bikes: 'Road Bikes',
    veh_mountain_bikes: 'Mountain Bikes',
    veh_city_hybrid: 'City/Hybrid',
    veh_kids_bikes: 'Kids Bikes',
    veh_ebikes: 'Electric Bikes',
    veh_electric_scooters: 'Electric Scooters',
    veh_kick_scooters: 'Kick Scooters',
    veh_hoverboards: 'Hoverboards',
    veh_jet_skis: 'Jet Skis',
    veh_kayaks: 'Kayaks',
    veh_inflatable: 'Inflatable Boats',
    veh_sailing: 'Sailing',
    veh_tires: 'Tires & Wheels',
    veh_engines: 'Engines',
    veh_body_parts: 'Body Parts',
    veh_interiors: 'Interiors',
    veh_batteries: 'Batteries',
    veh_gps_dashcams: 'GPS & Dashcams',
    veh_car_seats: 'Car Seats',
    veh_roof_racks: 'Roof Racks',
    veh_cleaning_kits: 'Cleaning Kits',
    veh_car_audio: 'Car Audio',

    // Sports
    sports: 'Sports',
    sport_see_all: 'See All Sports',
    sport_gym: 'Gym & Fitness',
    sport_team: 'Team Sports',
    sport_racket: 'Racket Sports',
    sport_water: 'Water Sports',
    sport_cycling: 'Cycling',
    sport_outdoor: 'Outdoor & Camping',
    sport_golf: 'Golf',
    sport_wear: 'Sportswear',
    sport_running_shoes: 'Running Shoes',
    sport_weights: 'Weights & Dumbbells',
    sport_resistance: 'Resistance Bands',
    sport_yoga_mats: 'Yoga Mats',
    sport_gym_machines: 'Gym Machines',
    sport_jump_ropes: 'Jump Ropes',
    sport_boxing: 'Boxing Gloves',
    sport_foam_rollers: 'Foam Rollers',
    sport_football: 'Football/Soccer',
    sport_basketball: 'Basketball',
    sport_cricket: 'Cricket',
    sport_rugby: 'Rugby',
    sport_volleyball: 'Volleyball',
    sport_baseball: 'Baseball',
    sport_tennis: 'Tennis',
    sport_badminton: 'Badminton',
    sport_padel: 'Padel',
    sport_table_tennis: 'Table Tennis',
    sport_squash: 'Squash',
    sport_surfboards: 'Surfboards',
    sport_paddleboards: 'Paddleboards',
    sport_snorkeling: 'Snorkeling',
    sport_diving: 'Diving Gear',
    sport_wetsuits: 'Wetsuits',
    sport_swimwear: 'Swimwear',
    sport_road_bikes: 'Road Bikes',
    sport_mtb: 'Mountain Bikes',
    sport_helmets: 'Helmets',
    sport_cycling_gear: 'Cycling Gear',
    sport_bike_accessories: 'Bike Accessories',
    sport_tents: 'Tents',
    sport_sleeping_bags: 'Sleeping Bags',
    sport_backpacks: 'Backpacks',
    sport_hiking_boots: 'Hiking Boots',
    sport_camping_stoves: 'Camping Stoves',
    sport_fishing: 'Fishing Gear',
    sport_golf_clubs: 'Golf Clubs',
    sport_golf_bags: 'Golf Bags',
    sport_golf_shoes: 'Golf Shoes',
    sport_balls_tees: 'Balls & Tees',
    sport_golf_acc: 'Golf Accessories',
    sport_men_wear: "Men's Sportswear",
    sport_women_wear: "Women's Sportswear",
    sport_kids_wear: 'Kids Sportswear',
    sport_compression: 'Compression Wear',

    // Books & Media
    books: 'Books',
    books_see_all: 'See All Books & Media',
    books_books: 'Books',
    books_textbooks: 'Textbooks',
    books_music: 'Music',
    books_movies: 'Movies & TV',
    books_videogames: 'Video Games',
    books_magazines: 'Magazines',
    books_art_supplies: 'Art Supplies',
    books_fiction: 'Fiction',
    books_nonfiction: 'Non-Fiction',
    books_children: "Children's Books",
    books_comics: 'Comics & Manga',
    books_arabic: 'Arabic Books',
    books_selfhelp: 'Self-Help',
    books_cooking: 'Cooking',
    books_religion: 'Religion & Spirituality',
    books_science: 'Science & Technology',
    books_business: 'Business',
    books_school: 'School (K-12)',
    books_university: 'University',
    books_language: 'Language Learning',
    books_test_prep: 'Test Prep (IELTS/TOEFL)',
    books_certifications: 'Professional Certifications',
    books_vinyl: 'Vinyl Records',
    books_cds: 'CDs',
    books_instruments: 'Instruments',
    books_sheet_music: 'Sheet Music',
    books_dvd_bluray: 'DVDs & Blu-ray',
    books_box_sets: 'Box Sets',
    books_documentaries: 'Documentaries',
    books_ps5: 'PS5/PS4 Games',
    books_xbox: 'Xbox Games',
    books_nintendo: 'Nintendo Games',
    books_pc_games: 'PC Games',
    books_retro: 'Retro Games',
    books_mag_fashion: 'Fashion',
    books_mag_tech: 'Tech',
    books_mag_lifestyle: 'Lifestyle',
    books_mag_arabic: 'Arabic Magazines',
    books_paints: 'Paints & Brushes',
    books_sketchbooks: 'Sketchbooks',
    books_craft_kits: 'Craft Kits',
    books_calligraphy: 'Calligraphy',

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
    css += '.mega-menu-bar__inner{display:flex;align-items:center;justify-content:center;max-width:1200px;margin:0 auto;padding:0 8px;gap:0;}';
    css += '.mega-menu-item{position:relative;flex-shrink:0;}';
    css += '.mega-menu-item__link{display:flex;align-items:center;gap:6px;padding:10px 14px;font-size:13px;color:#333;text-decoration:none;white-space:nowrap;transition:background 150ms,color 150ms;}';
    css += '.mega-menu-item__link:hover,.mega-menu-item--active .mega-menu-item__link{background:#f5f5f5;color:#09B1BA;}';
    css += '.mega-menu-item--special .mega-menu-item__link{color:#fff;font-weight:700;background:linear-gradient(135deg,#FF6B6B,#FF8C00);border-radius:999px;padding:8px 18px;margin:4px 6px;font-size:12px;letter-spacing:0.02em;box-shadow:0 2px 10px rgba(255,107,107,0.3);animation:giftPulse 3s ease-in-out infinite;}';
    css += '.mega-menu-item--special .mega-menu-item__link:hover{transform:scale(1.06);box-shadow:0 4px 16px rgba(255,107,107,0.45);}';
    css += '.mega-menu-item--special .mega-menu-caret{color:rgba(255,255,255,0.7);}';
    css += '@keyframes giftPulse{0%,100%{box-shadow:0 2px 10px rgba(255,107,107,0.3);}50%{box-shadow:0 4px 20px rgba(255,107,107,0.5);}}';
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
