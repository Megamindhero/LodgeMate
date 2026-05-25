// lib/validation.js

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_IMAGE_SIZE_MB   = 15;

/** Strip all HTML tags */
export const sanitize = (v) => String(v ?? '').replace(/<[^>]*>/g, '').trim();

/** Validate a YouTube / Vimeo https URL (empty string is valid — field is optional) */
export function isValidVideoUrl(url) {
  if (!url) return true;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    return /^(www\.)?(youtube\.com|youtu\.be|vimeo\.com)$/.test(u.hostname);
  } catch {
    return false;
  }
}

/** Build a clean, whitelisted property object ready for Firebase */
export function buildSafeProperty(form, extra = {}) {
  const rawPrice = Number(form.price);
  return {
    title:          sanitize(form.title).substring(0, 120),
    location:       sanitize(form.location).substring(0, 100),
    description:    sanitize(form.description).substring(0, 300),
    price:          form.price && isFinite(rawPrice) && rawPrice > 0 ? String(rawPrice) : '',
    videoLink:      (form.videoLink ?? '').trim().substring(0, 300),
    whatsappNumber: (form.whatsappNumber ?? '').replace(/[^\d+]/g, '').substring(0, 20),
    images:         Array.isArray(form.images) ? form.images.slice(0, 10) : [],
    available:      form.available !== false, // default true
    ...extra,
  };
}

/** Validate form fields, returns error string or '' */
export function validatePropertyForm(form) {
  const title = sanitize(form.title);
  const location = sanitize(form.location);
  const desc = sanitize(form.description);
  const phone = (form.whatsappNumber ?? '').trim();
  const video = (form.videoLink ?? '').trim();
  const rawPrice = Number(form.price);

  if (!title)                                                      return 'Title is required';
  if (title.length > 120)                                          return 'Title max 120 characters';
  if (!location)                                                   return 'Location is required';
  if (!desc)                                                       return 'Description is required';
  if (desc.length > 300)                                           return 'Description max 300 characters';
  if (!form.images?.length)                                        return 'At least one image is required';
  if (video && !isValidVideoUrl(video))                            return 'Video must be a valid YouTube/Vimeo https:// link';
  if (!/^\+?[\d\s\-]{7,15}$/.test(phone.replace(/\s/g, '')))      return 'Enter a valid WhatsApp number';
  if (form.price && (!isFinite(rawPrice) || rawPrice <= 0 || rawPrice >= 100_000_000)) return 'Enter a valid price';
  return '';
}
