// ========================
// PUBLIER.JS — Drop an Item page logic
// ========================

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
document.addEventListener('DOMContentLoaded', function() {
  var user = DemoAuth.getCurrentUser();
  if (!user) {
    window.location.href = 'login.html?redirect=/pages/publier.html';
    return;
  }
  updateNavbarForDemo();
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
window.categoryFields = {
  clothing: {
    gender: { label: 'Gender', type: 'select', options: ['Men', 'Women', 'Children', 'Unisex'], required: true },
    subcategory: { label: 'Subcategory', type: 'select', options: [], required: true },
    type: { label: 'Type', type: 'text', placeholder: 'e.g. T-Shirt, Dress' },
    brand: { label: 'Brand', type: 'text', placeholder: 'e.g. Nike, Zara' },
    size: { label: 'Size', type: 'select', options: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size'] },
    condition: { label: 'Condition', type: 'select', options: ['New with tags', 'Like new', 'Good', 'Fair'], required: true },
    color: { label: 'Color', type: 'text', placeholder: 'e.g. Black, Blue' }
  },
  electronics: {
    types: ['Smartphone', 'Laptop', 'Tablet', 'Console', 'Headphones', 'Camera', 'Smart Watch', 'Speaker', 'Other'],
    brands: ['Apple', 'Samsung', 'Sony', 'HP', 'Dell', 'Lenovo', 'Google', 'Other'],
    showSize: false
  },
  furniture: {
    types: ['Sofa', 'Table', 'Chair', 'Bed', 'Desk', 'Cabinet', 'Shelves', 'Lamp', 'Other'],
    brands: ['IKEA', 'West Elm', 'Pottery Barn', 'Ashley', 'Home Centre', 'Other'],
    showSize: true,
    sizeOptions: ['Small', 'Medium', 'Large', 'Extra Large']
  },
  vehicles: {
    types: ['Car', 'Motorcycle', 'Bicycle', 'Scooter', 'ATV', 'Boat', 'Other'],
    brands: ['Toyota', 'Nissan', 'Honda', 'BMW', 'Mercedes', 'Hyundai', 'Kia', 'Porsche', 'Other'],
    showSize: false
  },
  sports: {
    types: ['Bicycle', 'Skateboard', 'Snowboard', 'Skis', 'Roller Skates', 'Scooter', 'Gym Equipment', 'Racket', 'Other'],
    brands: ['Decathlon', 'Trek', 'Giant', 'Specialized', 'Nike', 'Adidas', 'Other'],
    showSize: true,
    sizeOptions: ['S', 'M', 'L', 'XL', 'One size']
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
    subcategory: { label: 'Subcategory', type: 'select', options: ['Clothing', 'Toys & Games', 'Strollers & Car Seats', 'Baby Furniture', 'Feeding & Bottles', 'Kids Books'], required: true },
    age_range: { label: 'Age Range', type: 'select', options: ['0-6 months', '6-12 months', '1-2 years', '2-4 years', '4+ years'] },
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
    types: ['Home Decor', 'Kitchen', 'Tools', 'Garden', 'Pet Supplies', 'Collectibles', 'Other'],
    brands: ['N/A', 'Other'],
    showSize: false
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

// Unsplash placeholder photos by category
window.categoryPhotos = {
  clothing:    ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1434389677669-e08b4cda3a4a?w=300&h=400&fit=crop'],
  electronics: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=400&fit=crop'],
  furniture:   ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=300&h=400&fit=crop'],
  vehicles:    ['https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300&h=400&fit=crop'],
  sports:      ['https://images.unsplash.com/photo-1461896836934-bd45ba688509?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=300&h=400&fit=crop'],
  books:       ['https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=300&h=400&fit=crop'],
  kids:        ['https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1566004100477-7b3d6be5f4f2?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?w=300&h=400&fit=crop'],
  bags_accessories: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&h=400&fit=crop'],
  gaming:          ['https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=300&h=400&fit=crop'],
  plants:      ['https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1501004318855-cd2e69e37b83?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=300&h=400&fit=crop'],
  other:       ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=300&h=400&fit=crop', 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=300&h=400&fit=crop']
};

window.conditionOptions = ['New', 'Like New', 'Good', 'Fair'];
window.colorOptions = ['Black', 'White', 'Grey', 'Blue', 'Red', 'Green', 'Brown', 'Beige', 'Pink', 'Other'];
window.yearOptions = ['2026', '2025', '2024', '2023', '2022', '2021', '2020'];

// ========================
// STEP NAVIGATION
// ========================
window.nextStep = function() {
  if (formState.currentStep === 1 && !formState.category) {
    DemoNotifications.showToast('Please select a category first.', 'warning');
    return;
  }
  if (formState.currentStep < 4) {
    formState.currentStep++;
    updateStepUI();
    scrollToTop();
  }
}

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
  document.getElementById('btnNextStep1').disabled = false;
  renderDetailsFields();
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
    zone: 'detail_zone'
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
      var genericLabels = { type: 'Type', brand: 'Brand', model: 'Model', condition: 'Condition', year: 'Year', size: 'Size', color: 'Color' };
      var label = (field.label && field.label !== genericLabels[fieldKey]) ? field.label : getFieldLabel(fieldKey, field.label);
      if (field.type === 'select') {
        html += buildSelectNew(fieldKey, label, field.options, field.required);
      } else if (field.type === 'text') {
        html += '<div class="form-group">' +
          '<label class="form-label">' + label + (field.required ? ' *' : '') + '</label>' +
          '<input type="text" class="form-input" name="' + fieldKey + '" data-field="' + fieldKey + '" placeholder="' + (field.placeholder || '') + '" onchange="updateDetails(\'' + fieldKey + '\', this.value)"' + (field.required ? ' required' : '') + '>' +
          '</div>';
      }
    });
  } else {
    html += buildSelect('type', getFieldLabel('type', 'Type'), cat.types);
    html += buildSelect('brand', getFieldLabel('brand', 'Brand'), cat.brands);
    html += '<div class="form-group">' +
      '<label class="form-label">' + getFieldLabel('model', 'Model') + '</label>' +
      '<input type="text" class="form-input" name="model" placeholder="e.g. iPhone 15 Pro" onchange="updateDetails(\'model\', this.value)">' +
      '</div>';
    html += buildSelect('condition', getFieldLabel('condition', 'Condition'), conditionOptions);
    html += buildSelect('year', getFieldLabel('year', 'Year'), yearOptions);
    if (cat.showSize) {
      html += buildSelect('size', getFieldLabel('size', 'Size'), cat.sizeOptions);
    }
    html += buildSelect('color', getFieldLabel('color', 'Color'), colorOptions);
  }

  container.innerHTML = html;

  var genderSelect = document.querySelector('#detailsContainer select[data-field="gender"]');
  var zoneSelect = document.querySelector('#detailsContainer select[data-field="zone"]');

  if (genderSelect && formState.category === 'clothing') {
    genderSelect.addEventListener('change', function() {
      var subSelect = document.querySelector('#detailsContainer select[data-field="subcategory"]');
      if (!subSelect) return;
      var genderMap = { 'Men': 'male', 'Women': 'female', 'Children': 'kids', 'Unisex': 'unisex' };
      var genderKey = genderMap[genderSelect.value] || 'male';
      var subs = CLOTHING_SUBCATEGORIES[genderKey] || [];
      subSelect.innerHTML = '<option value="">' + getSelectPlaceholder(getFieldLabel('subcategory', 'Subcategory')) + '</option>' + subs.map(function(s) {
        return '<option value="' + s + '">' + s + '</option>';
      }).join('');
    });
  }

  if (zoneSelect && formState.category === 'bags_accessories') {
    zoneSelect.addEventListener('change', function() {
      var subSelect = document.querySelector('#detailsContainer select[data-field="subcategory"]');
      if (!subSelect) return;
      var zoneKey = zoneSelect.value.toLowerCase();
      var subs = BAGS_ACCESSORIES_SUBCATEGORIES[zoneKey] || [];
      subSelect.innerHTML = '<option value="">' + getSelectPlaceholder(getFieldLabel('subcategory', 'Subcategory')) + '</option>' + subs.map(function(s) {
        return '<option value="' + s + '">' + s + '</option>';
      }).join('');
    });
  }

  if (zoneSelect && formState.category === 'gaming') {
    zoneSelect.addEventListener('change', function() {
      var subSelect = document.querySelector('#detailsContainer select[data-field="subcategory"]');
      if (!subSelect) return;
      var zoneMap = { 'Consoles & Hardware': 'consoles_hardware', 'Games': 'games', 'Accessories': 'accessories' };
      var zoneKey = zoneMap[zoneSelect.value] || 'consoles_hardware';
      var subs = GAMING_SUBCATEGORIES[zoneKey] || [];
      subSelect.innerHTML = '<option value="">' + getSelectPlaceholder(getFieldLabel('subcategory', 'Subcategory')) + '</option>' + subs.map(function(s) {
        return '<option value="' + s + '">' + s + '</option>';
      }).join('');
    });
  }
}

