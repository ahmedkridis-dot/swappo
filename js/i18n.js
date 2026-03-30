/**
 * SWAPPO i18n System
 * Lightweight internationalization for English, French, Arabic, and Urdu
 * Supports RTL languages with automatic direction detection
 *
 * Usage:
 * - HTML: <span data-i18n="search_placeholder"></span>
 * - HTML: <input type="text" data-i18n-placeholder="search_placeholder">
 * - JS: t('search_placeholder')
 * - Language switch: setLanguage('ar')
 */

// ========================================
// TRANSLATIONS OBJECT
// ========================================

const translations = {
  en: {
    // Navbar
    search_placeholder: "Search items...",
    join_swap: "Join the Swap",
    drop_item: "Drop an Item",

    // Categories
    all: "All",
    clothing: "Clothing",
    electronics: "Electronics",
    furniture: "Furniture",
    vehicles: "Vehicles",
    sports: "Sports & Leisure",
    books: "Books & Media",
    kids: "Kids & Baby",
    plants: "Plants",
    gift_corner: "Gift Corner",

    // Clothing subcategories
    clothing_gender_filter: "Filter by",
    clothing_men: "Men",
    clothing_women: "Women",
    clothing_children: "Children",
    clothing_unisex: "Unisex",
    subcat_shirts: "Shirts",
    subcat_tshirts: "T-shirts",
    subcat_trousers: "Trousers",
    subcat_jeans: "Jeans",
    subcat_shorts: "Shorts",
    subcat_suits: "Suits & Blazers",
    subcat_jackets: "Jackets & Coats",
    subcat_sweaters: "Sweaters & Hoodies",
    subcat_underwear: "Underwear",
    subcat_men_shoes: "Men Shoes",
    subcat_traditional: "Traditional (Kandora/Thobe)",
    subcat_dresses: "Dresses",
    subcat_tops: "Tops & Blouses",
    subcat_trousers_jeans: "Trousers & Jeans",
    subcat_skirts: "Skirts",
    subcat_abayas: "Abayas & Modest Wear",
    subcat_lingerie: "Lingerie",
    subcat_women_shoes: "Women Shoes",
    subcat_swimwear: "Swimwear",
    subcat_sportswear: "Sportswear",
    subcat_pyjamas: "Pyjamas",
    subcat_clothing_acc: "Clothing Accessories",

    // Bags & Accessories
    bags_accessories: "Bags & Accessories",
    zone_bags: "Bags",
    zone_accessories: "Accessories",
    subcat_handbags: "Handbags",
    subcat_backpacks: "Backpacks",
    subcat_luggage: "Luggage & Travel",
    subcat_sports_bags: "Sports Bags",
    subcat_clutches: "Clutches & Pouches",
    subcat_business_bags: "Business/Laptop Bags",
    subcat_tote: "Tote Bags",
    subcat_watches: "Watches",
    subcat_sunglasses: "Sunglasses",
    subcat_jewellery: "Jewellery",
    subcat_belts: "Belts",
    subcat_wallets: "Wallets",
    subcat_scarves: "Scarves & Shawls",
    subcat_hats: "Hats & Caps",
    material: "Material",
    material_leather: "Leather",
    material_fabric: "Fabric",
    material_synthetic: "Synthetic",
    material_other: "Other",

    // Kids & Baby subcategories
    kids_girl: "Girl",
    kids_boy: "Boy",
    kids_unisex: "Unisex",
    subcat_baby_clothing: "Clothing",
    subcat_toys: "Toys & Games",
    subcat_strollers: "Strollers & Car Seats",
    subcat_baby_furniture: "Baby Furniture",
    subcat_feeding: "Feeding & Bottles",
    subcat_kids_books: "Kids Books",
    age_range: "Age Range",

    // Gaming & Consoles
    gaming: "Gaming & Consoles",
    zone_consoles: "Consoles & Hardware",
    zone_games: "Games",
    zone_gaming_acc: "Gaming Accessories",
    platform_filter: "Platform",

    // Homepage
    hero_title: "Someone needs what you have.\nSwap it.",
    hero_subtitle: "The UAE's first barter platform. Trade items with your community. Start free.",
    how_it_works: "How it works",
    step1_title: "List your item",
    step1_desc: "Upload photos and details about what you want to swap.",
    step2_title: "Browse & propose",
    step2_desc: "Find items you like and propose a swap.",
    step3_title: "Chat & agree",
    step3_desc: "Discuss details in-app. No phone numbers or emails needed.",
    step4_title: "Exchange & rate",
    step4_desc: "Both accept? Identities revealed! Meet up and swap.",
    popular_now: "Popular right now",
    see_all: "See all →",
    give_away_title: "Give away, help the community",
    give_away_desc: "Donate items you don't need. Claims are included in your subscription.",
    browse_categories: "Browse categories",
    discover_swappo: "Discover Swappo",
    video_banner_title: "Your closet is someone's treasure",
    video_banner_desc: "Join thousands of swappers across the UAE. No cash, no waste — just smart exchanges.",
    start_swapping: "Start Swapping",
    explore_items: "Explore Items",
    active_swappers: "Active Swappers",
    items_listed: "Items Listed",
    swaps_completed: "Swaps Done",
    ready_to_swap: "Ready to swap?",
    create_account: "Create my account — It's free",
    items: "items",

    // Login & Auth
    sign_up: "Sign Up",
    log_in: "Log In",
    full_name: "Full name",
    email: "Email",
    password: "Password",
    confirm_password: "Confirm password",
    agree_terms: "I agree to the Terms & Conditions",
    already_account: "Already have an account?",
    no_account: "Don't have an account?",
    or_continue: "or continue with",
    forgot_password: "Forgot password?",
    phone_number: "Phone number",
    gender_label: "Gender",
    gender_male: "Male",
    gender_female: "Female",
    gender_other: "Prefer not to say",
    pseudo_label: "Username",
    pseudo_placeholder: "3-20 chars, letters/numbers/underscores",
    pseudo_taken: "This username is already taken",
    pseudo_available: "Username available!",
    choose_avatar: "Choose your avatar",
    avatar_required: "Please select an avatar",

    // Verification
    phone_verification: "Phone Verification",
    phone_label: "Phone Number (+971)",
    send_code: "Send Code",
    enter_code: "Enter verification code",
    verify_code: "Verify",
    resend_code: "Resend code",
    phone_already_used: "This number is already associated with an account",
    email_verification: "Email Verification",
    email_sent: "Verification email sent! Check your inbox.",
    account_not_verified: "Please verify your email to continue",

    // Catalogue page
    swap_market: "Swap Market",
    items_near_you: "items near you",
    filter_by: "Filter by",
    condition: "Condition",
    new_item: "New",
    like_new: "Like new",
    good: "Good",
    fair: "Fair",
    sort_by: "Sort by",
    recently_added: "Recently added",
    most_popular: "Most popular",
    nearest_first: "Nearest first",
    clear_filters: "Clear all filters",

    // Product page
    propose_swap: "Propose a Swap",
    offer_multiple: "Offer multiple items",
    save: "Save",
    report: "Report",
    anonymous_user: "Anonymous User",
    anonymous_swapper: "Anonymous Swapper",
    identity_revealed: "Identity revealed after both accept",
    people_interested: "people interested",
    posted: "Posted",
    days_ago: "days ago",
    you_might_like: "You might also like",
    choose_item: "Choose an item to offer",
    send_proposal: "Send swap proposal",

    // Profile page
    my_swaps: "My Swaps",
    my_items: "My Items",
    swap_history: "Swap History",
    saved_items: "Saved Items",
    settings: "Settings",
    edit_profile: "Edit Profile",
    swaps_completed: "Swaps completed",
    items_donated: "Items donated",
    buy_more: "Buy more",
    notifications: "Notifications",
    language: "Language",
    premium: "Premium",
    my_profile: "My Profile",
    logout: "Logout",

    // Chat page
    swapchat: "SwapChat",
    type_message: "Type a message...",
    swap_accepted: "Swap accepted — Identities revealed",
    confirm_exchange: "Confirm exchange",
    auto_filter_warning: "Phone numbers, emails & links are automatically filtered",

    // Giveaway page
    gift_corner_title: "Gift Corner",
    donate_item: "Donate an item",
    browse_gifts: "Browse gifts",
    claims_remaining: "claims remaining",
    giveaway_pass: "Giveaway Pass",
    get_pass: "Get the Pass",
    monthly_pass: "15 AED/month",

    // Footer
    platform: "Platform",
    company: "Company",
    legal: "Legal",
    terms: "Terms of use",
    privacy: "Privacy policy",
    about: "About",
    contact: "Contact",

    // Common
    km: "km",
    all_uae: "All UAE",
    detecting_location: "Detecting location...",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    cancel: "Cancel",
    confirm: "Confirm",
    yes: "Yes",
    no: "No",

    // Subscription & Pricing
    plan_free: "Free",
    plan_bronze: "Bronze",
    plan_silver: "Silver",
    plan_premium: "Premium",
    swaps_remaining: "swaps remaining",
    upgrade_plan: "Upgrade Plan",
    choose_plan: "Choose your plan",
    plan_subtitle: "Start swapping for free. Upgrade anytime.",
    per_month: "/month",
    swaps_per_month: "swaps/month",
    unlimited: "Unlimited",
    giveaway_claims: "giveaway claims/month",
    boosts_per_month: "boosts/month",
    no_ads: "No ads",
    reduced_ads: "Reduced ads",
    get_started: "Get Started Free",
    subscribe: "Subscribe",
    go_premium: "Go Premium",
    best_value: "Best Value",
    current_plan: "Current Plan",
    quota_reached: "You've reached your monthly swap limit",
    upgrade_to_swap: "Upgrade to swap more this month",
    my_subscription: "My Subscription",
    renewal_date: "Next renewal",

    // Pricing page
    pricing_heading: "Choose your plan",
    pricing_subtitle: "Start swapping for free. Upgrade anytime.",
    plan_free_price: "Free",
    plan_free_subtitle: "No credit card needed",
    plan_bronze_subtitle: "For casual swappers",
    plan_silver_subtitle: "For regular swappers",
    plan_premium_subtitle: "For power swappers",
    badge_newcomer: "Newcomer",
    badge_bronze: "Bronze",
    badge_silver: "Silver",
    badge_premium: "Premium",
    badge_best_value: "Best Value",
    feat_swaps_2: "2 swaps / month",
    feat_swaps_4: "4 swaps / month",
    feat_swaps_6: "6 swaps / month",
    feat_swaps_unlimited: "Unlimited swaps",
    feat_giveaway_1: "1 giveaway claim / month",
    feat_giveaway_2: "2 giveaway claims / month",
    feat_giveaway_3: "3 giveaway claims / month",
    feat_giveaway_5: "5 giveaway claims / month",
    feat_no_boosts: "No boosts",
    feat_boost_1: "1 boost / month",
    feat_boost_2: "2 boosts / month",
    feat_boost_4: "4 boosts / month",
    feat_ads_yes: "Ads displayed",
    feat_ads_reduced: "Reduced ads",
    feat_ads_reduced2: "Reduced ads",
    feat_no_ads: "No ads",
    cta_free: "Get Started Free",
    cta_subscribe: "Subscribe",
    cta_premium: "Go Premium",
    faq_heading: "Frequently Asked Questions",
    faq_q_cancel: "Can I cancel anytime?",
    faq_a_cancel: "Yes, cancel anytime. No commitment.",
    faq_q_downgrade: "What happens if I downgrade?",
    faq_a_downgrade: "Active swaps stay open. New quota applies next cycle.",
    faq_q_reset: "When does my quota reset?",
    faq_a_reset: "Monthly, on your signup anniversary date.",
    faq_q_identity: "Is my identity protected?",
    faq_a_identity: "Yes, identity is only revealed when both parties accept a swap.",
    cta_ready: "Ready to start swapping?",
    cta_ready_sub: "Join thousands of swappers across the UAE.",
    cta_join_free: "Join for Free",
  },

  fr: {
    // Navbar
    search_placeholder: "Rechercher des articles...",
    join_swap: "Rejoindre l'Échange",
    drop_item: "Déposer un article",

    // Categories
    all: "Tous",
    clothing: "Vêtements",
    electronics: "Électronique",
    furniture: "Meubles",
    vehicles: "Véhicules",
    sports: "Sports & Loisirs",
    books: "Livres & Médias",
    kids: "Enfants & Bébé",
    plants: "Plantes",
    gift_corner: "Coin Cadeaux",

    // Clothing subcategories
    clothing_gender_filter: "Filtrer par",
    clothing_men: "Homme",
    clothing_women: "Femme",
    clothing_children: "Enfant",
    clothing_unisex: "Unisexe",
    subcat_shirts: "Chemises",
    subcat_tshirts: "T-shirts",
    subcat_trousers: "Pantalons",
    subcat_jeans: "Jeans",
    subcat_shorts: "Shorts",
    subcat_suits: "Costumes & Blazers",
    subcat_jackets: "Vestes & Manteaux",
    subcat_sweaters: "Pulls & Sweats",
    subcat_underwear: "Sous-vêtements",
    subcat_men_shoes: "Chaussures Homme",
    subcat_traditional: "Tenue traditionnelle (Kandora/Thobe)",
    subcat_dresses: "Robes",
    subcat_tops: "Tops & Blouses",
    subcat_trousers_jeans: "Pantalons & Jeans",
    subcat_skirts: "Jupes",
    subcat_abayas: "Abayas & Modest Wear",
    subcat_lingerie: "Lingerie",
    subcat_women_shoes: "Chaussures Femme",
    subcat_swimwear: "Maillots de bain",
    subcat_sportswear: "Sportswear",
    subcat_pyjamas: "Pyjamas",
    subcat_clothing_acc: "Accessoires vestimentaires",

    // Bags & Accessories
    bags_accessories: "Sacs & Accessoires",
    zone_bags: "Sacs",
    zone_accessories: "Accessoires",
    subcat_handbags: "Sacs à main",
    subcat_backpacks: "Sacs à dos",
    subcat_luggage: "Valises & Bagages",
    subcat_sports_bags: "Sacs de sport",
    subcat_clutches: "Pochettes & Clutch",
    subcat_business_bags: "Sacs business/laptop",
    subcat_tote: "Tote bags",
    subcat_watches: "Montres",
    subcat_sunglasses: "Lunettes de soleil",
    subcat_jewellery: "Bijoux",
    subcat_belts: "Ceintures",
    subcat_wallets: "Portefeuilles",
    subcat_scarves: "Écharpes & Foulards",
    subcat_hats: "Chapeaux & Casquettes",
    material: "Matière",
    material_leather: "Cuir",
    material_fabric: "Tissu",
    material_synthetic: "Synthétique",
    material_other: "Autre",

    // Kids & Baby subcategories
    kids_girl: "Fille",
    kids_boy: "Garçon",
    kids_unisex: "Unisexe",
    subcat_baby_clothing: "Vêtements",
    subcat_toys: "Jouets & Jeux",
    subcat_strollers: "Poussettes & Sièges auto",
    subcat_baby_furniture: "Mobilier bébé",
    subcat_feeding: "Alimentation & Biberons",
    subcat_kids_books: "Livres enfants",
    age_range: "Tranche d'âge",

    // Gaming & Consoles
    gaming: "Gaming & Consoles",
    zone_consoles: "Consoles & Matériel",
    zone_games: "Jeux",
    zone_gaming_acc: "Accessoires Gaming",
    platform_filter: "Plateforme",

    // Homepage
    hero_title: "Quelqu'un a besoin de ce que vous avez.\nÉchangez-le.",
    hero_subtitle: "La première plateforme de troc aux EAU. Échangez avec votre communauté. Commencez gratuitement.",
    how_it_works: "Comment ça marche",
    step1_title: "Listez votre article",
    step1_desc: "Téléchargez des photos et les détails de ce que vous voulez échanger.",
    step2_title: "Parcourez et proposez",
    step2_desc: "Trouvez des articles qui vous plaisent et proposez un échange.",
    step3_title: "Discutez et acceptez",
    step3_desc: "Discutez des détails dans l'application. Pas besoin de numéros ou d'e-mails.",
    step4_title: "Échangez et notez",
    step4_desc: "Les deux acceptent? Identités révélées! Rendez-vous et échangez.",
    popular_now: "Populaire en ce moment",
    see_all: "Voir tous →",
    give_away_title: "Donnez, aidez la communauté",
    give_away_desc: "Donnez des articles dont vous n'avez plus besoin. Les réclamations sont incluses dans votre abonnement.",
    browse_categories: "Parcourir les catégories",
    discover_swappo: "Découvrir Swappo",
    video_banner_title: "Votre placard est le trésor de quelqu'un",
    video_banner_desc: "Rejoignez des milliers d'échangeurs aux EAU. Pas d'argent, pas de gaspillage — juste des échanges intelligents.",
    start_swapping: "Commencer à échanger",
    explore_items: "Explorer les articles",
    active_swappers: "Échangeurs actifs",
    items_listed: "Articles listés",
    swaps_completed: "Échanges réalisés",
    ready_to_swap: "Prêt à échanger?",
    create_account: "Créer mon compte — C'est gratuit",
    items: "articles",

    // Login & Auth
    sign_up: "S'inscrire",
    log_in: "Se connecter",
    full_name: "Nom complet",
    email: "E-mail",
    password: "Mot de passe",
    confirm_password: "Confirmer le mot de passe",
    agree_terms: "J'accepte les Conditions d'utilisation",
    already_account: "Vous avez déjà un compte?",
    no_account: "Vous n'avez pas de compte?",
    or_continue: "ou continuer avec",
    forgot_password: "Mot de passe oublié?",
    phone_number: "Numéro de téléphone",
    gender_label: "Genre",
    gender_male: "Homme",
    gender_female: "Femme",
    gender_other: "Préfère ne pas dire",
    pseudo_label: "Pseudo",
    pseudo_placeholder: "3-20 car., lettres/chiffres/underscores",
    pseudo_taken: "Ce pseudo est déjà pris",
    pseudo_available: "Pseudo disponible !",
    choose_avatar: "Choisissez votre avatar",
    avatar_required: "Veuillez sélectionner un avatar",

    // Verification
    phone_verification: "Vérification téléphone",
    phone_label: "Numéro de téléphone (+971)",
    send_code: "Envoyer le code",
    enter_code: "Entrez le code de vérification",
    verify_code: "Vérifier",
    resend_code: "Renvoyer le code",
    phone_already_used: "Ce numéro est déjà associé à un compte",
    email_verification: "Vérification email",
    email_sent: "Email de vérification envoyé ! Vérifiez votre boîte.",
    account_not_verified: "Veuillez vérifier votre email pour continuer",

    // Catalogue page
    swap_market: "Marché d'Échange",
    items_near_you: "articles près de vous",
    filter_by: "Filtrer par",
    condition: "État",
    new_item: "Neuf",
    like_new: "Comme neuf",
    good: "Bon",
    fair: "Correct",
    sort_by: "Trier par",
    recently_added: "Récemment ajouté",
    most_popular: "Le plus populaire",
    nearest_first: "Le plus proche d'abord",
    clear_filters: "Effacer tous les filtres",

    // Product page
    propose_swap: "Proposer un Échange",
    offer_multiple: "Proposer plusieurs articles",
    save: "Enregistrer",
    report: "Signaler",
    anonymous_user: "Utilisateur Anonyme",
    anonymous_swapper: "Swappeur Anonyme",
    identity_revealed: "Identité révélée après acceptation mutuelle",
    people_interested: "personnes intéressées",
    posted: "Publié",
    days_ago: "il y a",
    you_might_like: "Vous aimerez aussi",
    choose_item: "Choisir un article à offrir",
    send_proposal: "Envoyer la proposition d'échange",

    // Profile page
    my_swaps: "Mes Échanges",
    my_items: "Mes Articles",
    swap_history: "Historique des Échanges",
    saved_items: "Articles Enregistrés",
    settings: "Paramètres",
    edit_profile: "Modifier le Profil",
    swaps_completed: "Échanges complétés",
    items_donated: "Articles donnés",
    buy_more: "Acheter plus",
    notifications: "Notifications",
    language: "Langue",
    premium: "Premium",
    my_profile: "Mon Profil",
    logout: "Déconnexion",

    // Chat page
    swapchat: "ÉchangeChat",
    type_message: "Tapez un message...",
    swap_accepted: "Échange accepté — Identités révélées",
    confirm_exchange: "Confirmer l'échange",
    auto_filter_warning: "Les numéros de téléphone, e-mails et liens sont automatiquement filtrés",

    // Giveaway page
    gift_corner_title: "Coin Cadeaux",
    donate_item: "Donner un article",
    browse_gifts: "Parcourir les cadeaux",
    claims_remaining: "réclamations restantes",
    giveaway_pass: "Forfait Cadeaux",
    get_pass: "Obtenir le Forfait",
    monthly_pass: "15 AED/mois",

    // Footer
    platform: "Plateforme",
    company: "Entreprise",
    legal: "Légal",
    terms: "Conditions d'utilisation",
    privacy: "Politique de confidentialité",
    about: "À propos",
    contact: "Contact",

    // Common
    km: "km",
    all_uae: "Tout EAU",
    detecting_location: "Détection de la localisation...",
    loading: "Chargement...",
    error: "Erreur",
    success: "Succès",
    cancel: "Annuler",
    confirm: "Confirmer",
    yes: "Oui",
    no: "Non",

    // Subscription & Pricing
    plan_free: "Gratuit",
    plan_bronze: "Bronze",
    plan_silver: "Silver",
    plan_premium: "Premium",
    swaps_remaining: "échanges restants",
    upgrade_plan: "Améliorer mon plan",
    choose_plan: "Choisissez votre plan",
    plan_subtitle: "Commencez à échanger gratuitement. Améliorez à tout moment.",
    per_month: "/mois",
    swaps_per_month: "échanges/mois",
    unlimited: "Illimité",
    giveaway_claims: "claims giveaway/mois",
    boosts_per_month: "boosts/mois",
    no_ads: "Sans pub",
    reduced_ads: "Pub réduite",
    get_started: "Commencer gratuitement",
    subscribe: "S'abonner",
    go_premium: "Passer Premium",
    best_value: "Meilleur rapport",
    current_plan: "Plan actuel",
    quota_reached: "Vous avez atteint votre limite mensuelle d'échanges",
    upgrade_to_swap: "Améliorez pour échanger plus ce mois",
    my_subscription: "Mon Abonnement",
    renewal_date: "Prochain renouvellement",

    // Pricing page
    pricing_heading: "Choisissez votre plan",
    pricing_subtitle: "Commencez gratuitement. Améliorez à tout moment.",
    plan_free_price: "Gratuit",
    plan_free_subtitle: "Pas de carte de crédit nécessaire",
    plan_bronze_subtitle: "Pour les échangeurs occasionnels",
    plan_silver_subtitle: "Pour les échangeurs réguliers",
    plan_premium_subtitle: "Pour les échangeurs passionnés",
    badge_newcomer: "Nouveau",
    badge_bronze: "Bronze",
    badge_silver: "Argent",
    badge_premium: "Premium",
    badge_best_value: "Meilleur rapport",
    feat_swaps_2: "2 échanges / mois",
    feat_swaps_4: "4 échanges / mois",
    feat_swaps_6: "6 échanges / mois",
    feat_swaps_unlimited: "Échanges illimités",
    feat_giveaway_1: "1 don / mois",
    feat_giveaway_2: "2 dons / mois",
    feat_giveaway_3: "3 dons / mois",
    feat_giveaway_5: "5 dons / mois",
    feat_no_boosts: "Pas de boosts",
    feat_boost_1: "1 boost / mois",
    feat_boost_2: "2 boosts / mois",
    feat_boost_4: "4 boosts / mois",
    feat_ads_yes: "Publicités affichées",
    feat_ads_reduced: "Publicités réduites",
    feat_ads_reduced2: "Publicités réduites",
    feat_no_ads: "Sans publicités",
    cta_free: "Commencer gratuitement",
    cta_subscribe: "S'abonner",
    cta_premium: "Devenir Premium",
    faq_heading: "Questions fréquentes",
    faq_q_cancel: "Puis-je annuler à tout moment ?",
    faq_a_cancel: "Oui, annulez quand vous voulez. Sans engagement.",
    faq_q_downgrade: "Que se passe-t-il si je rétrograde ?",
    faq_a_downgrade: "Les échanges actifs restent ouverts. Le nouveau quota s'applique au prochain cycle.",
    faq_q_reset: "Quand mon quota se réinitialise-t-il ?",
    faq_a_reset: "Mensuellement, à la date anniversaire de votre inscription.",
    faq_q_identity: "Mon identité est-elle protégée ?",
    faq_a_identity: "Oui, l'identité n'est révélée que lorsque les deux parties acceptent un échange.",
    cta_ready: "Prêt à échanger ?",
    cta_ready_sub: "Rejoignez des milliers d'échangeurs aux EAU.",
    cta_join_free: "Rejoindre gratuitement",
  },

  ar: {
    // Navbar
    search_placeholder: "ابحث عن الأشياء...",
    join_swap: "انضم للتبادل",
    drop_item: "أضف منتج",

    // Categories
    all: "الكل",
    clothing: "ملابس",
    electronics: "إلكترونيات",
    furniture: "أثاث",
    vehicles: "مركبات",
    sports: "رياضة وترفيه",
    books: "كتب ووسائط",
    kids: "أطفال وأطفال رضع",
    plants: "نباتات",
    gift_corner: "ركن الهدايا",

    // Clothing subcategories
    clothing_gender_filter: "تصفية حسب",
    clothing_men: "رجال",
    clothing_women: "نساء",
    clothing_children: "أطفال",
    clothing_unisex: "للجنسين",
    subcat_shirts: "قمصان",
    subcat_tshirts: "تيشيرتات",
    subcat_trousers: "بناطيل",
    subcat_jeans: "جينز",
    subcat_shorts: "شورتات",
    subcat_suits: "بدل وبليزرات",
    subcat_jackets: "جاكيتات ومعاطف",
    subcat_sweaters: "بلوفرات وهودي",
    subcat_underwear: "ملابس داخلية",
    subcat_men_shoes: "أحذية رجالية",
    subcat_traditional: "ملابس تقليدية (كندورة/ثوب)",
    subcat_dresses: "فساتين",
    subcat_tops: "بلوزات وتوبات",
    subcat_trousers_jeans: "بناطيل وجينز",
    subcat_skirts: "تنانير",
    subcat_abayas: "عبايات وأزياء محتشمة",
    subcat_lingerie: "ملابس داخلية نسائية",
    subcat_women_shoes: "أحذية نسائية",
    subcat_swimwear: "ملابس سباحة",
    subcat_sportswear: "ملابس رياضية",
    subcat_pyjamas: "بيجامات",
    subcat_clothing_acc: "إكسسوارات ملابس",

    // Bags & Accessories
    bags_accessories: "حقائب وإكسسوارات",
    zone_bags: "حقائب",
    zone_accessories: "إكسسوارات",
    subcat_handbags: "حقائب يد",
    subcat_backpacks: "حقائب ظهر",
    subcat_luggage: "حقائب سفر",
    subcat_sports_bags: "حقائب رياضية",
    subcat_clutches: "محافظ وكلاتش",
    subcat_business_bags: "حقائب عمل/لابتوب",
    subcat_tote: "حقائب توت",
    subcat_watches: "ساعات",
    subcat_sunglasses: "نظارات شمسية",
    subcat_jewellery: "مجوهرات",
    subcat_belts: "أحزمة",
    subcat_wallets: "محافظ",
    subcat_scarves: "أوشحة وشالات",
    subcat_hats: "قبعات",
    material: "المادة",
    material_leather: "جلد",
    material_fabric: "قماش",
    material_synthetic: "صناعي",
    material_other: "أخرى",

    // Kids & Baby subcategories
    kids_girl: "بنت",
    kids_boy: "ولد",
    kids_unisex: "للجنسين",
    subcat_baby_clothing: "ملابس",
    subcat_toys: "ألعاب",
    subcat_strollers: "عربات وكراسي سيارة",
    subcat_baby_furniture: "أثاث أطفال",
    subcat_feeding: "تغذية وببرونات",
    subcat_kids_books: "كتب أطفال",
    age_range: "الفئة العمرية",

    // Gaming & Consoles
    gaming: "ألعاب وأجهزة",
    zone_consoles: "أجهزة ومعدات",
    zone_games: "ألعاب",
    zone_gaming_acc: "إكسسوارات الألعاب",
    platform_filter: "المنصة",

    // Homepage
    hero_title: "شخص ما يحتاج ما لديك.\nبادله.",
    hero_subtitle: "أول منصة مقايضة في الإمارات. تبادل مع مجتمعك. ابدأ مجاناً.",
    how_it_works: "كيف يعمل",
    step1_title: "ضع قائمة بعنصرك",
    step1_desc: "حمّل الصور والتفاصيل حول ما تريد تبديله.",
    step2_title: "استعرض واقترح",
    step2_desc: "ابحث عن العناصر التي تعجبك واقترح تبديلاً.",
    step3_title: "تحدث وافق",
    step3_desc: "ناقش التفاصيل في التطبيق. لا حاجة إلى أرقام أو رسائل بريد إلكترونية.",
    step4_title: "تبادل وقيّم",
    step4_desc: "كلاهما يقبل؟ يتم الكشف عن الهويات! التقيا وتبادلا.",
    popular_now: "شهير الآن",
    see_all: "عرض الكل ←",
    give_away_title: "تبرع وساعد المجتمع",
    give_away_desc: "تبرع بالأشياء التي لا تحتاجها. المطالبات مضمنة في اشتراكك.",
    browse_categories: "تصفح الفئات",
    discover_swappo: "اكتشف Swappo",
    video_banner_title: "خزانتك هي كنز لشخص آخر",
    video_banner_desc: "انضم إلى آلاف المبادلين في الإمارات. بدون نقود، بدون هدر — فقط تبادلات ذكية.",
    start_swapping: "ابدأ التبادل",
    explore_items: "استكشف العناصر",
    active_swappers: "مبادلون نشطون",
    items_listed: "عناصر مدرجة",
    swaps_completed: "تبادلات مكتملة",
    ready_to_swap: "هل أنت مستعد للتبديل؟",
    create_account: "إنشاء حسابي — مجاني",
    items: "عناصر",

    // Login & Auth
    sign_up: "إنشاء حساب",
    log_in: "تسجيل الدخول",
    full_name: "الاسم الكامل",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    confirm_password: "تأكيد كلمة المرور",
    agree_terms: "أوافق على الشروط والأحكام",
    already_account: "هل لديك حساب بالفعل؟",
    no_account: "ليس لديك حساب؟",
    or_continue: "أو المتابعة مع",
    forgot_password: "هل نسيت كلمة المرور؟",
    phone_number: "رقم الهاتف",
    gender_label: "الجنس",
    gender_male: "ذكر",
    gender_female: "أنثى",
    gender_other: "أفضل عدم القول",
    pseudo_label: "اسم المستخدم",
    pseudo_placeholder: "3-20 حرف، أحرف/أرقام/شرطات سفلية",
    pseudo_taken: "اسم المستخدم هذا مأخوذ بالفعل",
    pseudo_available: "اسم المستخدم متاح!",
    choose_avatar: "اختر صورتك الرمزية",
    avatar_required: "يرجى اختيار صورة رمزية",

    // Verification
    phone_verification: "التحقق من الهاتف",
    phone_label: "رقم الهاتف (+971)",
    send_code: "إرسال الرمز",
    enter_code: "أدخل رمز التحقق",
    verify_code: "تحقق",
    resend_code: "إعادة إرسال الرمز",
    phone_already_used: "هذا الرقم مرتبط بحساب بالفعل",
    email_verification: "التحقق من البريد",
    email_sent: "تم إرسال بريد التحقق! تحقق من صندوقك.",
    account_not_verified: "يرجى التحقق من بريدك للمتابعة",

    // Catalogue page
    swap_market: "سوق التبادل",
    items_near_you: "عناصر بالقرب منك",
    filter_by: "تصفية حسب",
    condition: "الحالة",
    new_item: "جديد",
    like_new: "شبه جديد",
    good: "جيد",
    fair: "مقبول",
    sort_by: "ترتيب حسب",
    recently_added: "أضيف مؤخراً",
    most_popular: "الأكثر شهرة",
    nearest_first: "الأقرب أولاً",
    clear_filters: "مسح جميع المرشحات",

    // Product page
    propose_swap: "اقترح تبديلاً",
    offer_multiple: "عرض عناصر متعددة",
    save: "حفظ",
    report: "إبلاغ",
    anonymous_user: "مستخدم مجهول",
    anonymous_swapper: "مبادل مجهول",
    identity_revealed: "يتم الكشف عن الهوية بعد قبول كليهما",
    people_interested: "أشخاص مهتمون",
    posted: "منشور",
    days_ago: "منذ أيام",
    you_might_like: "قد يعجبك أيضاً",
    choose_item: "اختر عنصراً للعرض",
    send_proposal: "إرسال اقتراح التبديل",

    // Profile page
    my_swaps: "تبديلاتي",
    my_items: "عناصري",
    swap_history: "سجل التبديلات",
    saved_items: "العناصر المحفوظة",
    settings: "الإعدادات",
    edit_profile: "تعديل الملف الشخصي",
    swaps_completed: "التبديلات المكتملة",
    items_donated: "العناصر المانحة",
    buy_more: "شراء المزيد",
    notifications: "الإشعارات",
    language: "اللغة",
    premium: "ممتاز",
    my_profile: "ملفي الشخصي",
    logout: "تسجيل الخروج",

    // Chat page
    swapchat: "دردشة التبديل",
    type_message: "اكتب رسالة...",
    swap_accepted: "تم قبول التبديل — تم الكشف عن الهويات",
    confirm_exchange: "تأكيد الصفقة",
    auto_filter_warning: "يتم تصفية أرقام الهاتف والبريد الإلكتروني والروابط تلقائياً",

    // Giveaway page
    gift_corner_title: "ركن الهدايا",
    donate_item: "تبرع بعنصر",
    browse_gifts: "تصفح الهدايا",
    claims_remaining: "مطالبات متبقية",
    giveaway_pass: "تصريح الهدايا",
    get_pass: "احصل على التصريح",
    monthly_pass: "15 درهم/شهر",

    // Footer
    platform: "المنصة",
    company: "الشركة",
    legal: "القانونية",
    terms: "شروط الاستخدام",
    privacy: "سياسة الخصوصية",
    about: "من نحن",
    contact: "اتصل بنا",

    // Common
    km: "كم",
    all_uae: "كل الإمارات",
    detecting_location: "جاري الكشف عن الموقع...",
    loading: "جاري التحميل...",
    error: "خطأ",
    success: "نجاح",
    cancel: "إلغاء",
    confirm: "تأكيد",
    yes: "نعم",
    no: "لا",

    // Subscription & Pricing
    plan_free: "مجاني",
    plan_bronze: "برونز",
    plan_silver: "فضي",
    plan_premium: "بريميوم",
    swaps_remaining: "مبادلات متبقية",
    upgrade_plan: "ترقية الخطة",
    choose_plan: "اختر خطتك",
    plan_subtitle: "ابدأ بالمبادلة مجانًا. قم بالترقية في أي وقت.",
    per_month: "/شهر",
    swaps_per_month: "مبادلات/شهر",
    unlimited: "غير محدود",
    giveaway_claims: "مطالبات هدايا/شهر",
    boosts_per_month: "تعزيزات/شهر",
    no_ads: "بدون إعلانات",
    reduced_ads: "إعلانات مخفضة",
    get_started: "ابدأ مجانًا",
    subscribe: "اشترك",
    go_premium: "انتقل للبريميوم",
    best_value: "أفضل قيمة",
    current_plan: "الخطة الحالية",
    quota_reached: "لقد وصلت إلى الحد الشهري للمبادلات",
    upgrade_to_swap: "قم بالترقية لمزيد من المبادلات",
    my_subscription: "اشتراكي",
    renewal_date: "التجديد القادم",

    // Pricing page
    pricing_heading: "اختر خطتك",
    pricing_subtitle: "ابدأ مجاناً. قم بالترقية في أي وقت.",
    plan_free_price: "مجاني",
    plan_free_subtitle: "لا حاجة لبطاقة ائتمان",
    plan_bronze_subtitle: "للمبادلين العاديين",
    plan_silver_subtitle: "للمبادلين المنتظمين",
    plan_premium_subtitle: "للمبادلين المحترفين",
    badge_newcomer: "جديد",
    badge_bronze: "برونزي",
    badge_silver: "فضي",
    badge_premium: "مميز",
    badge_best_value: "أفضل قيمة",
    feat_swaps_2: "2 مبادلات / شهر",
    feat_swaps_4: "4 مبادلات / شهر",
    feat_swaps_6: "6 مبادلات / شهر",
    feat_swaps_unlimited: "مبادلات غير محدودة",
    feat_giveaway_1: "1 مطالبة هدية / شهر",
    feat_giveaway_2: "2 مطالبات هدية / شهر",
    feat_giveaway_3: "3 مطالبات هدية / شهر",
    feat_giveaway_5: "5 مطالبات هدية / شهر",
    feat_no_boosts: "بدون تعزيزات",
    feat_boost_1: "1 تعزيز / شهر",
    feat_boost_2: "2 تعزيز / شهر",
    feat_boost_4: "4 تعزيز / شهر",
    feat_ads_yes: "إعلانات معروضة",
    feat_ads_reduced: "إعلانات مخفضة",
    feat_ads_reduced2: "إعلانات مخفضة",
    feat_no_ads: "بدون إعلانات",
    cta_free: "ابدأ مجاناً",
    cta_subscribe: "اشترك",
    cta_premium: "انتقل إلى المميز",
    faq_heading: "الأسئلة الشائعة",
    faq_q_cancel: "هل يمكنني الإلغاء في أي وقت؟",
    faq_a_cancel: "نعم، ألغِ في أي وقت. بدون التزام.",
    faq_q_downgrade: "ماذا يحدث إذا خفضت الخطة؟",
    faq_a_downgrade: "تبقى المبادلات النشطة مفتوحة. الحصة الجديدة تطبق في الدورة التالية.",
    faq_q_reset: "متى تتجدد حصتي؟",
    faq_a_reset: "شهرياً، في تاريخ ذكرى تسجيلك.",
    faq_q_identity: "هل هويتي محمية؟",
    faq_a_identity: "نعم، يتم الكشف عن الهوية فقط عندما يقبل الطرفان المبادلة.",
    cta_ready: "مستعد لبدء المبادلة؟",
    cta_ready_sub: "انضم إلى آلاف المبادلين في الإمارات.",
    cta_join_free: "انضم مجاناً",
  },

  ur: {
    // Navbar
    search_placeholder: "چیزیں تلاش کریں...",
    join_swap: "سواپ میں شامل ہوں",
    drop_item: "آئٹم شامل کریں",

    // Categories
    all: "سب",
    clothing: "کپڑے",
    electronics: "الیکٹرانکس",
    furniture: "فرنیچر",
    vehicles: "گاڑیاں",
    sports: "کھیل اور تفریح",
    books: "کتابیں اور میڈیا",
    kids: "بچے اور بیبی",
    plants: "پودے",
    gift_corner: "تحائف کونا",

    // Clothing subcategories
    clothing_gender_filter: "فلٹر",
    clothing_men: "مرد",
    clothing_women: "عورت",
    clothing_children: "بچے",
    clothing_unisex: "یونیسیکس",
    subcat_shirts: "شرٹس",
    subcat_tshirts: "ٹی شرٹس",
    subcat_trousers: "پتلون",
    subcat_jeans: "جینز",
    subcat_shorts: "شارٹس",
    subcat_suits: "سوٹ اور بلیزر",
    subcat_jackets: "جیکٹس اور کوٹ",
    subcat_sweaters: "سویٹر اور ہوڈیز",
    subcat_underwear: "زیر جامہ",
    subcat_men_shoes: "مردوں کے جوتے",
    subcat_traditional: "روایتی لباس (قندورہ/ثوب)",
    subcat_dresses: "لباس",
    subcat_tops: "ٹاپس اور بلاؤز",
    subcat_trousers_jeans: "پتلون اور جینز",
    subcat_skirts: "اسکرٹس",
    subcat_abayas: "عبایا اور مسلم لباس",
    subcat_lingerie: "لنجری",
    subcat_women_shoes: "خواتین کے جوتے",
    subcat_swimwear: "سوئم ویئر",
    subcat_sportswear: "کھیلوں کا لباس",
    subcat_pyjamas: "پاجامے",
    subcat_clothing_acc: "ملبوسات کے لوازمات",

    // Bags & Accessories
    bags_accessories: "بیگ اور لوازمات",
    zone_bags: "بیگ",
    zone_accessories: "لوازمات",
    subcat_handbags: "ہینڈ بیگ",
    subcat_backpacks: "بیک پیک",
    subcat_luggage: "سامان سفر",
    subcat_sports_bags: "کھیلوں کے بیگ",
    subcat_clutches: "کلچ اور پاؤچ",
    subcat_business_bags: "بزنس/لیپ ٹاپ بیگ",
    subcat_tote: "ٹوٹ بیگ",
    subcat_watches: "گھڑیاں",
    subcat_sunglasses: "دھوپ کی عینک",
    subcat_jewellery: "زیورات",
    subcat_belts: "بیلٹ",
    subcat_wallets: "بٹوے",
    subcat_scarves: "اسکارف اور شال",
    subcat_hats: "ٹوپیاں",
    material: "مواد",
    material_leather: "چمڑا",
    material_fabric: "کپڑا",
    material_synthetic: "مصنوعی",
    material_other: "دیگر",

    // Kids & Baby subcategories
    kids_girl: "لڑکی",
    kids_boy: "لڑکا",
    kids_unisex: "یونیسیکس",
    subcat_baby_clothing: "کپڑے",
    subcat_toys: "کھلونے",
    subcat_strollers: "سٹرولر اور کار سیٹ",
    subcat_baby_furniture: "بچوں کا فرنیچر",
    subcat_feeding: "فیڈنگ اور بوتلیں",
    subcat_kids_books: "بچوں کی کتابیں",
    age_range: "عمر کی حد",

    // Gaming & Consoles
    gaming: "گیمنگ اور کنسولز",
    zone_consoles: "کنسولز اور ہارڈویئر",
    zone_games: "گیمز",
    zone_gaming_acc: "گیمنگ لوازمات",
    platform_filter: "پلیٹ فارم",

    // Homepage
    hero_title: "کسی کو آپ کی چیز کی ضرورت ہے۔\nاسے تبدیل کریں۔",
    hero_subtitle: "امارات کا پہلا بارٹر پلیٹ فارم۔ اپنی کمیونٹی کے ساتھ تبادلہ کریں۔ مفت شروع کریں۔",
    how_it_works: "یہ کیسے کام کرتا ہے",
    step1_title: "اپنی چیز کی فہرست بنائیں",
    step1_desc: "تصاویر اور اپ لوڈ کریں جو آپ تبدیل کرنا چاہتے ہیں۔",
    step2_title: "براؤز کریں اور تجویز دیں",
    step2_desc: "ایسی چیزیں تلاش کریں جو آپ کو پسند ہوں اور سواپ کی تجویز دیں۔",
    step3_title: "بات چیت کریں اور قبول کریں",
    step3_desc: "ایپ میں تفصیلات پر بات کریں۔ کوئی فون نمبر یا ای میل کی ضرورت نہیں۔",
    step4_title: "تبدیل کریں اور درجہ بندی کریں",
    step4_desc: "دونوں قبول کرتے ہیں؟ شناخت ظاہر! ملیں اور تبدیل کریں۔",
    popular_now: "ابھی مقبول ہے",
    see_all: "سب دیکھیں ←",
    give_away_title: "دے دیں، کمیونٹی کی مدد کریں",
    give_away_desc: "وہ چیزیں دان کریں جن کی آپ کو ضرورت نہیں۔ دعوے آپ کی سبسکرپشن میں شامل ہیں۔",
    browse_categories: "زمرہ جات کو براؤز کریں",
    discover_swappo: "Swappo دریافت کریں",
    video_banner_title: "آپ کی الماری کسی کا خزانہ ہے",
    video_banner_desc: "UAE بھر میں ہزاروں ایکسچینجرز میں شامل ہوں۔ نقد نہیں، فضول نہیں — صرف سمارٹ ایکسچینج۔",
    start_swapping: "ایکسچینج شروع کریں",
    explore_items: "آئٹمز تلاش کریں",
    active_swappers: "فعال ایکسچینجرز",
    items_listed: "درج شدہ آئٹمز",
    swaps_completed: "مکمل ایکسچینجز",
    ready_to_swap: "تبدیل کرنے کے لیے تیار ہیں؟",
    create_account: "میرا اکاؤنٹ بنائیں — یہ مفت ہے",
    items: "چیزیں",

    // Login & Auth
    sign_up: "رجسٹر کریں",
    log_in: "لاگ ان کریں",
    full_name: "مکمل نام",
    email: "ای میل",
    password: "پاس ورڈ",
    confirm_password: "پاس ورڈ کی تصدیق کریں",
    agree_terms: "میں شرائط و ضوابط سے اتفاق رکھتا ہوں",
    already_account: "کیا آپ کے پاس پہلے سے اکاؤنٹ ہے؟",
    no_account: "کیا آپ کے پاس اکاؤنٹ نہیں ہے؟",
    or_continue: "یا جاری رکھیں",
    forgot_password: "پاس ورڈ بھول گئے؟",
    phone_number: "فون نمبر",
    gender_label: "صنف",
    gender_male: "مرد",
    gender_female: "عورت",
    gender_other: "نہیں بتانا چاہتے",
    pseudo_label: "صارف نام",
    pseudo_placeholder: "3-20 حروف، حروف/نمبر/انڈرسکور",
    pseudo_taken: "یہ صارف نام پہلے سے لیا ہوا ہے",
    pseudo_available: "صارف نام دستیاب ہے!",
    choose_avatar: "اپنا اوتار منتخب کریں",
    avatar_required: "براہ کرم ایک اوتار منتخب کریں",

    // Verification
    phone_verification: "فون کی تصدیق",
    phone_label: "فون نمبر (+971)",
    send_code: "کوڈ بھیجیں",
    enter_code: "تصدیقی کوڈ درج کریں",
    verify_code: "تصدیق کریں",
    resend_code: "کوڈ دوبارہ بھیجیں",
    phone_already_used: "یہ نمبر پہلے سے ایک اکاؤنٹ سے منسلک ہے",
    email_verification: "ای میل کی تصدیق",
    email_sent: "تصدیقی ای میل بھیج دی گئی! اپنا ان باکس چیک کریں۔",
    account_not_verified: "جاری رکھنے کے لیے اپنا ای میل تصدیق کریں",

    // Catalogue page
    swap_market: "سواپ مارکیٹ",
    items_near_you: "آپ کے قریب چیزیں",
    filter_by: "فلٹر کریں",
    condition: "حالت",
    new_item: "نیا",
    like_new: "نئے جیسا",
    good: "اچھا",
    fair: "منصفانہ",
    sort_by: "ترتیب دیں",
    recently_added: "حال ہی میں شامل",
    most_popular: "سب سے مقبول",
    nearest_first: "قریب ترین پہلے",
    clear_filters: "تمام فلٹرز صاف کریں",

    // Product page
    propose_swap: "سواپ کی تجویز دیں",
    offer_multiple: "متعدد چیزیں پیش کریں",
    save: "محفوظ کریں",
    report: "رپورٹ کریں",
    anonymous_user: "نام نہاد صارف",
    anonymous_swapper: "نام نہاد سواپر",
    identity_revealed: "دونوں قبول کرنے کے بعد شناخت ظاہر ہوتی ہے",
    people_interested: "دلچسپی رکھنے والے لوگ",
    posted: "پوسٹ شدہ",
    days_ago: "دن پہلے",
    you_might_like: "آپ کو بھی یہ پسند آ سکتا ہے",
    choose_item: "پیش کرنے کے لیے ایک چیز منتخب کریں",
    send_proposal: "سواپ کی تجویز بھیجیں",

    // Profile page
    my_swaps: "میرے سواپس",
    my_items: "میری چیزیں",
    swap_history: "سواپ کی تاریخ",
    saved_items: "محفوظ چیزیں",
    settings: "ترتیبات",
    edit_profile: "پروفائل میں ترمیم کریں",
    swaps_completed: "مکمل سواپس",
    items_donated: "عطیہ کی گئی چیزیں",
    buy_more: "مزید خریدیں",
    notifications: "اطلاعات",
    language: "زبان",
    premium: "پریمیم",
    my_profile: "میرا پروفائل",
    logout: "لاگ آؤٹ کریں",

    // Chat page
    swapchat: "سواپ چیٹ",
    type_message: "ایک پیغام لکھیں...",
    swap_accepted: "سواپ منظور ہو گیا — شناخت ظاہر ہو گئی",
    confirm_exchange: "تبادلے کی تصدیق کریں",
    auto_filter_warning: "فون نمبر، ای میل اور لنکس خود بخود فلٹر ہو جاتے ہیں",

    // Giveaway page
    gift_corner_title: "تحائف کونا",
    donate_item: "ایک چیز عطیہ دیں",
    browse_gifts: "تحائف کو براؤز کریں",
    claims_remaining: "باقی دعویٰ",
    giveaway_pass: "تحفہ پاس",
    get_pass: "پاس حاصل کریں",
    monthly_pass: "15 درہم/ماہ",

    // Footer
    platform: "پلیٹ فارم",
    company: "کمپنی",
    legal: "قانونی",
    terms: "استعمال کی شرائط",
    privacy: "رازداری کی پالیسی",
    about: "ہمارے بارے میں",
    contact: "رابطہ کریں",

    // Common
    km: "کلومیٹر",
    all_uae: "تمام یو اے ای",
    detecting_location: "مقام کی شناخت جاری ہے...",
    loading: "لوڈ ہو رہا ہے...",
    error: "خرابی",
    success: "کامیابی",
    cancel: "منسوخ کریں",
    confirm: "تصدیق کریں",
    yes: "ہاں",
    no: "نہیں",

    // Subscription & Pricing
    plan_free: "مفت",
    plan_bronze: "برانز",
    plan_silver: "سلور",
    plan_premium: "پریمیم",
    swaps_remaining: "تبادلے باقی ہیں",
    upgrade_plan: "پلان اپ گریڈ کریں",
    choose_plan: "اپنا پلان منتخب کریں",
    plan_subtitle: "مفت میں تبادلہ شروع کریں۔ کسی بھی وقت اپ گریڈ کریں۔",
    per_month: "/ماہ",
    swaps_per_month: "تبادلے/ماہ",
    unlimited: "لامحدود",
    giveaway_claims: "تحفے کے دعوے/ماہ",
    boosts_per_month: "بوسٹ/ماہ",
    no_ads: "اشتہارات نہیں",
    reduced_ads: "کم اشتہارات",
    get_started: "مفت شروع کریں",
    subscribe: "سبسکرائب کریں",
    go_premium: "پریمیم میں جائیں",
    best_value: "بہترین قیمت",
    current_plan: "موجودہ پلان",
    quota_reached: "آپ کی ماہانہ تبادلے کی حد ختم ہو گئی",
    upgrade_to_swap: "مزید تبادلے کے لیے اپ گریڈ کریں",
    my_subscription: "میری رکنیت",
    renewal_date: "اگلی تجدید",

    // Pricing page
    pricing_heading: "اپنا پلان منتخب کریں",
    pricing_subtitle: "مفت شروع کریں۔ کسی بھی وقت اپ گریڈ کریں۔",
    plan_free_price: "مفت",
    plan_free_subtitle: "کریڈٹ کارڈ کی ضرورت نہیں",
    plan_bronze_subtitle: "عام تبادلہ کرنے والوں کے لیے",
    plan_silver_subtitle: "باقاعدہ تبادلہ کرنے والوں کے لیے",
    plan_premium_subtitle: "پاور تبادلہ کرنے والوں کے لیے",
    badge_newcomer: "نیا",
    badge_bronze: "کانسی",
    badge_silver: "چاندی",
    badge_premium: "پریمیم",
    badge_best_value: "بہترین قیمت",
    feat_swaps_2: "2 تبادلے / ماہ",
    feat_swaps_4: "4 تبادلے / ماہ",
    feat_swaps_6: "6 تبادلے / ماہ",
    feat_swaps_unlimited: "لامحدود تبادلے",
    feat_giveaway_1: "1 تحفہ دعویٰ / ماہ",
    feat_giveaway_2: "2 تحفہ دعوے / ماہ",
    feat_giveaway_3: "3 تحفہ دعوے / ماہ",
    feat_giveaway_5: "5 تحفہ دعوے / ماہ",
    feat_no_boosts: "بوسٹ نہیں",
    feat_boost_1: "1 بوسٹ / ماہ",
    feat_boost_2: "2 بوسٹ / ماہ",
    feat_boost_4: "4 بوسٹ / ماہ",
    feat_ads_yes: "اشتہارات دکھائے گئے",
    feat_ads_reduced: "کم اشتہارات",
    feat_ads_reduced2: "کم اشتہارات",
    feat_no_ads: "اشتہارات نہیں",
    cta_free: "مفت شروع کریں",
    cta_subscribe: "رکنیت حاصل کریں",
    cta_premium: "پریمیم بنیں",
    faq_heading: "اکثر پوچھے جانے والے سوالات",
    faq_q_cancel: "کیا میں کسی بھی وقت منسوخ کر سکتا ہوں؟",
    faq_a_cancel: "جی ہاں، کسی بھی وقت منسوخ کریں۔ کوئی عہد نہیں۔",
    faq_q_downgrade: "اگر میں ڈاؤن گریڈ کروں تو کیا ہوگا؟",
    faq_a_downgrade: "فعال تبادلے کھلے رہیں گے۔ نیا کوٹا اگلے دور میں لاگو ہوگا۔",
    faq_q_reset: "میرا کوٹا کب ری سیٹ ہوتا ہے؟",
    faq_a_reset: "ماہانہ، آپ کی سائن اپ کی سالگرہ کی تاریخ پر۔",
    faq_q_identity: "کیا میری شناخت محفوظ ہے؟",
    faq_a_identity: "جی ہاں، شناخت صرف اس وقت ظاہر ہوتی ہے جب دونوں فریق تبادلہ قبول کریں۔",
    cta_ready: "تبادلہ شروع کرنے کے لیے تیار ہیں؟",
    cta_ready_sub: "یو اے ای بھر میں ہزاروں تبادلہ کرنے والوں میں شامل ہوں۔",
    cta_join_free: "مفت شامل ہوں",
  },
};

