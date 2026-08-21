const UPLOADS_URL_PREFIX = '/uploads/';

function normalizeAvatarValue(value = '') {
  if (typeof value !== 'string' || !value) return '';
  if (!value.includes(UPLOADS_URL_PREFIX)) return value;

  const idx = value.indexOf(UPLOADS_URL_PREFIX);
  if (idx < 0) return value;
  return value.slice(idx);
}

function buildBootstrapPatch(existingUser, {
  cleanName = '',
  cleanEmail = '',
  cleanBio,
  cleanLanguage,
  avatar,
  uploadedAvatarUrl,
  normalizedPushToken,
} = {}) {
  const patch = {};

  if (!existingUser?.name && cleanName) {
    patch.name = cleanName;
  }

  if (!existingUser?.email && cleanEmail) {
    patch.email = cleanEmail;
  }

  if (typeof cleanBio === 'string' && cleanBio.trim() && !existingUser?.bio) {
    patch.bio = cleanBio;
  }

  if (typeof cleanLanguage === 'string' && cleanLanguage.trim() && !existingUser?.language) {
    patch.language = cleanLanguage.trim().toLowerCase();
  }

  if (uploadedAvatarUrl) {
    patch.avatar = uploadedAvatarUrl;
  } else if (typeof avatar === 'string') {
    const normalizedAvatar = normalizeAvatarValue(avatar);
    if (normalizedAvatar) {
      patch.avatar = normalizedAvatar;
    }
  }

  if (normalizedPushToken) {
    patch.expoPushToken = normalizedPushToken;
    const currentTokens = Array.isArray(existingUser?.expoPushTokens) ? existingUser.expoPushTokens : [];
    patch.expoPushTokens = Array.from(new Set([...currentTokens, normalizedPushToken]));
  }

  return patch;
}

module.exports = {
  UPLOADS_URL_PREFIX,
  normalizeAvatarValue,
  buildBootstrapPatch,
};