window.buildSelectNew = function(name, label, options, required) {
  var optHtml = '<option value="">' + getSelectPlaceholder(label) + '</option>';
  options.forEach(function(opt) {
    optHtml += '<option value="' + opt + '">' + opt + '</option>';
  });
  return '<div class="form-group">' +
    '<label class="form-label">' + label + (required ? ' *' : '') + '</label>' +
    '<select class="form-select" name="' + name + '" data-field="' + name + '" onchange="updateDetails(\'' + name + '\', this.value)"' + (required ? ' required' : '') + '>' +
    optHtml +
    '</select></div>';
}

window.buildSelect = function(name, label, options) {
  var optHtml = '<option value="">' + getSelectPlaceholder(label) + '</option>';
  options.forEach(function(opt) {
    optHtml += '<option value="' + opt + '">' + opt + '</option>';
  });
  return '<div class="form-group">' +
    '<label class="form-label">' + label + '</label>' +
    '<select class="form-select" name="' + name + '" data-field="' + name + '" onchange="updateDetails(\'' + name + '\', this.value)">' +
    optHtml +
    '</select></div>';
}

window.updateDetails = function(field, value) {
  formState.details[field] = value;
}

// ========================
// STEP 3: PHOTOS (real file upload — Phase 2)
// Per-slot state: formState.photoBlobs[idx] = { preview, processed, uploadedUrl }
// ========================
formState.photoBlobs = formState.photoBlobs || [];
var _pendingSlotIndex = null;