// ========================================
// STATE MANAGEMENT
// ========================================

let currentLanguage = 'en';
const RTL_LANGUAGES = ['ar', 'ur'];
const STORAGE_KEY = 'swappo_language';
const LANGUAGE_CHANGED_EVENT = 'languageChanged';

// ========================================
// TRANSLATION FUNCTION
// ========================================

/**
 * Get translated string for current language
 * @param {string} key - Translation key
 * @param {string} lang - Optional language override
 * @returns {string} Translated string or key if not found
 */
function t(key, lang = null) {
  const langCode = lang || currentLanguage;

  if (translations[langCode] && translations[langCode][key]) {
    return translations[langCode][key];
  }

  // Fallback to English
  if (translations.en[key]) {
    console.warn(`Translation missing for key "${key}" in language "${langCode}". Using English fallback.`);
    return translations.en[key];
  }

  console.warn(`Translation key "${key}" not found in any language.`);
  return key;
}

/**
 * Get current language
 * @returns {string} Current language code
 */
function getCurrentLang() {
  return currentLanguage;
}

/**
 * Detect browser language or use fallback
 * @returns {string} Language code
 */
function detectBrowserLanguage() {
  const browserLang = navigator.language || navigator.userLanguage;
  const langCode = browserLang.split('-')[0];
  const supportedLangs = ['en', 'fr', 'ar', 'ur'];

  return supportedLangs.includes(langCode) ? langCode : 'en';
}

