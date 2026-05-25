// lib/compressImage.js
// Runs only in the browser — called from admin form when adding images.

/**
 * Compress a base64 dataURL to a smaller WebP/JPEG.
 * @param {string} dataUrl  - original base64 image
 * @param {number} maxW     - max output width  (default 1024)
 * @param {number} maxH     - max output height (default 768)
 * @param {number} quality  - 0–1 quality       (default 0.65)
 * @returns {Promise<string>} compressed base64 dataURL
 */
export function compressImage(dataUrl, maxW = 1024, maxH = 768, quality = 0.65) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width  * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled  = true;
      ctx.imageSmoothingQuality  = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      let out = canvas.toDataURL('image/webp', quality);
      if (out.length < 50) out = canvas.toDataURL('image/jpeg', quality); // webp fallback
      resolve(out);
    };
    img.src = dataUrl;
  });
}