window.openPhotoPicker = function(index) {
  // If slot already has a photo, clicking removes it
  if (formState.photoBlobs[index]) {
    removePhoto(index);
    return;
  }
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

window.handlePhotoFiles = async function(e) {
  var files = Array.from(e.target.files || []);
  if (!files.length) return;

  if (!window.SwappoStorage) {
    DemoNotifications.showToast('Photo module not loaded. Please refresh.', 'error');
    return;
  }

  // Start at the pending slot (or first empty), and fill forward
  var start = _pendingSlotIndex != null ? _pendingSlotIndex : 0;
  var maxSlots = SwappoStorage.MAX_FILES || 5;

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
      DemoNotifications.showToast('Max ' + maxSlots + ' photos reached.', 'warning');
      break;
    }
    var slotEl = document.querySelector('.photo-slot[data-index="' + slotIdx + '"]');
    if (slotEl) slotEl.classList.add('uploading');
    try {
      var processed = await SwappoStorage.processFile(files[i]);
      formState.photoBlobs[slotIdx] = {
        preview: processed.preview,
        processed: processed,
        uploadedUrl: null
      };
    } catch (err) {
      DemoNotifications.showToast('Could not read ' + (files[i].name || 'image') + '.', 'error');
    } finally {
      if (slotEl) slotEl.classList.remove('uploading');
    }
    refreshPhotoGrid();
  }
  _pendingSlotIndex = null;
};