// ========================================
// APPLY TRANSLATIONS
// ========================================

/**
 * Apply translations to all elements with data-i18n attributes
 */
function applyTranslations() {
  // Text content
  const i18nElements = document.querySelectorAll('[data-i18n]');
  i18nElements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = t(key);
    }
  });

  // Placeholder attributes
  const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
  placeholderElements.forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) {
      el.placeholder = t(key);
    }
  });

  // Title attributes
  const titleElements = document.querySelectorAll('[data-i18n-title]');
  titleElements.forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      el.title = t(key);
    }
  });

  // Alt attributes for images
  const altElements = document.querySelectorAll('[data-i18n-alt]');
  altElements.forEach(el => {
    const key = el.getAttribute('data-i18n-alt');
    if (key) {
      el.alt = t(key);
    }
  });

  // Value attributes (for buttons, inputs)
  const valueElements = document.querySelectorAll('[data-i18n-value]');
  valueElements.forEach(el => {
    const key = el.getAttribute('data-i18n-value');
    if (key) {
      el.value = t(key);
    }
  });
}

// ========================================
// SET LANGUAGE & RTL
// ========================================

/**
 * Set active language and update DOM
 * @param {string} lang - Language code (en, fr, ar, ur)
 */
function setLanguage(lang) {
  // Validate language
  if (!translations[lang]) {
    console.error(`Language "${lang}" not supported. Using English.`);
    lang = 'en';
  }

  currentLanguage = lang;

  // Save to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (e) {
    console.warn('Could not save language preference to localStorage', e);
  }

  // Set HTML lang attribute
  document.documentElement.lang = lang;

  // Handle RTL
  const isRTL = RTL_LANGUAGES.includes(lang);
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';

  // Add/remove RTL class
  if (isRTL) {
    document.body.classList.add('rtl');
  } else {
    document.body.classList.remove('rtl');
  }

  // Apply font for specific languages
  applyLanguageFonts(lang);

  // Update all translations
  applyTranslations();

  // Update language selector
  updateLanguageSelector(lang);

  // Dispatch custom event for components to listen
  const event = new CustomEvent(LANGUAGE_CHANGED_EVENT, {
    detail: { language: lang, isRTL }
  });
  document.dispatchEvent(event);
}

