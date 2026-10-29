function toAbsoluteMediaUrl(req, value) {
  const raw = String(value || '').trim();
  if (!raw || /^https?:\/\//i.test(raw)) return raw;
  const host = req.get('x-forwarded-host') || req.get('host');
  if (!host) return raw;
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  return `${protocol}://${host}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

module.exports = { toAbsoluteMediaUrl };