window.refreshPhotoGrid = function() {
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
      img.alt = 'Photo ' + (idx + 1);
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
    } else {
      slot.classList.remove('filled');
      var ph = document.createElement('div');
      ph.className = 'photo-placeholder';
      ph.textContent = '+';
      slot.insertBefore(ph, slot.firstChild);
    }
  });

  // Keep formState.photos mirrored for legacy reviewPhotos rendering
  formState.photos = formState.photoBlobs.map(function(e) { return e ? e.preview : null; });
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
  var fieldOrder = ['gender', 'zone', 'subcategory', 'age_range', 'type', 'brand', 'model', 'material', 'condition', 'year', 'size', 'color'];

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
      priceEl.textContent = 'Free (Giveaway)';
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
}

// ========================
// PUBLISH
// ========================
window.publishItem = async function(e) {
  e.preventDefault();

  // Auth check — prefer Supabase, fall back to DemoAuth for dev
  var user = null;
  if (window.SwappoAuth && window.SwappoAuth.isReady()) {
    user = await window.SwappoAuth.getCurrentUser();
  }
  if (!user && window.DemoAuth) user = window.DemoAuth.getCurrentUser();
  if (!user) {
    window.location.href = 'login.html?redirect=/pages/publier.html';
    return;
  }

  if (!formState.category) {
    DemoNotifications.showToast('Please select a category.', 'warning');
    return;
  }

  var entries = (formState.photoBlobs || []).filter(function(p) { return p && p.processed; });
  if (!entries.length) {
    DemoNotifications.showToast('Please add at least one photo.', 'warning');
    return;
  }

  var btn = document.getElementById('btnPublish');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading photos...';
  btn.disabled = true;
  btn.style.opacity = '0.7';

  // --- 1. Upload photos to Supabase Storage ---
  var photoUrls = [];
  try {
    for (var i = 0; i < entries.length; i++) {
      var url = await window.SwappoStorage.uploadOne(
        { _processed: entries[i].processed, type: entries[i].processed.mime },
        user.id
      );
      photoUrls.push(url);
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading ' + (i + 1) + '/' + entries.length + '...';
    }
  } catch (err) {
    console.error('[publier] upload failed:', err);
    DemoNotifications.showToast('Upload failed: ' + (err.message || 'unknown error'), 'error');
    btn.innerHTML = 'Publish <i class="fas fa-arrow-right"></i>';
    btn.disabled = false;
    btn.style.opacity = '1';
    return;
  }

  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';

  // --- 2. Build item payload ---
  var conditionMap = { 'New': 'new', 'Like New': 'like_new', 'Good': 'good', 'Fair': 'fair' };
  var priceEl = document.getElementById('item-price');
  var emirateEl = document.getElementById('item-emirate');

  var itemData = {
    category: formState.category,
    subcategory: formState.details.subcategory || '',
    type: formState.details.type || formState.category,
    brand: formState.details.brand || '',
    model: formState.details.model || '',
    condition: conditionMap[formState.details.condition] || 'good',
    year: formState.details.year ? String(formState.details.year) : String(new Date().getFullYear()),
    size: formState.details.size || '',
    color: formState.details.color || '',
    photos: photoUrls,
    is_giveaway: !!formState.isGiveaway,
    price: parseInt(priceEl ? priceEl.value : '0') || 0,
    emirate: (emirateEl && emirateEl.value) || user.emirate || 'Dubai',
    city: user.city || 'Dubai',
    lat: (window.Swappo && Swappo.userLat) || null,
    lng: (window.Swappo && Swappo.userLng) || null
  };

  // --- 3. Insert via Supabase, fall back to Demo in dev ---
  var result = null;
  if (window.SwappoItems) {
    result = await window.SwappoItems.create(itemData);
  } else if (window.DemoItems) {
    result = window.DemoItems.create(itemData);
  }

  if (!result || !result.success) {
    DemoNotifications.showToast('Publish failed: ' + ((result && result.error) || 'unknown'), 'error');
    btn.innerHTML = 'Publish <i class="fas fa-arrow-right"></i>';
    btn.disabled = false;
    btn.style.opacity = '1';
    return;
  }

  DemoNotifications.showToast('Item published! \uD83C\uDF89', 'success');
  setTimeout(function() {
    window.location.href = 'catalogue.html';
  }, 1200);
};
