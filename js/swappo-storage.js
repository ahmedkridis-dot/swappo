/* ============================================
   Swappo — Storage module (Phase 2)
   Client-side photo processing + Supabase upload.

   Public API:
     SwappoStorage.processFile(file, opts)    -> { blob, url, width, height, sizeKB }
     SwappoStorage.uploadItemPhotos(files)    -> [publicUrl, ...]
     SwappoStorage.uploadOne(file, folder)    -> publicUrl
     SwappoStorage.MAX_FILES                  -> 5
     SwappoStorage.MAX_SIZE_MB                -> 2
     SwappoStorage.MAX_SIDE_PX                -> 1600

   Photo policy (per Ahmed, 2026-04-14):
     - max 5 photos per item
     - max 2 MB each (enforced AFTER client-side resize)
     - auto-resize to 1600 px max side, preserving aspect ratio
     - convert to WebP (quality 0.85) before upload
   ============================================ */

(function (global) {
  'use strict';

  const MAX_FILES   = 5;
  const MAX_SIZE_MB = 2;
  const MAX_SIDE_PX = 1600;
  const WEBP_QUALITY = 0.85;
  const BUCKET = 'item-photos';

  /** Load an image file into an <img> element (returns a Promise<HTMLImageElement>). */
  function _loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not read image file.'));
      };
      img.src = url;
    });
  }

  /** Resize to fit within MAX_SIDE_PX x MAX_SIDE_PX, return canvas. */
  function _resizeToCanvas(img) {
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;

    if (w > MAX_SIDE_PX || h > MAX_SIDE_PX) {
      if (w >= h) {
        h = Math.round(h * (MAX_SIDE_PX / w));
        w = MAX_SIDE_PX;
      } else {
        w = Math.round(w * (MAX_SIDE_PX / h));
        h = MAX_SIDE_PX;
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    // High-quality resampling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    return canvas;
  }

  /** Convert canvas -> WebP Blob. Falls back to JPEG if WebP unsupported. */
  function _canvasToWebP(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) return resolve({ blob, mime: 'image/webp', ext: 'webp' });
          // Fallback: JPEG
          canvas.toBlob(
            (jpegBlob) => {
              if (jpegBlob) resolve({ blob: jpegBlob, mime: 'image/jpeg', ext: 'jpg' });
              else reject(new Error('Canvas conversion failed.'));
            },
            'image/jpeg',
            quality
          );
        },
        'image/webp',
        quality
      );
    });
  }

  /** Shrink quality iteratively until blob fits under MAX_SIZE_MB. */
  async function _shrinkToLimit(canvas) {
    let quality = WEBP_QUALITY;
    let result = await _canvasToWebP(canvas, quality);
    const limitBytes = MAX_SIZE_MB * 1024 * 1024;

    while (result.blob.size > limitBytes && quality > 0.35) {
      quality -= 0.1;
      result = await _canvasToWebP(canvas, quality);
    }
    // Last resort: downsize the canvas further
    if (result.blob.size > limitBytes) {
      const ctx = canvas.getContext('2d');
      const newW = Math.round(canvas.width * 0.85);
      const newH = Math.round(canvas.height * 0.85);
      const tmp = document.createElement('canvas');
      tmp.width = newW;
      tmp.height = newH;
      tmp.getContext('2d').drawImage(canvas, 0, 0, newW, newH);
      result = await _canvasToWebP(tmp, 0.75);
    }
    return result;
  }

  /**
   * Process a raw File -> optimized Blob ready for upload.
   * Returns { blob, mime, ext, width, height, sizeKB, preview }.
   */
  async function processFile(file) {
    if (!file || !/^image\//.test(file.type)) {
      throw new Error('File is not an image.');
    }
    const img = await _loadImage(file);
    const canvas = _resizeToCanvas(img);
    const { blob, mime, ext } = await _shrinkToLimit(canvas);
    return {
      blob,
      mime,
      ext,
      width: canvas.width,
      height: canvas.height,
      sizeKB: Math.round(blob.size / 1024),
      preview: URL.createObjectURL(blob)
    };
  }

  /** Upload one processed blob to Supabase Storage; returns the public URL. */
  async function uploadOne(file, folder) {
    if (!global.db) throw new Error('Supabase not ready.');
    if (!folder) throw new Error('Upload folder (user id) required.');

    const processed = file instanceof Blob && !file.type
      ? { blob: file, ext: 'webp', mime: 'image/webp' }
      : (file._processed || await processFile(file));

    const uuid = (crypto.randomUUID && crypto.randomUUID()) ||
                 (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
    const path = `${folder}/${uuid}.${processed.ext}`;

    const { error } = await global.db
      .storage
      .from(BUCKET)
      .upload(path, processed.blob, {
        cacheControl: '31536000',
        upsert: false,
        contentType: processed.mime
      });

    if (error) throw new Error(error.message || 'Upload failed.');

    const { data } = global.db.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Process + upload up to MAX_FILES images for the current user.
   * @param {File[] | FileList} files
   * @param {function(number,number)=} onProgress  (done, total)
   * @returns {Promise<string[]>} public URLs
   */
  async function uploadItemPhotos(files, onProgress) {
    if (!global.SwappoAuth || !global.SwappoAuth.isReady()) {
      throw new Error('Auth service unavailable.');
    }
    const user = await global.SwappoAuth.getCurrentUser();
    if (!user) throw new Error('You must be signed in to upload photos.');

    const arr = Array.from(files || []).slice(0, MAX_FILES);
    if (!arr.length) return [];

    const urls = [];
    for (let i = 0; i < arr.length; i++) {
      const processed = await processFile(arr[i]);
      const url = await uploadOne({ _processed: processed, type: processed.mime }, user.id);
      urls.push(url);
      if (typeof onProgress === 'function') onProgress(i + 1, arr.length);
    }
    return urls;
  }

  /** Extract the storage path from a public URL (for delete ops). */
  function pathFromPublicUrl(publicUrl) {
    if (!publicUrl) return null;
    const marker = `/object/public/${BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return null;
    return publicUrl.slice(idx + marker.length);
  }

  /** Delete a photo by public URL (owner only, enforced by RLS). */
  async function deletePhoto(publicUrl) {
    if (!global.db) return false;
    const path = pathFromPublicUrl(publicUrl);
    if (!path) return false;
    const { error } = await global.db.storage.from(BUCKET).remove([path]);
    return !error;
  }

  global.SwappoStorage = {
    MAX_FILES,
    MAX_SIZE_MB,
    MAX_SIDE_PX,
    BUCKET,
    processFile,
    uploadOne,
    uploadItemPhotos,
    deletePhoto,
    pathFromPublicUrl
  };
})(window);
