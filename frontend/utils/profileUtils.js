const UPLOADS_SEGMENT = '/uploads/';

export const isHttpUrl = (value = '') =>
  typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));

export const isLocalAssetUri = (value = '') =>
  typeof value === 'string' && value.includes('://') && !isHttpUrl(value);

export const resolveAvatarUri = (src, apiBase = '') => {
  if (!src || typeof src !== 'string') return '';

  if (isLocalAssetUri(src)) return src;

  if (isHttpUrl(src)) {
    if (src.includes(UPLOADS_SEGMENT) && apiBase) {
      try {
        const parsed = new URL(src);
        return `${apiBase}${parsed.pathname}${parsed.search || ''}`;
      } catch (_) {
        const idx = src.indexOf(UPLOADS_SEGMENT);
        if (idx >= 0) return `${apiBase}${src.slice(idx)}`;
      }
    }
    return src;
  }

  if (!apiBase) return src;
  const clean = src.startsWith('/') ? src : `/${src}`;
  return `${apiBase}${clean}`;
};

export const sanitizeAvatarForServer = (value = '') => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (isHttpUrl(trimmed)) return trimmed;
  if (trimmed.includes(UPLOADS_SEGMENT)) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;

  // Never persist local URI schemes (ph://, file://, content://, etc.) as server avatar values.
  if (isLocalAssetUri(trimmed)) return '';

  return trimmed;
};

export const inferAvatarMimeType = (uri = '') => {
  const lower = String(uri).toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
};

export const inferAvatarFileName = (uri = '') => {
  const clean = String(uri || '');
  const last = clean.split('/').pop() || `avatar-${Date.now()}.jpg`;
  return last.includes('.') ? last : `${last}.jpg`;
};
