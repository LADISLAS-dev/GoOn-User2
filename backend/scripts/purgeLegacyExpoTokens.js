const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/database');
const User = require('../models/User');

const REQUIRED_CONFIRMATION = 'YES_I_AM_SURE';

function isLegacyExponentToken(token = '') {
  return typeof token === 'string' && token.startsWith('ExponentPushToken[');
}

function isModernExpoToken(token = '') {
  return typeof token === 'string' && token.startsWith('ExpoPushToken[');
}

function sanitizeTokens(tokens = []) {
  return Array.from(
    new Set(tokens.filter((token) => typeof token === 'string' && token.trim().length > 0))
  );
}

function sanitizeRegistrations(registrations = []) {
  const seen = new Set();
  const sanitized = [];

  for (const registration of registrations) {
    const token = typeof registration?.token === 'string' ? registration.token.trim() : '';
    if (!token || seen.has(token)) continue;

    seen.add(token);
    sanitized.push({
      token,
      appOwnership: registration?.appOwnership || null,
      executionEnvironment: registration?.executionEnvironment || null,
      updatedAt: registration?.updatedAt || new Date(),
    });
  }

  return sanitized;
}

function shouldTreatAsStandalone(registration = {}) {
  const ownership = String(registration?.appOwnership || '').toLowerCase();
  const environment = String(registration?.executionEnvironment || '').toLowerCase();
  return ownership === 'standalone' || environment === 'standalone' || environment === 'bare';
}

function transformUserPushData(user) {
  const existingTokens = sanitizeTokens([
    ...(Array.isArray(user?.expoPushTokens) ? user.expoPushTokens : []),
    user?.expoPushToken,
  ]);
  const registrations = sanitizeRegistrations(user?.expoPushRegistrations || []);

  const hasModernToken = existingTokens.some(isModernExpoToken);
  const hasStandaloneRegistration = registrations.some(shouldTreatAsStandalone);
  const shouldPurgeLegacy = hasModernToken || hasStandaloneRegistration;

  if (!shouldPurgeLegacy) {
    return {
      changed: false,
      reason: 'no-modern-or-standalone-token',
      next: null,
      removedLegacyCount: 0,
    };
  }

  const nextTokens = sanitizeTokens(existingTokens.filter((token) => !isLegacyExponentToken(token)));
  const nextRegistrations = sanitizeRegistrations(
    registrations.filter((registration) => !isLegacyExponentToken(registration?.token))
  );

  const nextPrimary = nextTokens[0] || null;
  const prevPrimary = typeof user?.expoPushToken === 'string' ? user.expoPushToken : null;

  const changed =
    JSON.stringify(existingTokens) !== JSON.stringify(nextTokens) ||
    JSON.stringify(registrations.map((r) => r.token)) !== JSON.stringify(nextRegistrations.map((r) => r.token)) ||
    prevPrimary !== nextPrimary;

  const removedLegacyCount = existingTokens.filter(isLegacyExponentToken).length;

  return {
    changed,
    reason: shouldPurgeLegacy ? 'purged-legacy' : 'unchanged',
    removedLegacyCount,
    next: {
      expoPushToken: nextPrimary,
      expoPushTokens: nextTokens,
      expoPushRegistrations: nextRegistrations,
    },
  };
}

async function main() {
  const dryRun = String(process.env.DRY_RUN || 'true').trim().toLowerCase() !== 'false';
  const confirmation = String(process.env.CONFIRM_PURGE || '').trim();

  if (!dryRun && confirmation !== REQUIRED_CONFIRMATION) {
    console.error('Refusing to mutate DB. Set CONFIRM_PURGE=YES_I_AM_SURE with DRY_RUN=false to continue.');
    process.exit(1);
  }

  await connectDB();

  const users = await User.find({}, '_id firebaseUid expoPushToken expoPushTokens expoPushRegistrations');

  let scanned = 0;
  let toUpdate = 0;
  let totalLegacyRemoved = 0;

  for (const user of users) {
    scanned += 1;
    const result = transformUserPushData(user);
    if (!result.changed || !result.next) continue;

    toUpdate += 1;
    totalLegacyRemoved += result.removedLegacyCount;

    if (dryRun) {
      console.log(
        `[DRY-RUN] user=${user._id} legacyRemoved=${result.removedLegacyCount} nextPrimary=${result.next.expoPushToken || 'null'}`
      );
      continue;
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          expoPushToken: result.next.expoPushToken,
          expoPushTokens: result.next.expoPushTokens,
          expoPushRegistrations: result.next.expoPushRegistrations,
        },
      }
    );

    console.log(
      `[UPDATED] user=${user._id} legacyRemoved=${result.removedLegacyCount} nextPrimary=${result.next.expoPushToken || 'null'}`
    );
  }

  console.log('--- Legacy Expo token purge summary ---');
  console.log(`dryRun: ${dryRun}`);
  console.log(`usersScanned: ${scanned}`);
  console.log(`usersToUpdate: ${toUpdate}`);
  console.log(`legacyTokensRemoved: ${totalLegacyRemoved}`);

  process.exit(0);
}

main().catch((error) => {
  console.error('Legacy Expo token purge failed:', error?.message || error);
  process.exit(1);
});
