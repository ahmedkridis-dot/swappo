/**
 * photo-safety.js — Swappo Privacy Shield
 * Detects faces in uploaded photos and blurs them automatically.
 * Uses face-api.js (CDN) for lightweight client-side face detection.
 * No server needed — all processing happens in the browser.
 */

var PhotoSafety = (function() {
  'use strict';

  var FACE_BLUR_RADIUS = 20;
  var modelsLoaded = false;
  var loading = false;

  /** Load face-api.js from CDN if not already loaded */
  function ensureFaceApi() {
    return new Promise(function(resolve) {
      if (window.faceapi) { resolve(); return; }
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
      script.onload = resolve;
      script.onerror = function() { console.warn('[PhotoSafety] face-api.js failed to load'); resolve(); };
      document.head.appendChild(script);
    });
  }

  /** Load the tiny face detector model */
  function loadModels() {
    if (modelsLoaded) return Promise.resolve();
    if (loading) return new Promise(function(r) { setTimeout(function() { loadModels().then(r); }, 200); });
    loading = true;
    return ensureFaceApi().then(function() {
      if (!window.faceapi) { loading = false; return; }
      return faceapi.nets.tinyFaceDetector.loadFromUri(
        'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights'
      ).then(function() {
        modelsLoaded = true;
        loading = false;
      }).catch(function(e) {
        console.warn('[PhotoSafety] Model load failed:', e);
        loading = false;
      });
    });
  }

  /** Convert a File/Blob to an Image element */
  function fileToImage(file) {
    return new Promise(function(resolve) {
      var img = new Image();
      img.onload = function() { resolve(img); };
      img.src = URL.createObjectURL(file);
    });
  }

  /** Apply pixelated blur to a rectangular region */
  function applyBlur(ctx, x, y, w, h) {
    var ratio = 1 / FACE_BLUR_RADIUS;
    var tmp = document.createElement('canvas');
    tmp.width = Math.max(1, Math.round(w * ratio));
    tmp.height = Math.max(1, Math.round(h * ratio));
    var tc = tmp.getContext('2d');
    tc.drawImage(ctx.canvas, x, y, w, h, 0, 0, tmp.width, tmp.height);
    ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, x, y, w, h);
  }

  /** Canvas to Blob */
  function canvasToBlob(canvas) {
    return new Promise(function(resolve) {
      canvas.toBlob(function(blob) { resolve(blob); }, 'image/jpeg', 0.92);
    });
  }

  /**
   * Process an image: detect faces and blur them.
   * @param {File|Blob} imageFile
   * @returns {Promise<{canvas, blob, facesDetected, wasModified}>}
   */
  function processImage(imageFile) {
    return fileToImage(imageFile).then(function(img) {
      var canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      return loadModels().then(function() {
        if (!window.faceapi || !modelsLoaded) {
          return { canvas: canvas, blob: imageFile, facesDetected: 0, wasModified: false };
        }

        return faceapi.detectAllFaces(img,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
        ).then(function(detections) {
          detections.forEach(function(det) {
            var box = det.box;
            var margin = 0.25;
            var bx = Math.max(0, box.x - box.width * margin);
            var by = Math.max(0, box.y - box.height * margin);
            var bw = box.width * (1 + margin * 2);
            var bh = box.height * (1 + margin * 2);
            applyBlur(ctx, bx, by, bw, bh);
          });

          return canvasToBlob(canvas).then(function(blob) {
            return {
              canvas: canvas,
              blob: blob,
              facesDetected: detections.length,
              wasModified: detections.length > 0
            };
          });
        });
      }).catch(function(e) {
        console.warn('[PhotoSafety] Detection error:', e);
        return { canvas: canvas, blob: imageFile, facesDetected: 0, wasModified: false };
      });
    });
  }

  return {
    processImage: processImage,
    loadModels: loadModels
  };
})();

window.PhotoSafety = PhotoSafety;
