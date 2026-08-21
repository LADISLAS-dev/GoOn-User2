function normalizeTokenList(tokens = []) {
  return Array.from(
    new Set(
      tokens.filter((token) => typeof token === 'string' && token.trim().length > 0)
    )
  );
}

function normalizeRegistrationList(registrations = []) {
  const byToken = new Map();

  for (const registration of registrations) {
    const token = typeof registration?.token === 'string' ? registration.token.trim() : '';
    if (!token) continue;

    byToken.set(token, {
      token,
      appOwnership: registration?.appOwnership || null,
      executionEnvironment: registration?.executionEnvironment || null,
      updatedAt: registration?.updatedAt || null,
    });
  }

  return Array.from(byToken.values());
}

function isLegacyExponentToken(token = '') {
  return typeof token === 'string' && token.startsWith('ExponentPushToken[');
}

function isModernExpoToken(token = '') {
  return typeof token === 'string' && token.startsWith('ExpoPushToken[');
}

function isStandaloneRegistration(registration = {}) {
  const ownership = String(registration?.appOwnership || '').toLowerCase();
  const environment = String(registration?.executionEnvironment || '').toLowerCase();

  return environment === 'standalone' || environment === 'bare' || ownership === 'standalone';
}

function selectPreferredPushTokens(tokens = []) {
  const normalized = normalizeTokenList(tokens);
  const modernTokens = normalized.filter(isModernExpoToken);

  // Prefer modern tokens when available, otherwise keep legacy tokens.
  if (modernTokens.length > 0) {
    return modernTokens;
  }

  return normalized;
}

function selectPreferredPushRegistrations(registrations = []) {
  const normalized = normalizeRegistrationList(registrations);
  const standalone = normalized.filter(isStandaloneRegistration);

  if (standalone.length > 0) {
    return standalone;
  }

  const modern = normalized.filter((registration) => isModernExpoToken(registration.token));
  if (modern.length > 0) {
    return modern;
  }

  return normalized;
}

function extractPreferredPushTokens(user = {}) {
  const registrations = selectPreferredPushRegistrations(user?.expoPushRegistrations || []);
  if (registrations.length > 0) {
    return registrations.map((registration) => registration.token);
  }

  const rawTokens = [
    user?.expoPushToken,
    ...(Array.isArray(user?.expoPushTokens) ? user.expoPushTokens : []),
  ];

  return selectPreferredPushTokens(rawTokens);
}

function extractAllPushTokens(user = {}) {
  const preferredFromRegistrations = selectPreferredPushRegistrations(
    user?.expoPushRegistrations || []
  ).map((registration) => registration.token);

  if (preferredFromRegistrations.length > 0) {
    return normalizeTokenList(preferredFromRegistrations);
  }

  const tokens = normalizeTokenList([
    ...(Array.isArray(user?.expoPushTokens) ? user.expoPushTokens : []),
    user?.expoPushToken,
  ]);

  // Expo Go issues legacy ExponentPushToken[...] which are unreliable for remote
  // push since SDK 53. Standalone/TestFlight builds issue modern ExpoPushToken[...].
  // When modern tokens exist, send only to modern tokens so stale Expo Go tokens
  // cannot hijack taps and reopen Expo Go.
  const modernTokens = tokens.filter(isModernExpoToken);
  if (modernTokens.length > 0) {
    return modernTokens;
  }

  // Last resort: keep only valid-looking legacy tokens.
  return tokens.filter(isLegacyExponentToken);
}

module.exports = {
  normalizeTokenList,
  isLegacyExponentToken,
  isModernExpoToken,
  isStandaloneRegistration,
  selectPreferredPushTokens,
  selectPreferredPushRegistrations,
  extractPreferredPushTokens,
  extractAllPushTokens,
};
