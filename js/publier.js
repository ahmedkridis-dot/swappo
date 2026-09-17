// ========================
// PUBLIER.JS — Drop an Item page logic
// ========================

// Tiny i18n helper — falls back to the English literal if the runtime
// dictionary isn't loaded yet (cold reload race) so toast messages
// never silently turn into raw key strings.
function _pubT(key, fallback) {
  return (typeof t === 'function') ? t(key) : (fallback || key);
}

// SAFE — escape HTML for use in text AND attributes (blocks XSS H-4)
function _pubEsc(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, function(c) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
  });
}
// SAFE — only allow http(s), blob:, data:image, and relative URLs in image sources.
// blob: is needed for local preview thumbnails after client-side photo processing
// (URL.createObjectURL produces "blob:http://..." URLs).
function _pubSafeUrl(u) {
  if (!u) return '';
  var s = String(u).trim();
  if (/^(https?:\/\/|\/|\.\/|\.\.\/)/i.test(s)) return _pubEsc(s);
  if (/^blob:https?:\/\//i.test(s)) return _pubEsc(s);
  if (/^data:image\//i.test(s)) return _pubEsc(s);
  return '';
}

// ========================
// AUTH CHECK
// ========================
// iOS PWA / Safari cold start quirk: localStorage may be empty while the
// Supabase SDK is still rehydrating the JWT in the background. A one-shot
// synchronous check here was bouncing freshly-logged-in users to login /
// signup right after they arrived. We now:
//   1. Wait for SwappoAuth.isReady() (polled up to 3s)
//   2. Then ask for the actual session
//   3. Retry once after 600ms if still null — matches chat.html's pattern
// No redirect happens until both checks fail.
document.addEventListener('DOMContentLoaded', function () {
  (async function checkAuth() {
    async function _sessionUser() {
      // Wait for SwappoAuth to come online (capped at ~3s)
      var tries = 0;
      while (!(window.SwappoAuth && window.SwappoAuth.isReady && window.SwappoAuth.isReady()) && tries < 30) {
        await new Promise(function (r) { setTimeout(r, 100); });
        tries++;
      }
      if (!(window.SwappoAuth && window.SwappoAuth.isReady && window.SwappoAuth.isReady())) return null;
      try { return await window.SwappoAuth.getCurrentUser(); } catch (_) { return null; }
    }

    var u = await _sessionUser();
    if (!u) {
      // One more chance after the auth-restore window
      await new Promise(function (r) { setTimeout(r, 600); });
      u = await _sessionUser();
    }
    if (!u) {
      window.location.href = 'login.html?redirect=/pages/publier.html';
      return;
    }
    if (typeof updateNavbarForDemo === 'function') updateNavbarForDemo();
    // ?edit=<itemId> → prefill the wizard with an existing listing (owner only).
    if (typeof window.initEditMode === 'function') {
      try { await window.initEditMode(u); } catch (e) { console.warn('[publier] edit mode failed', e); }
    }
  })();
});

// ========================
// FORM STATE MANAGEMENT
// ========================
window.formState = {
  currentStep: 1,
  category: null,
  photos: [],
  details: {},
  isGiveaway: false
};

// ========================
// CATEGORY DATA
// ========================
// Vehicles: brand list depends on the vehicle type (repopulated on change).
window.VEHICLE_BRANDS = {
  'Car': ["Acura","Alfa Romeo","Aston Martin","Audi","Bentley","BMW","Bugatti","BYD","Cadillac","Changan","Chery","Chevrolet","Chrysler","Citroën","Cupra","Dacia","Daihatsu","Dodge","DS","Exeed","Ferrari","Fiat","Ford","Geely","Genesis","GMC","GWM / Haval","Honda","Hongqi","Hummer","Hyundai","Infiniti","Isuzu","JAC","Jaguar","Jeep","Jetour","Kia","Koenigsegg","Lada","Lamborghini","Land Rover","Lexus","Lincoln","Lotus","Lucid","Mahindra","Maserati","Maybach","Mazda","McLaren","Mercedes-Benz","MG","Mini","Mitsubishi","Nio","Nissan","Opel","Pagani","Peugeot","Polestar","Porsche","Proton","Ram","Range Rover","Renault","Rivian","Rolls-Royce","Saab","Seat","Skoda","Smart","Subaru","Suzuki","Tata","Tesla","Toyota","Volkswagen","Volvo","Xpeng","Zeekr","Other"],
  'Motorcycle': ["Aprilia","Bajaj","Benelli","BMW Motorrad","CFMoto","Ducati","Harley-Davidson","Honda","Husqvarna","Indian","Kawasaki","KTM","Kymco","MV Agusta","Piaggio","Royal Enfield","Suzuki","SYM","Triumph","TVS","Vespa","Yamaha","Other"],
  'Bicycle': ["Bianchi","BMC","Btwin / Decathlon","Cannondale","Canyon","Cervélo","Cube","Giant","Merida","Pinarello","Scott","Specialized","Trek","Other"],
  'E-Scooter': ["Segway-Ninebot","Xiaomi","Kaabo","Dualtron","Inokim","Apollo","Razor","Other"],
  'ATV / Buggy': ["Can-Am","Polaris","Yamaha","Honda","Kawasaki","CFMoto","Suzuki","Other"],
  'Boat / Jet Ski': ["Sea-Doo","Yamaha","Kawasaki","Gulf Craft","Bayliner","Sea Ray","Boston Whaler","Beneteau","Jeanneau","Other"],
  'Truck / Van': ["Toyota","Nissan","Mitsubishi","Isuzu","Ford","Chevrolet","GMC","Ram","Mercedes-Benz","Hyundai","Kia","JAC","Other"],
  'Other': ['Other']
};
window.VEHICLE_YEARS = ["2027","2026","2025","2024","2023","2022","2021","2020","2019","2018","2017","2016","2015","2014","2013","2012","2011","2010","2009","2008","2007","2006","2005","2004","2003","2002","2001","2000","1999","1998","1997","1996","1995","1994","1993","1992","1991","1990","1989","1988","1987","1986","1985","1984","1983","1982","1981","1980","1979","1978","1977","1976","1975","1974","1973","1972","1971","1970","Before 1970"];

// ── Size lists ─────────────────────────────────────────────
// Sizes depend on what is being sold: letter sizes for adult clothing,
// waist sizes for trousers, age sizes for kids, EU sizes for shoes.
window.ADULT_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size'];
window.WAIST_SIZES = ['W26', 'W27', 'W28', 'W29', 'W30', 'W31', 'W32', 'W33', 'W34', 'W36', 'W38', 'W40', 'W42', 'W44'];
window.KIDS_SIZES = ['0-3 months', '3-6 months', '6-12 months', '12-18 months', '18-24 months', '2-3 years', '3-4 years', '4-5 years', '5-6 years', '6-7 years', '7-8 years', '8-9 years', '9-10 years', '10-11 years', '11-12 years', '12-13 years', '13-14 years', '14+ years'];
function _euRange(a, b) { var out = []; for (var i = a; i <= b; i++) out.push('EU ' + i); return out; }
window.SHOE_SIZES_ADULT = _euRange(35, 50);
window.SHOE_SIZES_KIDS = _euRange(16, 40);
window.isShoeSubcategory = function (sub) { return /shoe|sneaker|boot|sandal/i.test(String(sub || '')); };
// Returns the size list for the current selection, or null when a size
// makes no sense (e.g. kids' toys) → the field is hidden.
window.sizeOptionsFor = function (category, gender, subcategory) {
  var kids = (category === 'kids') || /child|kid/i.test(String(gender || ''));
  if (isShoeSubcategory(subcategory)) return kids ? SHOE_SIZES_KIDS : SHOE_SIZES_ADULT;
  if (category === 'kids') return /cloth/i.test(String(subcategory || '')) ? KIDS_SIZES : null;
  if (kids) return KIDS_SIZES;
  if (/pants|jeans|trousers|shorts|skirt/i.test(String(subcategory || ''))) return ADULT_SIZES.concat(WAIST_SIZES);
  return ADULT_SIZES;
};

// Select fields where "Other" opens a free-text input so the real name is
// stored (a listing must never display "Other" as its brand).
window.OTHER_TEXT_FIELDS = ['brand', 'type'];
window.isOtherValue = function (v) { return /^(other|n\/a)$/i.test(String(v || '').trim()); };

window.categoryFields = {
  clothing: {
    gender: { label: 'Gender', type: 'select', options: ['Men', 'Women', 'Children', 'Unisex'], required: true },
    subcategory: { label: 'Subcategory', type: 'select', options: [], required: true },
    type: { label: 'Type', type: 'text', placeholder: 'e.g. T-Shirt, Dress, Sneakers' },
    brand: { label: 'Brand', type: 'text', placeholder: 'e.g. Nike, Zara' },
    size: { label: 'Size', type: 'select', options: window.ADULT_SIZES },
    condition: { label: 'Condition', type: 'select', options: ['New with tags', 'Like new', 'Good', 'Fair'], required: true },
    color: { label: 'Color', type: 'text', placeholder: 'e.g. Black, Blue' }
  },
  electronics: {
    type: { label: 'Type', type: 'select', options: ['Smartphone', 'Laptop', 'Tablet', 'Desktop PC', 'Monitor', 'TV', 'Console', 'Headphones / Earbuds', 'Speaker', 'Camera', 'Drone', 'Smart Watch', 'Printer', 'Router / Networking', 'Home Appliance', 'Accessories & Cables', 'Other'], required: true },
    brand: { label: 'Brand', type: 'select', options: ['Apple', 'Samsung', 'Huawei', 'Xiaomi', 'OnePlus', 'Oppo', 'Vivo', 'Realme', 'Honor', 'Nokia', 'Motorola', 'Google', 'Sony', 'LG', 'HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'MSI', 'Microsoft', 'Bose', 'JBL', 'Beats', 'Sennheiser', 'Marshall', 'Canon', 'Nikon', 'GoPro', 'DJI', 'Garmin', 'Fitbit', 'Anker', 'Logitech', 'Razer', 'Philips', 'Panasonic', 'TCL', 'Hisense', 'Dyson', 'Nespresso', 'Other'], required: true },
    model: { label: 'Model', type: 'text', placeholder: 'e.g. iPhone 15 Pro, Galaxy S24' },
    storage: { label: 'Storage', type: 'select', options: ['32 GB', '64 GB', '128 GB', '256 GB', '512 GB', '1 TB', '2 TB', 'Other'] },
    condition: { label: 'Condition', type: 'select', options: ['New', 'Like New', 'Good', 'Fair'], required: true },
    year: { label: 'Year', type: 'select', options: [] },
    color: { label: 'Color', type: 'select', options: [] }
  },
  furniture: {
    type: { label: 'Type', type: 'select', options: ['Sofa', 'Armchair', 'Coffee Table', 'Dining Table', 'Dining Set', 'Chair', 'Bed', 'Mattress', 'Wardrobe', 'Dresser', 'Desk', 'Office Chair', 'Cabinet', 'Shelves / Bookcase', 'TV Unit', 'Lamp / Lighting', 'Rug / Carpet', 'Curtains', 'Mirror', 'Kitchen Appliance', 'Home Decor', 'Outdoor / Garden', 'Other'], required: true },
    brand: { label: 'Brand', type: 'select', options: ['IKEA', 'Home Centre', 'Pan Emirates', 'Danube Home', '2XL', 'Homes r Us', 'Marina Home', 'THE One', 'Pottery Barn', 'West Elm', 'Crate & Barrel', 'Ashley', 'La-Z-Boy', 'Royal Furniture', 'Other'], required: true },
    model: { label: 'Model', type: 'text', placeholder: 'e.g. KIVIK 3-seat, MALM' },
    material: { label: 'Material', type: 'select', options: ['Wood', 'Metal', 'Fabric', 'Leather', 'Glass', 'Plastic', 'Rattan', 'Marble', 'Other'] },
    size: { label: 'Size', type: 'select', options: ['Small', 'Medium', 'Large', 'Extra Large'] },
    dimensions: { label: 'Dimensions', type: 'text', placeholder: 'e.g. 200 × 90 × 80 cm' },
    condition: { label: 'Condition', type: 'select', options: ['New', 'Like New', 'Good', 'Fair'], required: true },
    year: { label: 'Year', type: 'select', options: [] },
    color: { label: 'Color', type: 'select', options: [] }
  },
  vehicles: {
    type: { label: 'Type', type: 'select', options: Object.keys(window.VEHICLE_BRANDS), required: true },
    brand: { label: 'Brand', type: 'select', options: window.VEHICLE_BRANDS['Car'], required: true },
    model: { label: 'Model', type: 'text', placeholder: 'e.g. Wrangler Sahara, Land Cruiser GXR' },
    year: { label: 'Year', type: 'select', options: window.VEHICLE_YEARS },
    condition: { label: 'Condition', type: 'select', options: ['New', 'Like New', 'Good', 'Fair'], required: true },
    mileage_km: { label: 'Mileage (km)', type: 'number', placeholder: 'e.g. 85000' },
    fuel: { label: 'Fuel', type: 'select', options: ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'Other'] },
    transmission: { label: 'Transmission', type: 'select', options: ['Automatic', 'Manual'] },
    body_type: { label: 'Body type', type: 'select', options: ['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Convertible', 'Pickup', 'Van', 'Wagon', 'Other'] },
    regional_specs: { label: 'Regional specs', type: 'select', options: ['GCC', 'American', 'European', 'Japanese', 'Other'] },
    color: { label: 'Color', type: 'select', options: ['Black', 'White', 'Silver', 'Grey', 'Blue', 'Red', 'Green', 'Brown', 'Beige', 'Gold', 'Orange', 'Yellow', 'Other'] }
  },
  sports: {
    type: { label: 'Type', type: 'select', options: ['Bicycle', 'E-Bike', 'Scooter', 'Skateboard', 'Roller Skates', 'Gym Equipment', 'Weights & Dumbbells', 'Treadmill / Cardio Machine', 'Yoga & Pilates', 'Racket Sports', 'Football', 'Basketball', 'Golf', 'Swimming & Water Sports', 'Camping & Hiking', 'Fishing', 'Boxing & Martial Arts', 'Sportswear & Shoes', 'Other'], required: true },
    brand: { label: 'Brand', type: 'select', options: ['Decathlon', 'Nike', 'Adidas', 'Puma', 'Under Armour', 'Reebok', 'New Balance', 'Asics', 'Trek', 'Giant', 'Specialized', 'Cannondale', 'Scott', 'Merida', 'Wilson', 'Head', 'Babolat', 'Yonex', 'Callaway', 'TaylorMade', 'Speedo', 'Technogym', 'Bowflex', 'NordicTrack', 'Xiaomi', 'Segway-Ninebot', 'Other'], required: true },
    model: { label: 'Model', type: 'text', placeholder: 'e.g. Marlin 7, Air Zoom Pegasus' },
    size: { label: 'Size', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'] },
    condition: { label: 'Condition', type: 'select', options: ['New', 'Like New', 'Good', 'Fair'], required: true },
    year: { label: 'Year', type: 'select', options: [] },
    color: { label: 'Color', type: 'select', options: [] }
  },
  books: {
    type: { label: 'Type', type: 'select', options: ['Book', 'DVD/Blu-ray', 'Video Game', 'Vinyl', 'Board Game', 'Other'], required: true },
    brand: { label: 'Book Title', type: 'text', placeholder: 'e.g. Atomic Habits, The Alchemist' },
    model: { label: 'Author', type: 'text', placeholder: 'e.g. James Clear, Paulo Coelho' },
    condition: { label: 'Condition', type: 'select', options: ['New', 'Like new', 'Good', 'Fair'], required: true },
    year: { label: 'Year', type: 'select', options: ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2015', '2010', '2005', '2000', 'Before 2000'] },
    color: { label: 'Language', type: 'select', options: ['English', 'Arabic', 'French', 'Urdu', 'Russian', 'Hindi', 'Other'] }
  },
  kids: {
    gender: { label: 'Gender', type: 'select', options: ['Girl', 'Boy', 'Unisex'], required: true },
    subcategory: { label: 'Subcategory', type: 'select', options: ['Clothing', 'Shoes', 'Toys & Games', 'Strollers & Car Seats', 'Baby Furniture', 'Feeding & Bottles', 'Kids Books', 'Other'], required: true },
    age_range: { label: 'Age Range', type: 'select', options: ['0-6 months', '6-12 months', '1-2 years', '2-4 years', '4+ years'] },
    size: { label: 'Size', type: 'select', options: window.KIDS_SIZES },
    type: { label: 'Type', type: 'text', placeholder: 'e.g. Stroller, LEGO Set' },
    brand: { label: 'Brand', type: 'text', placeholder: 'e.g. Bugaboo, Fisher-Price' },
    condition: { label: 'Condition', type: 'select', options: ['New with tags', 'Like new', 'Good', 'Fair'], required: true },
    color: { label: 'Color', type: 'text', placeholder: 'e.g. Pink, Blue' }
  },
  bags_accessories: {
    zone: { label: 'Type', type: 'select', options: ['Bags', 'Accessories'], required: true },
    subcategory: { label: 'Subcategory', type: 'select', options: [], required: true },
    brand: { label: 'Brand', type: 'text', placeholder: 'e.g. Louis Vuitton, Herschel' },
    material: { label: 'Material', type: 'select', options: ['Leather', 'Fabric', 'Synthetic', 'Other'] },
    condition: { label: 'Condition', type: 'select', options: ['New with tags', 'Like new', 'Good', 'Fair'], required: true },
    color: { label: 'Color', type: 'text', placeholder: 'e.g. Brown, Black' }
  },
  gaming: {
    zone: { label: 'Zone', type: 'select', options: ['Consoles & Hardware', 'Games', 'Accessories'], required: true },
    subcategory: { label: 'Subcategory', type: 'select', options: [], required: true },
    platform: { label: 'Platform', type: 'select', options: ['PlayStation', 'Xbox', 'Nintendo', 'PC', 'Multi-platform'] },
    brand: { label: 'Brand', type: 'text', placeholder: 'e.g. Sony, Razer, Logitech' },
    condition: { label: 'Condition', type: 'select', options: ['New sealed', 'Like new', 'Good', 'Fair'], required: true },
    year: { label: 'Year', type: 'select', options: ['2026', '2025', '2024', '2023', '2022', '2021', '2020', 'Before 2020'] },
    color: { label: 'Color', type: 'text', placeholder: 'e.g. Black, White, RGB' }
  },
  plants: {
    type: { label: 'Type', type: 'select', options: ['Indoor Plant', 'Outdoor Plant', 'Succulent', 'Cactus', 'Herb', 'Flower', 'Tree', 'Seed/Bulb'] },
    brand: { label: 'Variety/Name', type: 'text', placeholder: 'e.g. Monstera, Snake Plant' },
    size: { label: 'Size', type: 'select', options: ['Small (< 20cm)', 'Medium (20-50cm)', 'Large (50-100cm)', 'Extra Large (> 100cm)'] },
    condition: { label: 'Condition', type: 'select', options: ['Thriving', 'Healthy', 'Needs care', 'Propagation/Cutting'], required: true },
    color: { label: 'Pot included?', type: 'select', options: ['Yes, with pot', 'No, plant only'] }
  },
  other: {
    type: { label: 'Type', type: 'select', options: ['Home Decor', 'Kitchen & Dining', 'Tools & DIY', 'Garden & Outdoor', 'Pet Supplies', 'Collectibles & Art', 'Musical Instruments', 'Beauty & Health', 'Office & Stationery', 'Party & Events', 'Other'], required: true },
    brand: { label: 'Brand', type: 'text', placeholder: 'e.g. Tefal, Bosch (optional)' },
    model: { label: 'Model', type: 'text', placeholder: 'Item name — e.g. Air fryer 5L' },
    condition: { label: 'Condition', type: 'select', options: ['New', 'Like New', 'Good', 'Fair'], required: true },
    year: { label: 'Year', type: 'select', options: [] },
    color: { label: 'Color', type: 'text', placeholder: 'e.g. Black, Silver' }
  }
};

window.categoryNames = {
  clothing: 'Clothing & Accessories',
  electronics: 'Electronics & Phones',
  furniture: 'Furniture & Home',
  vehicles: 'Vehicles',
  sports: 'Sports & Leisure',
  books: 'Books & Media',
  kids: 'Kids & Baby',
  bags_accessories: 'Bags & Accessories',
  gaming: 'Gaming & Consoles',
  plants: 'Plants',
  other: 'Other'
};


window.conditionOptions = ['New', 'Like New', 'Good', 'Fair'];
window.colorOptions = ['Black', 'White', 'Grey', 'Blue', 'Red', 'Green', 'Brown', 'Beige', 'Pink', 'Other'];
window.yearOptions = ["2027","2026","2025","2024","2023","2022","2021","2020","2019","2018","2017","2016","2015","2014","2013","2012","2011","2010","2009","2008","2007","2006","2005","2004","2003","2002","2001","2000","Before 2000"];
['electronics', 'furniture', 'sports', 'other'].forEach(function (k) {
  if (categoryFields[k].year && !categoryFields[k].year.options.length) categoryFields[k].year.options = window.yearOptions;
  if (categoryFields[k].color && categoryFields[k].color.type === 'select' && !categoryFields[k].color.options.length) categoryFields[k].color.options = window.colorOptions;
});

// ========================
// STEP NAVIGATION
// ========================
window.nextStep = function() {
  if (formState.currentStep === 1 && !formState.category) {
    Toast.show(_pubT('toast_pub_select_category_first', 'Please select a category first.'), 'warning');
    return;
  }
  if (formState.currentStep === 2 && !validateDetailsStep()) return;
  if (formState.currentStep === 3 && !photoGateOk()) {
    Toast.show(_pubT('photo_need_ok_cover', 'Your first photo must be a clear photo of the item before you can continue.'), 'warning');
    return;
  }
  if (formState.currentStep < 4) {
    formState.currentStep++;
    updateStepUI();
    scrollToTop();
  }
}

// Required selects/inputs of step 2 (marked *) + the emirate must be
// filled before moving on. Price stays optional: the product page has a
// dedicated "Swap or make an offer" state for unpriced listings.
window.validateDetailsStep = function () {
  var missing = [];
  document.querySelectorAll('#detailsContainer [data-field][required]').forEach(function (el) {
    var group = el.closest('.form-group');
    if (group && group.style.display === 'none') return;
    if (!String(el.value || '').trim()) missing.push(el);
  });
  var emirate = document.getElementById('item-emirate');
  if (emirate && !emirate.value) missing.push(emirate);
  document.querySelectorAll('.swp-field-missing').forEach(function (el) {
    el.classList.remove('swp-field-missing'); el.style.borderColor = '';
  });
  if (!missing.length) return true;
  missing.forEach(function (el) {
    el.classList.add('swp-field-missing');
    el.style.borderColor = '#FF4B55';
    el.addEventListener('change', function h() {
      el.style.borderColor = ''; el.classList.remove('swp-field-missing'); el.removeEventListener('change', h);
    });
  });
  Toast.show(_pubT('toast_pub_required_fields', 'Please fill in the required fields.'), 'warning');
  try { missing[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); missing[0].focus(); } catch (e) {}
  return false;
};

window.prevStep = function() {
  if (formState.currentStep > 1) {
    formState.currentStep--;
    updateStepUI();
    scrollToTop();
  }
}

window.updateStepUI = function() {
  var steps = document.querySelectorAll('.step');
  var sections = document.querySelectorAll('.step-section');

  steps.forEach(function(step, idx) {
    var stepNum = idx + 1;
    step.classList.remove('active', 'completed');
    if (stepNum < formState.currentStep) {
      step.classList.add('completed');
    } else if (stepNum === formState.currentStep) {
      step.classList.add('active');
    }
  });

  sections.forEach(function(s) { s.classList.remove('active'); });
  var sectionName = getSectionName(formState.currentStep);
  document.querySelector('[data-section="' + sectionName + '"]').classList.add('active');

  if (formState.currentStep === 4) {
    populateReview();
  }

  if (formState.currentStep === 3) {
    refreshPhotoGrid();
  }
}

window.getSectionName = function(stepNum) {
  var names = { 1: 'category', 2: 'details', 3: 'photos', 4: 'review' };
  return names[stepNum];
}

window.scrollToTop = function() {
  document.querySelector('.publish-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ========================
// STEP 1: CATEGORY SELECTION
// ========================
window.selectCategory = function(btn, category) {
  document.querySelectorAll('.category-btn').forEach(function(b) { b.classList.remove('selected'); });
  btn.classList.add('selected');
  formState.category = category;
  formState.details = {};
  formState.photos = [];
  var nextBtn = document.getElementById('btnNextStep1');
  if (nextBtn) nextBtn.disabled = false;
  renderDetailsFields();
  // UX (per Ahmed 2026-04-18): single click selects AND auto-advances to
  // step 2. Visual feedback kept short so the user sees the selection flash.
  if (window.__suppressAutoAdvance) return;
  setTimeout(function () {
    if (typeof window.nextStep === 'function') window.nextStep();
  }, 220);
}

// ========================
// STEP 2: DYNAMIC DETAILS FIELDS
// ========================
window.CLOTHING_SUBCATEGORIES = {
  male: ['T-Shirts & Polos', 'Shirts', 'Pants & Jeans', 'Shorts', 'Jackets & Coats', 'Suits & Blazers', 'Sweaters & Hoodies', 'Activewear', 'Underwear & Socks', 'Shoes', 'Other'],
  female: ['Tops & Blouses', 'Dresses', 'Skirts', 'Pants & Jeans', 'Shorts', 'Jackets & Coats', 'Sweaters & Hoodies', 'Activewear', 'Lingerie & Sleepwear', 'Shoes', 'Other'],
  kids: ['T-Shirts', 'Pants', 'Dresses', 'Jackets', 'Shoes', 'School Uniforms', 'Other'],
  unisex: ['T-Shirts & Polos', 'Pants & Jeans', 'Jackets & Coats', 'Sweaters & Hoodies', 'Activewear', 'Shoes', 'Other']
};

window.BAGS_ACCESSORIES_SUBCATEGORIES = {
  bags: ['Handbags', 'Backpacks', 'Crossbody Bags', 'Tote Bags', 'Clutches', 'Laptop Bags', 'Travel Bags', 'Wallets', 'Other'],
  accessories: ['Sunglasses', 'Watches', 'Belts', 'Scarves', 'Hats & Caps', 'Jewelry', 'Hair Accessories', 'Ties & Bowties', 'Other']
};

window.GAMING_SUBCATEGORIES = {
  consoles_hardware: ['PlayStation 5', 'PlayStation 4', 'Xbox Series X/S', 'Xbox One', 'Nintendo Switch', 'Gaming PC', 'VR Headset', 'Other'],
  games: ['PS5 Games', 'PS4 Games', 'Xbox Games', 'Nintendo Games', 'PC Games', 'Other'],
  accessories: ['Controllers', 'Headsets', 'Keyboards', 'Mice', 'Monitors', 'Chairs', 'Other']
};

// Map field keys to i18n keys
window.getFieldLabel = function(fieldKey, fallback) {
  var i18nMap = {
    type: 'detail_type', brand: 'detail_brand', model: 'detail_model',
    condition: 'detail_condition', year: 'detail_year', size: 'detail_size',
    color: 'detail_color', gender: 'detail_gender', subcategory: 'detail_subcategory',
    age_range: 'detail_age_range', material: 'detail_material', platform: 'detail_platform',
    zone: 'detail_zone', mileage_km: 'detail_mileage', fuel: 'detail_fuel',
    transmission: 'detail_transmission', body_type: 'detail_body_type',
    regional_specs: 'detail_regional_specs', description: 'detail_description',
    storage: 'detail_storage', dimensions: 'detail_dimensions'
  };
  var key = i18nMap[fieldKey];
  if (key && typeof t === 'function') return t(key);
  return fallback || fieldKey;
};

window.getSelectPlaceholder = function(label) {
  var prefix = (typeof t === 'function') ? t('field_select') : 'Select';
  return prefix + ' ' + label.toLowerCase();
};

window.renderDetailsFields = function() {
  var container = document.getElementById('detailsContainer');
  var cat = categoryFields[formState.category];
  if (!cat) { container.innerHTML = '<p>Select a category first.</p>'; return; }

  var html = '';

  var isNewFormat = !cat.types && !cat.brands;

  if (isNewFormat) {
    var fieldKeys = Object.keys(cat);
    fieldKeys.forEach(function(fieldKey) {
      var field = cat[fieldKey];
      var genericLabels = { type: 'Type', brand: 'Brand', model: 'Model', condition: 'Condition', year: 'Year', size: 'Size', color: 'Color', storage: 'Storage', dimensions: 'Dimensions', material: 'Material' };
      var label = (field.label && field.label !== genericLabels[fieldKey]) ? field.label : getFieldLabel(fieldKey, field.label);
      if (field.type === 'select') {
        html += buildSelectNew(fieldKey, label, field.options, field.required);
      } else if (field.type === 'text' || field.type === 'number') {
        var extra = field.type === 'number' ? ' inputmode="numeric" min="0" step="1"' : '';
        html += '<div class="form-group" data-field-group="' + fieldKey + '">' +
          '<label class="form-label">' + label + (field.required ? ' *' : '') + '</label>' +
          '<input type="' + field.type + '" class="form-input" name="' + fieldKey + '" data-field="' + fieldKey + '" placeholder="' + _pubEsc(field.placeholder || '') + '"' + extra + ' onchange="updateDetails(\'' + fieldKey + '\', this.value)"' + (field.required ? ' required' : '') + '>' +
          '</div>';
      }
    });
  } else {
    // Legacy {types, brands} format — no category uses it any more, kept
    // so an old config object can't blank the step.
    html += buildSelectNew('type', getFieldLabel('type', 'Type'), cat.types, true);
    html += buildSelectNew('brand', getFieldLabel('brand', 'Brand'), cat.brands, false);
    html += '<div class="form-group" data-field-group="model">' +
      '<label class="form-label">' + getFieldLabel('model', 'Model') + '</label>' +
      '<input type="text" class="form-input" name="model" data-field="model" placeholder="e.g. iPhone 15 Pro" onchange="updateDetails(\'model\', this.value)">' +
      '</div>';
    html += buildSelectNew('condition', getFieldLabel('condition', 'Condition'), conditionOptions, true);
    html += buildSelectNew('year', getFieldLabel('year', 'Year'), yearOptions, false);
    if (cat.showSize) {
      html += buildSelectNew('size', getFieldLabel('size', 'Size'), cat.sizeOptions, false);
    }
    html += buildSelectNew('color', getFieldLabel('color', 'Color'), colorOptions, false);
  }

  // Free-text description — every category.
  html += '<div class="form-group" style="grid-column:1 / -1;" data-field-group="description">' +
    '<label class="form-label" for="item-description">' + getFieldLabel('description', 'Description') + '</label>' +
    '<textarea id="item-description" class="form-input" name="description" data-field="description" rows="4" maxlength="2000" style="resize:vertical;min-height:96px;line-height:1.5;" placeholder="' + _pubT('publish_desc_placeholder', 'Anything a buyer should know: features, defects, what you\'d swap it for…') + '" oninput="updateDetails(\'description\', this.value)">' +
    _pubEsc(formState.details.description || '') + '</textarea></div>';

  container.innerHTML = html;

  // Vehicles: the brand list follows the vehicle type.
  var vehTypeSelect = document.querySelector('#detailsContainer select[data-field="type"]');
  if (vehTypeSelect && formState.category === 'vehicles') {
    vehTypeSelect.addEventListener('change', function() {
      var brands = (window.VEHICLE_BRANDS && window.VEHICLE_BRANDS[vehTypeSelect.value]) || window.VEHICLE_BRANDS['Other'];
      _rebuildSelect('brand', brands, getFieldLabel('brand', 'Brand'));
    });
  }

  var genderSelect = document.querySelector('#detailsContainer select[data-field="gender"]');
  var zoneSelect = document.querySelector('#detailsContainer select[data-field="zone"]');

  if (genderSelect && formState.category === 'clothing') {
    genderSelect.addEventListener('change', function() {
      var genderMap = { 'Men': 'male', 'Women': 'female', 'Children': 'kids', 'Unisex': 'unisex' };
      var genderKey = genderMap[genderSelect.value] || 'male';
      _rebuildSelect('subcategory', CLOTHING_SUBCATEGORIES[genderKey] || [], getFieldLabel('subcategory', 'Subcategory'));
      refreshSizeField();
    });
  }

  if (zoneSelect && formState.category === 'bags_accessories') {
    zoneSelect.addEventListener('change', function() {
      var zoneKey = zoneSelect.value.toLowerCase();
      _rebuildSelect('subcategory', BAGS_ACCESSORIES_SUBCATEGORIES[zoneKey] || [], getFieldLabel('subcategory', 'Subcategory'));
    });
  }

  if (zoneSelect && formState.category === 'gaming') {
    zoneSelect.addEventListener('change', function() {
      var zoneMap = { 'Consoles & Hardware': 'consoles_hardware', 'Games': 'games', 'Accessories': 'accessories' };
      var zoneKey = zoneMap[zoneSelect.value] || 'consoles_hardware';
      _rebuildSelect('subcategory', GAMING_SUBCATEGORIES[zoneKey] || [], getFieldLabel('subcategory', 'Subcategory'));
    });
  }

  refreshSizeField();
}

// Replace the options of a rendered select (dependent lists) and reset
// its value + any "Other" free-text companion.
window._rebuildSelect = function(name, options, label) {
  var sel = document.querySelector('#detailsContainer select[data-field="' + name + '"]');
  if (!sel) return null;
  var lbl = label || getFieldLabel(name, name);
  sel.innerHTML = '<option value="">' + _pubEsc(getSelectPlaceholder(lbl)) + '</option>' + (options || []).map(function(o) {
    return '<option value="' + _pubEsc(o) + '">' + _pubEsc(o) + '</option>';
  }).join('');
  var other = document.querySelector('#detailsContainer input[data-other-for="' + name + '"]');
  if (other) { other.style.display = 'none'; other.value = ''; }
  formState.details[name] = '';
  return sel;
};

// Clothing / kids: the size list follows the subcategory (shoes → EU
// sizes, trousers → waist, kids → age). Hidden when a size makes no sense.
window.refreshSizeField = function() {
  if (formState.category !== 'clothing' && formState.category !== 'kids') return;
  var group = document.querySelector('#detailsContainer [data-field-group="size"]');
  if (!group) return;
  var opts = sizeOptionsFor(formState.category, formState.details.gender, formState.details.subcategory);
  if (!opts) { group.style.display = 'none'; formState.details.size = ''; return; }
  group.style.display = '';
  var shoe = isShoeSubcategory(formState.details.subcategory);
  var label = shoe ? _pubT('detail_shoe_size', 'Shoe size (EU)') : getFieldLabel('size', 'Size');
  var labelEl = group.querySelector('.form-label');
  if (labelEl) labelEl.textContent = label;
  var prev = formState.details.size;
  var sel = group.querySelector('select');
  var current = sel ? Array.prototype.map.call(sel.options, function(o) { return o.value; }).slice(1) : [];
  if (current.join('|') !== opts.join('|')) {
    _rebuildSelect('size', opts, label);
    if (prev && opts.indexOf(prev) !== -1 && sel) { sel.value = prev; formState.details.size = prev; }
  }
};

window.buildSelectNew = function(name, label, options, required) {
  var optHtml = '<option value="">' + _pubEsc(getSelectPlaceholder(label)) + '</option>';
  (options || []).forEach(function(opt) {
    optHtml += '<option value="' + _pubEsc(opt) + '">' + _pubEsc(opt) + '</option>';
  });
  var allowOther = OTHER_TEXT_FIELDS.indexOf(name) !== -1;
  var html = '<div class="form-group" data-field-group="' + name + '">' +
    '<label class="form-label">' + label + (required ? ' *' : '') + '</label>' +
    '<select class="form-select" name="' + name + '" data-field="' + name + '" onchange="onSelectChange(\'' + name + '\', this)"' + (required ? ' required' : '') + '>' +
    optHtml +
    '</select>';
  if (allowOther) {
    html += '<input type="text" class="form-input" data-other-for="' + name + '" maxlength="60" autocomplete="off" style="display:none;margin-top:8px;" placeholder="' + _pubEsc(_pubT('publish_specify_other', 'Not in the list? Type it here')) + '" oninput="onOtherInput(\'' + name + '\', this)">';
  }
  return html + '</div>';
}

window.buildSelect = function(name, label, options) {
  return buildSelectNew(name, label, options, false);
}

// Select change: store the value; for brand/type, "Other" reveals a text
// input whose content replaces the literal "Other" in the listing.
window.onSelectChange = function(name, sel) {
  var val = sel.value;
  var other = document.querySelector('#detailsContainer input[data-other-for="' + name + '"]');
  if (other) {
    if (isOtherValue(val)) {
      other.style.display = 'block';
      // Brand: nothing typed = no brand (never store the literal "Other").
      // Type: "Other" is a legitimate answer.
      formState.details[name] = other.value.trim() || (name === 'brand' ? '' : val);
      try { other.focus(); } catch (e) {}
    } else {
      other.style.display = 'none';
      other.value = '';
      formState.details[name] = val;
    }
  } else {
    formState.details[name] = val;
  }
  if (name === 'subcategory' || name === 'gender') refreshSizeField();
};

window.onOtherInput = function(name, input) {
  var sel = document.querySelector('#detailsContainer select[data-field="' + name + '"]');
  formState.details[name] = input.value.trim() || (name === 'brand' ? '' : (sel ? sel.value : ''));
};

window.updateDetails = function(field, value) {
  formState.details[field] = value;
}

// Map any condition label (per-category wording) to the 4 stored codes.
window.normalizeCondition = function(label) {
  var v = String(label || '').trim().toLowerCase();
  if (!v) return 'good';
  if (['new', 'like_new', 'good', 'fair'].indexOf(v) !== -1) return v;
  if (/^like[\s_-]*new/.test(v) || v === 'thriving') return 'like_new';
  if (/^new/.test(v)) return 'new';
  if (/needs care|propagation|cutting|fair/.test(v)) return 'fair';
  return 'good';
};

// Edit mode: push stored values back into the rendered fields, in
// dependency order (gender/zone/type repopulate subcategory/brand/size).
window.applyDetailsToForm = function(details) {
  var order = ['gender', 'zone', 'type', 'subcategory'];
  var keys = order.concat(Object.keys(details).filter(function(k) { return order.indexOf(k) === -1; }));
  keys.forEach(function(k) {
    var val = details[k];
    if (val === undefined || val === null || String(val) === '') return;
    val = String(val);
    var el = document.querySelector('#detailsContainer [data-field="' + k + '"]');
    if (!el) { formState.details[k] = val; return; }
    if (el.tagName !== 'SELECT') {
      el.value = val;
      formState.details[k] = val;
      return;
    }
    var optValues = Array.prototype.map.call(el.options, function(o) { return o.value; });
    var match = optValues.indexOf(val) !== -1 ? val : null;
    if (!match && k === 'condition') {
      match = optValues.filter(function(o) { return o && normalizeCondition(o) === normalizeCondition(val); })[0] || null;
    }
    var other = document.querySelector('#detailsContainer input[data-other-for="' + k + '"]');
    if (match) {
      el.value = match;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      formState.details[k] = match;
    } else if (other && optValues.indexOf('Other') !== -1) {
      el.value = 'Other';
      el.dispatchEvent(new Event('change', { bubbles: true }));
      other.style.display = 'block';
      other.value = val;
      formState.details[k] = val;
    } else {
      formState.details[k] = val;
    }
  });
};

// ========================
// STEP 3: PHOTOS (real file upload — Phase 2)
// Per-slot state: formState.photoBlobs[idx] = { preview, processed, uploadedUrl }
// ========================
formState.photoBlobs = formState.photoBlobs || [];
var _pendingSlotIndex = null;

window.openPhotoPicker = function(index) {
  // A filled slot is removed with its × button (and reordered by drag /
  // ★) — a plain tap on the photo must not delete it.
  if (formState.photoBlobs[index]) return;
  _pendingSlotIndex = index;
  var input = document.getElementById('photoFileInput');
  if (input) { input.value = ''; input.click(); }
};

window.removePhoto = function(index) {
  if (formState.photoBlobs[index] && formState.photoBlobs[index].preview) {
    try { URL.revokeObjectURL(formState.photoBlobs[index].preview); } catch (e) {}
  }
  formState.photoBlobs[index] = null;
  refreshPhotoGrid();
};

// ── Order ────────────────────────────────────────────────
// Slot 0 is the cover (first photo in items.photos). Photos are kept
// contiguous: removing one shifts the rest left.
window.compactPhotos = function() {
  formState.photoBlobs = (formState.photoBlobs || []).filter(Boolean);
};
window.movePhoto = function(from, to) {
  compactPhotos();
  var arr = formState.photoBlobs;
  if (from === to || from < 0 || from >= arr.length) return;
  var entry = arr.splice(from, 1)[0];
  if (to > arr.length) to = arr.length;
  arr.splice(to, 0, entry);
  refreshPhotoGrid();
};
window.setMainPhoto = function(index) { movePhoto(index, 0); };

// Drag & drop between slots — mouse (HTML5 DnD) and touch (pointer events).
var _dragFrom = null;
function _slotIndexAt(x, y) {
  var el = document.elementFromPoint(x, y);
  var slot = el && el.closest ? el.closest('.photo-slot') : null;
  return slot ? parseInt(slot.getAttribute('data-index'), 10) : -1;
}
function _clearDropTargets() {
  document.querySelectorAll('.photo-slot.drop-target').forEach(function(s) { s.classList.remove('drop-target'); });
}
window.wirePhotoDrag = function(slot, idx) {
  slot.setAttribute('draggable', 'true');
  slot.addEventListener('dragstart', function(e) {
    _dragFrom = idx; slot.classList.add('dragging');
    try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(idx)); } catch (err) {}
  });
  slot.addEventListener('dragend', function() { _dragFrom = null; slot.classList.remove('dragging'); _clearDropTargets(); });
  // Touch: hold-and-drag with pointer events (HTML5 DnD doesn't fire on iOS)
  var pressTimer = null, dragging = false;
  slot.addEventListener('pointerdown', function(e) {
    if (e.pointerType === 'mouse') return;
    pressTimer = setTimeout(function() { dragging = true; _dragFrom = idx; slot.classList.add('dragging'); }, 180);
  });
  slot.addEventListener('pointermove', function(e) {
    if (!dragging) { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } return; }
    e.preventDefault();
    _clearDropTargets();
    var over = _slotIndexAt(e.clientX, e.clientY);
    if (over >= 0 && over !== idx) {
      var t = document.querySelector('.photo-slot[data-index="' + over + '"]');
      if (t) t.classList.add('drop-target');
    }
  });
  var endTouch = function(e) {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    if (!dragging) return;
    dragging = false;
    var over = _slotIndexAt(e.clientX, e.clientY);
    slot.classList.remove('dragging'); _clearDropTargets();
    var from = _dragFrom; _dragFrom = null;
    if (over >= 0 && from != null && over !== from) {
      var n = (formState.photoBlobs || []).filter(Boolean).length;
      movePhoto(from, Math.min(over, Math.max(n - 1, 0)));
    }
  };
  slot.addEventListener('pointerup', endTouch);
  slot.addEventListener('pointercancel', endTouch);
};
// Drop targets: every slot accepts a drop (also empty ones → append at the end)
document.addEventListener('DOMContentLoaded', function() {
  var grid = document.getElementById('photoGrid');
  if (!grid) return;
  grid.addEventListener('dragover', function(e) {
    if (_dragFrom == null) return;
    e.preventDefault();
    _clearDropTargets();
    var slot = e.target.closest && e.target.closest('.photo-slot');
    if (slot) slot.classList.add('drop-target');
  });
  grid.addEventListener('drop', function(e) {
    if (_dragFrom == null) return;
    e.preventDefault();
    var slot = e.target.closest && e.target.closest('.photo-slot');
    var to = slot ? parseInt(slot.getAttribute('data-index'), 10) : -1;
    var from = _dragFrom; _dragFrom = null; _clearDropTargets();
    if (to >= 0 && to !== from) {
      var n = (formState.photoBlobs || []).filter(Boolean).length;
      movePhoto(from, Math.min(to, Math.max(n - 1, 0)));
    }
  });
});

window.handlePhotoFiles = async function(e) {
  var files = Array.from(e.target.files || []);
  if (!files.length) return;

  if (!window.SwappoStorage) {
    Toast.show(_pubT('toast_pub_photo_module_failed', 'Photo module not loaded. Please refresh.'), 'error');
    return;
  }

  if (_photoLockUntil && Date.now() < _photoLockUntil) {
    var mins = Math.max(1, Math.ceil((_photoLockUntil - Date.now()) / 60000));
    _photoCheckMessage(_pubT('photo_rejects_locked', 'Only real photos of the item are accepted. Listings with fake photos close the account.') + ' ' + _pubT('photo_locked_wait', 'Photo uploads are paused for {minutes} min.').replace('{minutes}', mins));
    return;
  }

  // Start at the pending slot (or first empty), and fill forward
  var start = _pendingSlotIndex != null ? _pendingSlotIndex : 0;
  var maxSlots = SwappoStorage.MAX_FILES || 5;
  var totalFacesBlurred = 0;

  for (var i = 0; i < files.length; i++) {
    var slotIdx = -1;
    // Preferred slot first, then fill the next empties
    if (i === 0 && !formState.photoBlobs[start]) slotIdx = start;
    else {
      for (var j = 0; j < maxSlots; j++) {
        if (!formState.photoBlobs[j]) { slotIdx = j; break; }
      }
    }
    if (slotIdx === -1) {
      Toast.show(_pubT('toast_pub_max_photos_reached', 'Maximum photos reached.') + ' (' + maxSlots + ')', 'warning');
      break;
    }
    var slotEl = document.querySelector('.photo-slot[data-index="' + slotIdx + '"]');
    if (slotEl) slotEl.classList.add('uploading');
    try {
      // Privacy Shield — blur faces + reject phone/email/URL in the photo
      var safeInput = files[i];
      if (window.PhotoSafety) {
        try {
          var safety = await PhotoSafety.processImage(files[i], { blurFaces: true, redactText: false });
          if (safety.rejected) {
            Toast.show('🚫 ' + safety.rejectReason, 'error');
            if (slotEl) slotEl.classList.remove('uploading');
            continue;
          }
          if (safety.facesDetected > 0) totalFacesBlurred += safety.facesDetected;
          if (safety.blob) safeInput = safety.blob;
        } catch (safetyErr) {
          console.warn('[publier] PhotoSafety failed, uploading unmodified', safetyErr);
        }
      }
      var processed = await SwappoStorage.processFile(safeInput);
      // AI check (Edge Function check-photo): real item, right category, no
      // contact details. Blocking on "reject", never on an outage.
      if (slotEl) { slotEl.classList.add('checking'); slotEl.setAttribute('data-checking', _pubT('photo_checking', 'Checking…')); }
      var check = await checkPhotoWithAI(processed);
      if (slotEl) { slotEl.classList.remove('checking'); }
      if (check.verdict === 'reject') {
        try { URL.revokeObjectURL(processed.preview); } catch (e2) {}
        _photoRejected(check.reason, slotEl);
        continue;
      }
      _photoCheckMessage('');
      formState.photoBlobs[slotIdx] = {
        preview: processed.preview,
        processed: processed,
        uploadedUrl: null,
        verdict: check.verdict
      };
    } catch (err) {
      Toast.show(_pubT('toast_pub_could_not_read', 'Could not read this photo.') + ' (' + (files[i].name || 'image') + ')', 'error');
    } finally {
      if (slotEl) slotEl.classList.remove('uploading');
    }
    refreshPhotoGrid();
  }
  if (totalFacesBlurred > 0) {
    Toast.show('🛡️ ' + totalFacesBlurred + ' face' + (totalFacesBlurred > 1 ? 's' : '') + ' auto-blurred for your privacy.', 'info');
  }
  _pendingSlotIndex = null;
};

window.refreshPhotoGrid = function() {
  compactPhotos();
  var slots = document.querySelectorAll('.photo-slot');
  slots.forEach(function(slot, idx) {
    // Wipe non-progress children
    Array.from(slot.children).forEach(function(ch) {
      if (!ch.classList || !ch.classList.contains('slot-progress')) slot.removeChild(ch);
    });

    var entry = formState.photoBlobs[idx];
    if (entry && entry.preview) {
      slot.classList.add('filled');
      var img = document.createElement('img');
      img.alt = _pubT('toast_pub_image_alt', 'Photo') + ' ' + (idx + 1);
      img.src = entry.preview;
      slot.insertBefore(img, slot.firstChild);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'remove-photo';
      btn.setAttribute('aria-label', 'Remove photo');
      btn.innerHTML = '<i class="fas fa-times"></i>';
      btn.onclick = function(ev) {
        ev.stopPropagation();
        removePhoto(idx);
      };
      slot.insertBefore(btn, slot.firstChild);

      if (idx === 0) {
        var badge = document.createElement('span');
        badge.className = 'photo-main-badge';
        badge.textContent = '★ ' + _pubT('publish_photo_main', 'Main photo');
        slot.appendChild(badge);
      } else {
        var mk = document.createElement('button');
        mk.type = 'button';
        mk.className = 'make-main';
        mk.title = _pubT('publish_photo_make_main', 'Make main photo');
        mk.setAttribute('aria-label', mk.title);
        mk.textContent = '★';
        mk.onclick = function(ev) { ev.stopPropagation(); setMainPhoto(idx); };
        slot.appendChild(mk);
      }
      if (!slot.__dragWired) { wirePhotoDrag(slot, idx); slot.__dragWired = true; }
    } else {
      slot.classList.remove('filled');
      slot.removeAttribute('draggable');
      var ph = document.createElement('div');
      ph.className = 'photo-placeholder';
      ph.textContent = '+';
      slot.insertBefore(ph, slot.firstChild);
    }
  });

  // Keep formState.photos mirrored for legacy reviewPhotos rendering
  formState.photos = formState.photoBlobs.map(function(e) { return e ? e.preview : null; });
  // "?" marker on photos the check could not classify
  slots.forEach(function(slot, idx) {
    var e = formState.photoBlobs[idx];
    slot.classList.toggle('unsure', !!(e && e.verdict === 'unsure'));
  });
  updatePhotoGate();
};

// ── AI photo check ───────────────────────────────────────
// Verdict per photo: 'ok' | 'unsure' | 'reject'. Photos that were already
// online (edit mode) count as 'ok'. The cover (slot 0) must be 'ok' to
// leave the photo step; 'unsure' photos are allowed but flag the listing
// for review (needs_review).
var _photoRejectCount = 0;
var _photoLockUntil = 0;
function _blobToBase64(blob) {
  return new Promise(function(resolve, reject) {
    var r = new FileReader();
    r.onload = function() { resolve(String(r.result || '').replace(/^data:[^,]+,/, '')); };
    r.onerror = function() { reject(r.error || new Error('read failed')); };
    r.readAsDataURL(blob);
  });
}
window.checkPhotoWithAI = async function(processed) {
  if (!(window.db && window.db.functions)) return { verdict: 'unsure', reason: 'check_unavailable' };
  try {
    // The small JPEG thumbnail (≤600px) is enough for the verdict and keeps the call cheap.
    var blob = processed.ogBlob || processed.blob;
    var mime = processed.ogBlob ? 'image/jpeg' : (processed.mime || 'image/jpeg');
    var b64 = await _blobToBase64(blob);
    var res = await window.db.functions.invoke('check-photo', {
      body: { image_base64: b64, mime: mime, category: formState.category || 'other', item_type: formState.details.type || '' }
    });
    if (res && res.error) {
      var status = res.error.context && res.error.context.status;
      if (status === 429) return { verdict: 'reject', reason: 'rate_limited' };
      return { verdict: 'unsure', reason: 'check_unavailable' };
    }
    var d = res && res.data;
    if (!d || !d.verdict) return { verdict: 'unsure', reason: 'check_unavailable' };
    return { verdict: d.verdict, reason: d.reason || '', confidence: d.confidence };
  } catch (e) {
    console.warn('[check-photo] unavailable', e && e.message);
    return { verdict: 'unsure', reason: 'check_unavailable' };
  }
};
function _photoCheckMessage(msg) {
  var host = document.getElementById('photoCheckMsg');
  if (!host) return;
  host.hidden = !msg;
  host.textContent = msg || '';
}
function _photoRejected(reason, slotEl) {
  if (reason === 'rate_limited') { _photoCheckMessage(_pubT('photo_too_many_checks', 'Too many attempts, try again later.')); return; }
  var catKey = 'publish_cat_' + (formState.category === 'bags_accessories' ? 'bags' : formState.category);
  var catLabel = (typeof t === 'function') ? t(catKey) : (categoryNames[formState.category] || formState.category || '');
  var known = ['no_item', 'screenshot_or_stock', 'wrong_category', 'person', 'prohibited', 'contact_info', 'unclear'];
  var key = 'photo_rejected_' + (known.indexOf(reason) !== -1 ? reason : 'unclear');
  var msg = _pubT(key, 'This photo was not accepted.').replace('{category}', catLabel);
  _photoRejectCount++;
  if (_photoRejectCount >= 3) {
    _photoLockUntil = Date.now() + 10 * 60 * 1000;
    msg = _pubT('photo_rejects_locked', 'Only real photos of the item are accepted. Listings with fake photos close the account.') + ' ' + _pubT('photo_locked_wait', 'Photo uploads are paused for {minutes} min.').replace('{minutes}', 10);
  }
  _photoCheckMessage(msg);
  if (slotEl) {
    slotEl.classList.add('rejected');
    setTimeout(function() { slotEl.classList.remove('rejected'); }, 4000);
  }
  if (window.Toast) Toast.show(msg, 'error');
}
window.photoGateOk = function() {
  var entries = (formState.photoBlobs || []).filter(Boolean);
  if (!entries.length) return false;
  var cover = entries[0];
  var v = cover.verdict || (cover.uploadedUrl ? 'ok' : 'unsure');
  return v === 'ok';
};
window.updatePhotoGate = function() {
  var btn = document.getElementById('btnNextStep3');
  if (!btn) return;
  var ok = photoGateOk();
  btn.disabled = !ok;
  btn.style.opacity = ok ? '' : '0.5';
  btn.style.cursor = ok ? '' : 'not-allowed';
};

// ========================
// STEP 4: REVIEW
// ========================
window.populateReview = function() {
  var catKey = 'publish_cat_' + (formState.category === 'bags_accessories' ? 'bags' : formState.category);
  var catLabel = (typeof t === 'function') ? t(catKey) : (categoryNames[formState.category] || 'Other');
  document.getElementById('reviewCategory').textContent = catLabel;

  // SAFE: escape photo URLs + details values (H-4 fix)
  var photosHtml = '';
  for (var i = 0; i < 4; i++) {
    if (formState.photos[i]) {
      var safeSrc = _pubSafeUrl(formState.photos[i]);
      photosHtml += '<div class="review-photo-thumb">' + (safeSrc ? '<img src="' + safeSrc + '" alt="Photo">' : '') + '</div>';
    } else {
      photosHtml += '<div class="review-photo-thumb">+</div>';
    }
  }
  document.getElementById('reviewPhotos').innerHTML = photosHtml;

  var detailsHtml = '';
  var fieldOrder = ['gender', 'zone', 'platform', 'subcategory', 'age_range', 'type', 'brand', 'model', 'storage', 'material', 'condition', 'year', 'mileage_km', 'fuel', 'transmission', 'body_type', 'regional_specs', 'size', 'dimensions', 'color', 'description'];

  fieldOrder.forEach(function(key) {
    var val = formState.details[key];
    if (val) {
      detailsHtml += '<div class="review-section">' +
        '<div class="review-label">' + _pubEsc(getFieldLabel(key, key)) + '</div>' +
        '<div class="review-value">' + _pubEsc(val) + '</div>' +
        '</div>';
    }
  });
  document.getElementById('reviewDetails').innerHTML = detailsHtml;

  // Price — read from #item-price input and reflect in review
  var priceInput = document.getElementById('item-price');
  var priceValue = priceInput ? parseInt(priceInput.value) || 0 : 0;
  var priceEl = document.getElementById('reviewPriceValue');
  if (priceEl) {
    if (formState.isGiveaway) {
      priceEl.textContent = _pubT('toast_pub_free_giveaway', 'Free (Giveaway)');
    } else if (priceValue > 0) {
      priceEl.textContent = priceValue + ' AED';
    } else {
      priceEl.textContent = '— AED';
    }
  }
}

// ========================
// GIVEAWAY TOGGLE
// ========================
window.toggleGiveaway = function() {
  var cb = document.getElementById('giveawayCheckbox');
  cb.checked = !cb.checked;
  formState.isGiveaway = cb.checked;
  document.getElementById('giveawayOption').classList.toggle('checked', cb.checked);
  // Show/hide the Gift Box wrapper alongside the giveaway toggle.
  var giftBoxWrap = document.getElementById('giftBoxWrap');
  if (giftBoxWrap) giftBoxWrap.style.display = cb.checked ? 'block' : 'none';
  // Reset gift-box state if the user turns giveaway off.
  if (!cb.checked) {
    var gbCb = document.getElementById('giftBoxCheckbox');
    if (gbCb && gbCb.checked) { gbCb.checked = false; window.toggleGiftBoxPicker(); }
  }
};

// ── Gift Box item picker ─────────────────────────────────
// Loads the user's OTHER available items (status='available', not already
// in a box) and lets them multi-select which ones bundle together with
// the item being published as a single Gift Box.
window._giftBoxSelected = new Set();
window.toggleGiftBoxPicker = async function () {
  var cb = document.getElementById('giftBoxCheckbox');
  var panel = document.getElementById('giftBoxPicker');
  if (!cb || !panel) return;
  if (!cb.checked) {
    panel.style.display = 'none';
    window._giftBoxSelected.clear();
    _refreshGiftBoxSummary();
    return;
  }
  panel.style.display = 'block';
  // Lazy-load user's items
  try {
    var user = null;
    if (window.SwappoAuth && window.SwappoAuth.isReady()) {
      user = await window.SwappoAuth.getCurrentUser();
    }
    if (!user) return;
    var items = await window.SwappoItems.getByUser(user.id);
    items = (items || []).filter(function (i) {
      return i.status === 'available' && !i.box_id;
    });
    var grid = document.getElementById('giftBoxItemsGrid');
    var empty = document.getElementById('giftBoxPickerEmpty');
    if (!items.length) {
      grid.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    grid.innerHTML = items.map(function (it) {
      var photo = (it.photos && it.photos[0]) || '';
      var title = ((it.brand || '') + ' ' + (it.model || '')).trim() || it.type;
      return '<div class="gb-tile" data-id="' + it.id + '" onclick="toggleGiftBoxItem(this)" style="position:relative;border:2px solid #E5E7EB;border-radius:10px;overflow:hidden;cursor:pointer;aspect-ratio:1;background:#fff;">' +
        (photo ? '<img src="' + photo + '" style="width:100%;height:100%;object-fit:cover;">' : '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:28px;background:#F3F4F6;">📦</div>') +
        '<div style="position:absolute;top:4px;right:4px;width:20px;height:20px;background:#fff;border:2px solid #10B981;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#10B981;">☐</div>' +
        '<div style="position:absolute;bottom:0;left:0;right:0;padding:4px 6px;background:linear-gradient(transparent, rgba(0,0,0,0.7));color:#fff;font-size:10px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + title + '</div>' +
      '</div>';
    }).join('');
  } catch (e) { console.warn('[gift-box] picker load failed', e && e.message); }
};

window.toggleGiftBoxItem = function (el) {
  var id = el.getAttribute('data-id');
  if (window._giftBoxSelected.has(id)) {
    window._giftBoxSelected.delete(id);
    el.style.borderColor = '#E5E7EB';
    var cb = el.querySelector('div[style*="border-radius:4px"]');
    if (cb) { cb.textContent = '☐'; cb.style.background = '#fff'; cb.style.color = '#10B981'; }
  } else {
    window._giftBoxSelected.add(id);
    el.style.borderColor = '#10B981';
    var cb2 = el.querySelector('div[style*="border-radius:4px"]');
    if (cb2) { cb2.textContent = '✓'; cb2.style.background = '#10B981'; cb2.style.color = '#fff'; }
  }
  _refreshGiftBoxSummary();
};

function _refreshGiftBoxSummary() {
  var el = document.getElementById('giftBoxSummary');
  if (!el) return;
  var n = window._giftBoxSelected.size;
  if (n === 0) {
    el.innerHTML = '<span style="color:#6B7280;font-style:italic;">Pick at least 1 other item to bundle.</span>';
  } else {
    el.innerHTML = '📦 <strong>' + (n + 1) + ' items</strong> will ship together as a single Gift Box (this one + ' + n + ' selected).';
  }
}

// Where to go after a successful publish. A caller can pass
// ?return=<page in /pages/> (e.g. the Give-to-Unlock popup on a gift:
// publier.html?return=product.html%3Fid%3D…) so the user lands back on the
// gift to claim it. Relative, same-directory pages only — anything else
// falls back to the Swap Market.
window._afterPublishHref = function() {
  try {
    var target = new URLSearchParams(window.location.search).get('return') || '';
    if (!target || /^([a-z]+:|\/|\\|\.\.)/i.test(target)) return 'catalogue.html';
    var u = new URL(target, window.location.href);
    if (u.origin !== window.location.origin || !/^\/pages\/[a-z0-9_-]+\.html$/i.test(u.pathname)) return 'catalogue.html';
    return u.pathname.split('/').pop() + u.search + u.hash;
  } catch (e) { return 'catalogue.html'; }
};

// ========================
// PUBLISH
// ========================
window.publishItem = async function(e) {
  console.log('[publish] clicked — entering publishItem');
  if (e && e.preventDefault) e.preventDefault();

  try {
    // Auth check — prefer Supabase, fall back to mirror for dev
    var user = null;
    var supabaseReady = !!(window.SwappoAuth && window.SwappoAuth.isReady());
    console.log('[publish] SwappoAuth ready?', supabaseReady);
    if (supabaseReady && window.db) {
      // Use getSession() — LOCAL read of cached JWT, no network call.
      // getUser() makes a network roundtrip to verify token and can hang
      // forever when that endpoint is slow/blocked. Guard with a 3s timeout
      // just in case getSession ever stalls (it shouldn't — it's sync-ish).
      try {
        var sessionRes = await Promise.race([
          window.db.auth.getSession(),
          new Promise(function(resolve) {
            setTimeout(function() { resolve({ data: { session: null }, error: new Error('timeout') }); }, 3000);
          })
        ]);
        user = sessionRes && sessionRes.data && sessionRes.data.session
          ? sessionRes.data.session.user
          : null;
        console.log('[publish] supabase session user:', user ? user.email : 'null');
      } catch (e) {
        console.warn('[publish] getSession error:', e.message);
      }
    }
    // NOTE: intentionally NO fallback to the mirror here. The mirror stores a
    // fake/mirrored user in localStorage whose id may not match any
    // auth.users row. Using it for RLS-gated writes (Storage upload,
    // items.insert) will be rejected by Postgres anyway ("new row violates
    // row-level security policy"), but the request will first hit the network
    // and fail silently. Safer to require a real Supabase session.
    if (!user) {
      console.warn('[publish] no Supabase session → redirecting to login');
      Toast.show(_pubT('toast_pub_signin_required', 'Please sign in to publish.'), 'warning');
      setTimeout(function() {
        window.location.href = 'login.html?redirect=/pages/publier.html';
      }, 800);
      return;
    }

    if (window.__swpBanned) {
      Toast.show(_pubT('banned_banner', 'This account has been closed. Contact contact@swappo.ae.'), 'error');
      return;
    }
    if (!formState.category) {
      console.warn('[publish] no category selected');
      Toast.show(_pubT('toast_pub_select_category', 'Please select a category.'), 'warning');
      return;
    }

    var entries = (formState.photoBlobs || []).filter(function(p) { return p && (p.processed || p.uploadedUrl); });
    console.log('[publish] photo entries count:', entries.length);
    if (!entries.length) {
      Toast.show(_pubT('toast_pub_add_photo', 'Please add at least one photo.'), 'warning');
      return;
    }

    var btn = document.getElementById('btnPublish');
    if (!btn) { console.error('[publish] #btnPublish not found in DOM'); return; }
    var isEdit = !!formState.editId;
    var restoreBtn = function() {
      btn.innerHTML = isEdit
        ? '<i class="fas fa-check"></i> ' + _pubT('publish_save_btn', 'Save changes')
        : 'Publish <i class="fas fa-arrow-right"></i>';
      btn.disabled = false;
      btn.style.opacity = '1';
    };
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading photos...';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    // --- 1. Upload photos to Supabase Storage ---
    console.log('[publish] starting photo upload, SwappoStorage ready?', !!window.SwappoStorage);
    var photoUrls = [];
    try {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].uploadedUrl) { photoUrls.push(entries[i].uploadedUrl); continue; } // kept from the existing listing
        console.log('[publish] uploading photo', i + 1, 'of', entries.length);
        var url = await window.SwappoStorage.uploadOne(
          { _processed: entries[i].processed, type: entries[i].processed.mime },
          user.id
        );
        photoUrls.push(url);
        console.log('[publish] photo uploaded →', url);
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading ' + (i + 1) + '/' + entries.length + '...';
      }
    } catch (err) {
      console.error('[publish] upload failed:', err);
      Toast.show(_pubT('toast_pub_upload_failed', 'Upload failed') + ': ' + (err.message || 'unknown error'), 'error');
      restoreBtn();
      return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (isEdit ? 'Saving...' : 'Publishing...');

    // --- 2. Build item payload ---
    var priceEl = document.getElementById('item-price');
    var emirateEl = document.getElementById('item-emirate');

    // Record coordinates: prefer the user's live GPS; fall back to the
    // center of the chosen emirate so the map always has something to plot.
    // Never store 0/0 (that's the Atlantic).
    var emirateChoice = (emirateEl && emirateEl.value) || user.emirate || 'Dubai';
    var EMIRATE_CENTERS = {
      'Dubai':     { lat: 25.2048, lng: 55.2708 },
      'Abu Dhabi': { lat: 24.4539, lng: 54.3773 },
      'Sharjah':   { lat: 25.3463, lng: 55.4209 },
      'Ajman':     { lat: 25.4052, lng: 55.5136 },
      'RAK':       { lat: 25.7895, lng: 55.9432 },
      'Fujairah':  { lat: 25.1288, lng: 56.3264 },
      'UAQ':       { lat: 25.5647, lng: 55.5553 }
    };
    // Swappo.userLat / userLng are getter FUNCTIONS defined in app.js
    // (Swappo.userLat = () => userLat). Calling Number() on the function
    // reference itself returned NaN, so every item fell through to the
    // emirate-center fallback — all Dubai items ended up pinned at
    // (25.2048, 55.2708). Invoke with () to get the live GPS value.
    var liveLat = (window.Swappo && typeof Swappo.userLat === 'function') ? Number(Swappo.userLat()) : null;
    var liveLng = (window.Swappo && typeof Swappo.userLng === 'function') ? Number(Swappo.userLng()) : null;
    var fallback = EMIRATE_CENTERS[emirateChoice] || EMIRATE_CENTERS['Dubai'];
    var finalLat = (liveLat && !isNaN(liveLat)) ? liveLat : fallback.lat;
    var finalLng = (liveLng && !isNaN(liveLng)) ? liveLng : fallback.lng;

    var itemData = {
      category: formState.category,
      subcategory: formState.details.subcategory || '',
      type: formState.details.type || formState.category,
      brand: formState.details.brand || '',
      model: formState.details.model || '',
      condition: normalizeCondition(formState.details.condition),
      year: formState.details.year ? String(formState.details.year) : String(new Date().getFullYear()),
      size: formState.details.size || '',
      color: formState.details.color || '',
      photos: photoUrls,
      is_giveaway: !!formState.isGiveaway,
      price: parseInt(priceEl ? priceEl.value : '0') || 0,
      emirate: emirateChoice,
      city: user.city || 'Dubai',
      lat: finalLat,
      lng: finalLng,
      description: (formState.details.description || '').trim().slice(0, 2000) || null,
      // A photo the AI check could not classify → the listing goes to Ahmed's review queue.
      needs_review: entries.some(function(e) { return e.verdict === 'unsure'; }),
      // Everything that has no dedicated column (gender, storage, material,
      // vehicle specs…) is kept in specs and rendered by the product page.
      specs: (function() {
        var CORE = ['subcategory', 'type', 'brand', 'model', 'condition', 'year', 'size', 'color', 'description'];
        var s = {};
        Object.keys(formState.details).forEach(function(k) {
          if (CORE.indexOf(k) !== -1) return;
          var v = formState.details[k];
          if (v === undefined || v === null || String(v).trim() === '') return;
          s[k] = (k === 'mileage_km') ? Number(v) : String(v).trim().slice(0, 120);
        });
        return s;
      })()
    };
    console.log('[publish] item payload built:', itemData);

    // --- 3. Insert via Supabase, fall back to Demo in dev ---
    console.log('[publish] SwappoItems available?', !!window.SwappoItems);
    var result = null;
    if (window.SwappoItems) {
      result = isEdit
        ? await window.SwappoItems.update(formState.editId, itemData)
        : await window.SwappoItems.create(itemData);
    }
    console.log('[publish] ' + (isEdit ? 'update' : 'insert') + ' result:', result);

    if (!result || !result.success) {
      if (result && result.locked) {
        Toast.show(_pubT('toast_pub_locked', 'This listing is locked while a deal is in progress. Cancel or complete the deal first.'), 'warning');
      } else {
        Toast.show(_pubT(isEdit ? 'toast_pub_save_failed' : 'toast_pub_publish_failed', isEdit ? 'Could not save changes' : 'Publish failed') + ': ' + ((result && result.error) || 'unknown'), 'error');
      }
      restoreBtn();
      return;
    }

    if (isEdit) {
      Toast.show(_pubT('toast_pub_saved', 'Listing updated! ✅'), 'success');
      setTimeout(function() {
        window.location.href = 'product.html?id=' + encodeURIComponent(formState.editId);
      }, 900);
      return;
    }

    // ── Gift Box bundling ──────────────────────────────
    // If the user ticked "Bundle into a Gift Box" AND picked at least
    // one other item, wrap everything (this new item + the selected
    // existing ones) into a single Gift Box via the create_gift_box RPC.
    var giftBoxCb = document.getElementById('giftBoxCheckbox');
    var shouldBundle = !!(giftBoxCb && giftBoxCb.checked && formState.isGiveaway && window._giftBoxSelected && window._giftBoxSelected.size > 0);
    if (shouldBundle) {
      try {
        var newItemId = result && result.item && result.item.id;
        if (newItemId) {
          var allIds = [newItemId].concat(Array.from(window._giftBoxSelected));
          var boxResp = await window.db.rpc('create_gift_box', {
            p_item_ids: allIds,
            p_title: null,
            p_description: null
          });
          if (boxResp.error) {
            console.warn('[publish] gift-box bundle failed', boxResp.error);
            Toast.show(_pubT('toast_pub_giftbox_failed', 'Item published, but Gift Box bundling failed') + ': ' + boxResp.error.message, 'warning');
          } else {
            Toast.show(_pubT('toast_pub_giftbox_success', 'Gift Box published! 🎁') + ' (' + allIds.length + ')', 'success');
          }
        }
      } catch (e) { console.warn('[publish] gift-box error', e); }
    } else {
      Toast.show(_pubT('toast_pub_published', 'Item published! \uD83C\uDF89'), 'success');
    }
    setTimeout(function() {
      window.location.href = _afterPublishHref();
    }, 1200);

  } catch (outerErr) {
    console.error('[publish] fatal error in publishItem:', outerErr);
    try { Toast.show(_pubT('toast_pub_generic_error', 'Something went wrong') + ': ' + (outerErr.message || outerErr), 'error'); } catch(e){}
    var btn = document.getElementById('btnPublish');
    if (btn) {
      btn.innerHTML = formState.editId
        ? '<i class="fas fa-check"></i> ' + _pubT('publish_save_btn', 'Save changes')
        : 'Publish <i class="fas fa-arrow-right"></i>';
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  }
};

// ========================
// EDIT MODE  (publier.html?edit=<itemId>)
// ========================
// The owner reuses the same wizard to change price, details or photos.
// Blocked (client + DB trigger, migration 033) while a swap is pending or
// accepted on the item — the counterparty must see what they agreed on.
window.initEditMode = async function(user) {
  var params = new URLSearchParams(window.location.search);
  var editId = params.get('edit');
  if (!editId || !window.SwappoItems) return;

  var goBack = function(href) { setTimeout(function() { window.location.href = href; }, 1400); };
  var item = await window.SwappoItems.getById(editId);
  if (!item) {
    Toast.show(_pubT('toast_pub_not_found', 'Listing not found.'), 'error');
    goBack('profile.html');
    return;
  }
  if (!user || item.user_id !== user.id) {
    Toast.show(_pubT('toast_pub_not_owner', 'You can only edit your own listings.'), 'error');
    goBack('product.html?id=' + encodeURIComponent(editId));
    return;
  }
  var editable = await window.SwappoItems.canEdit(editId);
  if (!editable) {
    Toast.show(_pubT('toast_pub_locked', 'This listing is locked while a deal is in progress. Cancel or complete the deal first.'), 'warning');
    goBack('product.html?id=' + encodeURIComponent(editId));
    return;
  }

  formState.editId = editId;
  formState.editItem = item;

  // Copy: titles + CTA
  var title = ((item.brand || '') + ' ' + (item.model || '')).trim() || item.type || item.category || '';
  var h = document.querySelector('[data-section="category"] .step-title');
  var sub = document.querySelector('[data-section="category"] .step-subtitle');
  if (h) h.textContent = _pubT('publish_edit_title', 'Edit your listing');
  if (sub) sub.textContent = _pubT('publish_edit_subtitle', 'Update the details, price or photos. Changes go live immediately.');
  var btn = document.getElementById('btnPublish');
  if (btn) btn.innerHTML = '<i class="fas fa-check"></i> ' + _pubT('publish_save_btn', 'Save changes');
  var form = document.getElementById('publishForm');
  if (form && !document.getElementById('editBanner')) {
    var banner = document.createElement('div');
    banner.id = 'editBanner';
    banner.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:var(--primary-light,#E6F7F8);border:1px solid var(--primary,#09B1BA);border-radius:12px;padding:12px 16px;margin-bottom:20px;font-size:14px;color:var(--text,#171717);';
    banner.innerHTML = '<span>✏️ <strong>' + _pubT('publish_edit_title', 'Edit your listing') + '</strong>' + (title ? ' — ' + _pubEsc(title) : '') + '</span>' +
      '<a href="product.html?id=' + _pubEsc(editId) + '" style="color:var(--primary-dark,#078A91);font-weight:600;text-decoration:none;white-space:nowrap;">' + _pubT('publish_edit_cancel', 'Cancel') + '</a>';
    form.parentNode.insertBefore(banner, form);
  }
  // Gift Box bundling is a publish-time feature only.
  var gb = document.getElementById('giftBoxWrap');
  if (gb) gb.style.display = 'none';

  // Category (no auto-advance) → fields → values
  window.__suppressAutoAdvance = true;
  var catBtn = document.querySelector('.category-btn[data-category="' + item.category + '"]');
  if (catBtn) selectCategory(catBtn, item.category);
  else { formState.category = item.category; renderDetailsFields(); }
  window.__suppressAutoAdvance = false;

  var specs = (item.specs && typeof item.specs === 'object') ? item.specs : {};
  var details = {};
  if (specs.gender) details.gender = specs.gender;
  if (specs.zone) details.zone = specs.zone;
  if (item.type && item.type !== item.category) details.type = item.type;
  if (item.subcategory) details.subcategory = item.subcategory;
  if (item.brand) details.brand = item.brand;
  if (item.model) details.model = item.model;
  Object.keys(specs).forEach(function(k) { if (k !== 'gender' && k !== 'zone' && specs[k] != null) details[k] = specs[k]; });
  if (item.condition) details.condition = item.condition;
  if (item.year) details.year = item.year;
  if (item.size) details.size = item.size;
  if (item.color) details.color = item.color;
  applyDetailsToForm(details);
  formState.details.description = item.description || '';
  var desc = document.getElementById('item-description');
  if (desc) desc.value = formState.details.description;

  var priceEl = document.getElementById('item-price');
  if (priceEl) priceEl.value = item.price > 0 ? String(Math.round(item.price)) : '';
  var emirateEl = document.getElementById('item-emirate');
  if (emirateEl && item.emirate) emirateEl.value = item.emirate;

  var cb = document.getElementById('giveawayCheckbox');
  if (cb && !!item.is_giveaway !== cb.checked) toggleGiveaway();
  if (gb) gb.style.display = 'none';

  var slots = document.querySelectorAll('.photo-slot').length || 5;
  formState.photoBlobs = [];
  (item.photos || []).slice(0, slots).forEach(function(url, i) {
    formState.photoBlobs[i] = { preview: url, processed: null, uploadedUrl: url, verdict: 'ok' };
  });
  refreshPhotoGrid();

  formState.currentStep = 2;
  updateStepUI();
};