/**
 * Apply language-specific fonts
 * @param {string} lang - Language code
 */
function applyLanguageFonts(lang) {
  let fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  if (lang === 'ar') {
    fontFamily = '"Cairo", "Droid Arabic Naskh", "Arabic Typesetting", sans-serif';
  } else if (lang === 'ur') {
    fontFamily = '"Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", "Nastaleeq", sans-serif';
  } else if (lang === 'fr') {
    fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  }

  document.documentElement.style.fontFamily = fontFamily;
}

// ========================================
// LANGUAGE SELECTOR UI
// ========================================

/**
 * Create language dropdown in navbar
 */
function createLanguageSelector() {
  // Check if selector already exists
  if (document.getElementById('swappo-language-selector')) {
    return;
  }

  const languages = [
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'fr', label: 'FR', flag: '🇫🇷' },
    { code: 'ar', label: 'AR', flag: '🇦🇪' },
    { code: 'ur', label: 'UR', flag: '🇵🇰' },
  ];

  const currentLangData = languages.find(l => l.code === currentLanguage) || languages[0];

  // Create dropdown container
  const dropdown = document.createElement('div');
  dropdown.id = 'swappo-language-selector';
  dropdown.className = 'lang-dropdown';

  // Toggle button — shows only the active language
  const toggle = document.createElement('button');
  toggle.className = 'lang-dropdown-toggle';
  toggle.innerHTML = `<span class="flag">${currentLangData.flag}</span> <span class="label">${currentLangData.label}</span> <i class="fas fa-chevron-down lang-arrow"></i>`;
  dropdown.appendChild(toggle);

  // Dropdown menu
  const menu = document.createElement('div');
  menu.className = 'lang-dropdown-menu';

  languages.forEach(lang => {
    const item = document.createElement('button');
    item.className = 'lang-dropdown-item' + (lang.code === currentLanguage ? ' active' : '');
    item.setAttribute('data-lang', lang.code);
    item.innerHTML = `<span class="flag">${lang.flag}</span> <span class="label">${lang.label}</span>`;

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      setLanguage(lang.code);
      menu.classList.remove('open');
      toggle.classList.remove('open');
    });
    menu.appendChild(item);
  });

  dropdown.appendChild(menu);

  // Toggle open/close
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menu.classList.toggle('open');
    toggle.classList.toggle('open', isOpen);
  });

  // Close on outside click
  document.addEventListener('click', () => {
    menu.classList.remove('open');
    toggle.classList.remove('open');
  });

  // Insert into navbar actions (before the first button/link)
  const navbarActions = document.querySelector('.navbar-actions');
  if (navbarActions) {
    navbarActions.insertBefore(dropdown, navbarActions.firstChild);
  } else {
    // Fallback: append to body
    document.body.appendChild(dropdown);
  }

  // Inject CSS
  injectLanguageSelectorCSS();
}

