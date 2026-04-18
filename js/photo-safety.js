/**
 * photo-safety.js — Swappo Privacy Shield
 * Lightweight client-side photo moderation for listing + avatar uploads.
 *
 *  • Face blur (face-api.js — TinyFaceDetector)
 *  • Sensitive-text OCR (tesseract.js) against phone / email / URL / social
 *    patterns. Matches → caller rejects the upload.
 *
 * All processing happens in the browser. Both libraries are lazy-loaded
 * from CDN the first time processImage() runs.
 *
 * API:
 *   PhotoSafety.processImage(file, opts?)
 *     opts.blurFaces   = true  — pixelate detected faces
 *     opts.redactText  = true  — OCR + regex; flags phones / emails / URLs
 *     opts.maxSidePx   = 1600  — downscale before detection (perf)
 *   -> {
 *        blob, canvas,              // the (optionally blurred) image
 *        facesDetected,             // number
 *        rejected, rejectReason,    // set when sensitive text was found
 *        sensitiveMatches           // [{ type, value }]
 *      }
 */

var PhotoSafety = (function () {
  'use strict';

  var FACE_BLUR_RADIUS = 20;
  var DETECT_MAX_SIDE = 1600;
  var facesLoaded = false;
  var facesLoading = false;
  var _tesseractWorker = null;
  var _tesseractLoadingPromise = null;

  // -- STRICT sensitive-text patterns (low false-positive risk) -----------
  // UAE phones (+971, 05XXXXXXXX), emails, URLs, and social handles.
  // Generic 10-digit phone patterns are intentionally omitted — they
  // over-flag ISBNs, SKU codes, model numbers.
  var SENSITIVE_PATTERNS = [
    { type: 'phone', re: /\+?\s*971[\s\-\.]?\d{1,2}[\s\-\.]?\d{3}[\s\-\.]?\d{4}/g,
      label: 'phone number' },
    { type: 'phone', re: /\b0?5\d[\s\-\.]?\d{3}[\s\-\.]?\d{4}\b/g,
      label: 'phone number' },
    { type: 'email', re: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
      label: 'email address' },
    { type: 'url',   re: /\b(?:https?:\/\/|www\.)[^\s]{3,}/gi,
      label: 'website' },
    { type: 'social',re: /(?:^|\s)@[A-Za-z][A-Za-z0-9._]{2,29}/g,
      label: 'social handle' },
    // WhatsApp / Telegram / Signal mentions by name
    { type: 'social',re: /\b(?:whats?app|telegram|signal|insta(?:gram)?|snapchat|tiktok)\b/gi,
      label: 'messenger contact' }
  ];

  // ============ Face-api (lazy) ==========================================
  function ensureFaceApi() {
    return new Promise(function (resolve) {
      if (window.faceapi) return resolve();
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
      s.onload = resolve;
      s.onerror = function () { console.warn('[PhotoSafety] face-api load failed'); resolve(); };
      document.head.appendChild(s);
    });
  }

  function loadFaceModels() {
    if (facesLoaded) return Promise.resolve();
    if (facesLoading) return new Promise(function (r) { setTimeout(function () { loadFaceModels().then(r); }, 200); });
    facesLoading = true;
    return ensureFaceApi().then(function () {
      if (!window.faceapi) { facesLoading = false; return; }
      return faceapi.nets.tinyFaceDetector.loadFromUri(
        'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights'
      ).then(function () {
        facesLoaded = true;
        facesLoading = false;
      }).catch(function (e) {
        console.warn('[PhotoSafety] face models load failed', e);
        facesLoading = false;
      });
    });
  }

  // ============ Tesseract (lazy) =========================================
  function ensureTesseract() {
    if (window.Tesseract) return Promise.resolve();
    if (_tesseractLoadingPromise) return _tesseractLoadingPromise;
    _tesseractLoadingPromise = new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.onload = resolve;
      s.onerror = function () { console.warn('[PhotoSafety] tesseract load failed'); resolve(); };
      document.head.appendChild(s);
    });
    return _tesseractLoadingPromise;
  }

  async function getTesseractWorker() {
    if (_tesseractWorker) return _tesseractWorker;
    await ensureTesseract();
    if (!window.Tesseract) return null;
    try {
      _tesseractWorker = await Tesseract.createWorker('eng');
      return _tesseractWorker;
    } catch (e) {
      console.warn('[PhotoSafety] tesseract worker init failed', e);
      return null;
    }
  }

  // ============ Helpers ==================================================
  function fileToImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode failed')); };
      img.src = url;
    });
  }

  function downscaleToCanvas(img, maxSide) {
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    if (w > maxSide || h > maxSide) {
      if (w >= h) { h = Math.round(h * (maxSide / w)); w = maxSide; }
      else        { w = Math.round(w * (maxSide / h)); h = maxSide; }
    }
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
  }

  function applyBlur(ctx, x, y, w, h) {
    var ratio = 1 / FACE_BLUR_RADIUS;
    var tmp = document.createElement('canvas');
    tmp.width = Math.max(1, Math.round(w * ratio));
    tmp.height = Math.max(1, Math.round(h * ratio));
    var tc = tmp.getContext('2d');
    tc.drawImage(ctx.canvas, x, y, w, h, 0, 0, tmp.width, tmp.height);
    ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, x, y, w, h);
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) { resolve(blob); }, 'image/jpeg', 0.92);
    });
  }

  // ============ Detection ================================================
  async function detectFaces(canvas) {
    await loadFaceModels();
    if (!window.faceapi || !facesLoaded) return [];
    try {
      return await faceapi.detectAllFaces(canvas,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
      );
    } catch (e) {
      console.warn('[PhotoSafety] detectFaces failed', e);
      return [];
    }
  }

  function blurFacesOnCanvas(canvas, detections) {
    if (!detections || !detections.length) return;
    var ctx = canvas.getContext('2d');
    detections.forEach(function (det) {
      var box = det.box || det;
      var margin = 0.25;
      var bx = Math.max(0, box.x - box.width * margin);
      var by = Math.max(0, box.y - box.height * margin);
      var bw = Math.min(canvas.width - bx, box.width * (1 + margin * 2));
      var bh = Math.min(canvas.height - by, box.height * (1 + margin * 2));
      applyBlur(ctx, bx, by, bw, bh);
    });
  }

  async function scanSensitiveText(canvas) {
    var worker = await getTesseractWorker();
    if (!worker) return { matches: [], text: '' };
    try {
      var out = await worker.recognize(canvas);
      var text = (out && out.data && out.data.text) || '';
      var matches = [];
      var seen = {};
      SENSITIVE_PATTERNS.forEach(function (p) {
        var found = text.match(p.re);
        if (!found) return;
        found.forEach(function (m) {
          var key = p.type + '|' + m.toLowerCase().trim();
          if (seen[key]) return;
          seen[key] = true;
          matches.push({ type: p.type, value: m.trim(), label: p.label });
        });
      });
      return { matches: matches, text: text };
    } catch (e) {
      console.warn('[PhotoSafety] OCR failed', e);
      return { matches: [], text: '' };
    }
  }

  function buildRejectReason(matches) {
    if (!matches || !matches.length) return null;
    var seen = {};
    var phrases = [];
    matches.forEach(function (m) {
      if (seen[m.label]) return;
      seen[m.label] = true;
      var article = /^[aeiou]/i.test(m.label) ? 'an ' : 'a ';
      phrases.push(article + m.label);
    });
    var joined = phrases.length === 1 ? phrases[0]
               : phrases.length === 2 ? phrases.join(' and ')
               : phrases.slice(0, -1).join(', ') + ', and ' + phrases[phrases.length - 1];
    return 'This photo contains ' + joined + '. Remove it from the image and upload again.';
  }

  // ============ Public API ===============================================
  async function processImage(file, opts) {
    opts = opts || {};
    var blurFaces = opts.blurFaces !== false;
    var redactText = opts.redactText !== false;
    var maxSide = opts.maxSidePx || DETECT_MAX_SIDE;

    // Load + downscale the photo to a detection-friendly size. The
    // resulting canvas becomes both the detection target and the output —
    // Swappo's upload pipeline re-compresses to WebP afterwards.
    var img;
    try { img = await fileToImage(file); }
    catch (e) { return { blob: file, facesDetected: 0, rejected: false, sensitiveMatches: [] }; }
    var canvas = downscaleToCanvas(img, maxSide);

    var faces = blurFaces ? await detectFaces(canvas) : [];
    if (faces.length) blurFacesOnCanvas(canvas, faces);

    var textResult = redactText ? await scanSensitiveText(canvas) : { matches: [] };

    var blob = await canvasToBlob(canvas);
    var rejected = textResult.matches.length > 0;
    return {
      canvas: canvas,
      blob: blob,
      facesDetected: faces.length,
      wasModified: faces.length > 0,
      sensitiveMatches: textResult.matches,
      rejected: rejected,
      rejectReason: rejected ? buildRejectReason(textResult.matches) : null
    };
  }

  // Legacy alias — old callers expected { canvas, blob, facesDetected, wasModified }.
  return {
    processImage: processImage,
    loadModels: loadFaceModels,
    // Exposed for tests
    _patterns: SENSITIVE_PATTERNS
  };
})();

window.PhotoSafety = PhotoSafety;