/**
 * Update language selector active state
 * @param {string} lang - Current language code
 */
function updateLanguageSelector(lang) {
  const languages = [
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'fr', label: 'FR', flag: '🇫🇷' },
    { code: 'ar', label: 'AR', flag: '🇦🇪' },
    { code: 'ur', label: 'UR', flag: '🇵🇰' },
  ];

  const currentLangData = languages.find(l => l.code === lang) || languages[0];

  // Update toggle button
  const toggle = document.querySelector('.lang-dropdown-toggle');
  if (toggle) {
    toggle.innerHTML = `<span class="flag">${currentLangData.flag}</span> <span class="label">${currentLangData.label}</span> <i class="fas fa-chevron-down lang-arrow"></i>`;
  }

  // Update active state in dropdown items
  const items = document.querySelectorAll('.lang-dropdown-item');
  items.forEach(item => {
    if (item.getAttribute('data-lang') === lang) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

/**
 * Inject CSS styles for language selector and RTL support
 */
function injectLanguageSelectorCSS() {
  // Check if styles already injected
  if (document.getElementById('swappo-i18n-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'swappo-i18n-styles';
  style.textContent = `
    /* Language Dropdown */
    .lang-dropdown {
      position: relative;
      z-index: 100;
    }

    .lang-dropdown-toggle {
      background: transparent;
      border: 1px solid #e0e0e0;
      padding: 6px 10px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: #555;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      transition: all 0.2s ease;
    }

    .lang-dropdown-toggle:hover {
      border-color: #09B1BA;
      color: #09B1BA;
    }

    .lang-dropdown-toggle.open {
      border-color: #09B1BA;
      color: #09B1BA;
    }

    .lang-dropdown-toggle .flag {
      font-size: 16px;
    }

    .lang-dropdown-toggle .label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    .lang-arrow {
      font-size: 9px;
      transition: transform 0.2s ease;
      margin-left: 2px;
    }

    .lang-dropdown-toggle.open .lang-arrow {
      transform: rotate(180deg);
    }

    .lang-dropdown-menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      padding: 6px;
      min-width: 130px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-8px);
      transition: all 0.2s ease;
    }

    .lang-dropdown-menu.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .lang-dropdown-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 12px;
      border: none;
      background: transparent;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: #555;
      transition: all 0.15s ease;
    }

    .lang-dropdown-item:hover {
      background: #f0fbfc;
      color: #09B1BA;
    }

    .lang-dropdown-item.active {
      background: #09B1BA;
      color: white;
    }

    .lang-dropdown-item.active:hover {
      background: #078A91;
    }

    .lang-dropdown-item .flag {
      font-size: 16px;
    }

    .lang-dropdown-item .label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    html[dir="rtl"] .lang-dropdown-menu {
      right: auto;
      left: 0;
    }

    html[dir="rtl"] .lang-dropdown-toggle {
      flex-direction: row-reverse;
    }

    html[dir="rtl"] .lang-dropdown-item {
      flex-direction: row-reverse;
    }

    /* RTL Support */
    html[dir="rtl"] {
      direction: rtl;
      text-align: right;
    }

    html[dir="rtl"] .language-selector {
      right: auto;
      left: 24px;
    }

    html[dir="rtl"] .language-selector {
      flex-direction: row-reverse;
    }

    html[dir="rtl"] .language-btn {
      flex-direction: row-reverse;
    }

    /* RTL Flexbox Fixes */
    body.rtl [style*="flex-direction: row"] {
      flex-direction: row-reverse;
    }

    html[dir="rtl"] .navbar {
      flex-direction: row-reverse;
    }

    html[dir="rtl"] .navbar-logo {
      margin-left: auto;
      margin-right: 0;
    }

    html[dir="rtl"] .search-bar {
      margin-right: auto;
      margin-left: 20px;
    }

    html[dir="rtl"] .search-input {
      padding-left: 40px;
      padding-right: 16px;
    }

    html[dir="rtl"] .search-input::placeholder {
      text-align: right;
    }

    html[dir="rtl"] .search-icon {
      right: auto;
      left: 12px;
    }

    html[dir="rtl"] .navbar-menu {
      flex-direction: row-reverse;
    }

    /* Category Cards RTL */
    html[dir="rtl"] .category-grid {
      direction: rtl;
    }

    html[dir="rtl"] .card {
      direction: rtl;
    }

    /* Product Card RTL */
    html[dir="rtl"] .product-card {
      direction: rtl;
    }

    html[dir="rtl"] .product-price {
      margin-left: 0;
      margin-right: auto;
    }

    /* Forms RTL */
    html[dir="rtl"] .form-group {
      direction: rtl;
    }

    html[dir="rtl"] .form-group label {
      text-align: right;
    }

    html[dir="rtl"] .form-group input,
    html[dir="rtl"] .form-group textarea,
    html[dir="rtl"] .form-group select {
      text-align: right;
    }

    /* Icons/Buttons RTL */
    html[dir="rtl"] .btn-group {
      flex-direction: row-reverse;
    }

    html[dir="rtl"] .btn {
      margin-left: 0;
      margin-right: 8px;
    }

    html[dir="rtl"] .btn:last-child {
      margin-right: 0;
    }

    /* Border Radius for RTL */
    html[dir="rtl"] .rounded-left {
      border-radius: 0 8px 8px 0;
    }

    html[dir="rtl"] .rounded-right {
      border-radius: 8px 0 0 8px;
    }
  `;

  document.head.appendChild(style);
}

// ========================================
// INITIALIZATION
// ========================================

/**
 * Initialize i18n system
 */
function initI18n() {
  // Load saved language or detect browser language
  let savedLang = null;
  try {
    savedLang = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Could not read from localStorage', e);
  }

  const initialLang = savedLang || detectBrowserLanguage();

  // Set initial language
  setLanguage(initialLang);

  // Create language selector
  createLanguageSelector();

  // Update RTL selector position
  updateLanguageSelectorPosition();
}

/**
 * Update language selector position for RTL
 */
function updateLanguageSelectorPosition() {
  const selector = document.getElementById('swappo-language-selector');
  if (selector) {
    const isRTL = RTL_LANGUAGES.includes(currentLanguage);
    if (isRTL) {
      selector.classList.add('rtl');
    } else {
      selector.classList.remove('rtl');
    }
  }
}

// ========================================
// AUTO-INIT ON DOM READY
// ========================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initI18n);
} else {
  initI18n();
}

// ========================================
// EXPOSE PUBLIC API
// ========================================

// Make functions available globally
window.i18n = {
  t,
  setLanguage,
  getCurrentLang,
  detectBrowserLanguage,
  applyTranslations,
  translations,
};

// For CommonJS/ES6 Module support (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    t,
    setLanguage,
    getCurrentLang,
    detectBrowserLanguage,
    applyTranslations,
    translations,
  };
}
