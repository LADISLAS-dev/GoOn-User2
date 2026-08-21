require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');

function getTokenType(token = '') {
  if (typeof token !== 'string') return 'INVALID';
  if (token.startsWith('ExpoPushToken[')) return 'PRODUCTION';
  if (token.startsWith('ExponentPushToken[')) return 'EXPO_GO';
  return 'UNKNOWN';
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const users = await User.find({})
    .select('name email expoPushToken expoPushTokens expoPushRegistrations updatedAt')
    .lean();

  let withAnyToken = 0;
  let withProductionToken = 0;
  let withLegacyOnly = 0;

  const rows = users.map((user) => {
    const merged = new Set();

    if (typeof user?.expoPushToken === 'string' && user.expoPushToken.trim()) {
      merged.add(user.expoPushToken.trim());
    }

    (Array.isArray(user?.expoPushTokens) ? user.expoPushTokens : []).forEach((token) => {
      if (typeof token === 'string' && token.trim()) merged.add(token.trim());
    });

    (Array.isArray(user?.expoPushRegistrations) ? user.expoPushRegistrations : []).forEach((reg) => {
      if (typeof reg?.token === 'string' && reg.token.trim()) merged.add(reg.token.trim());
    });

    const tokens = Array.from(merged);
    const hasAnyToken = tokens.length > 0;
    const hasProductionToken = tokens.some((token) => getTokenType(token) === 'PRODUCTION');
    const hasLegacyToken = tokens.some((token) => getTokenType(token) === 'EXPO_GO');

    if (hasAnyToken) withAnyToken += 1;
    if (hasProductionToken) withProductionToken += 1;
    if (hasAnyToken && !hasProductionToken && hasLegacyToken) withLegacyOnly += 1;

    return {
      name: user?.name || '-',
      email: user?.email || '-',
      tokenCount: tokens.length,
      hasProductionToken,
      hasLegacyToken,
      primaryType: tokens[0] ? getTokenType(tokens[0]) : 'NONE',
      updatedAt: user?.updatedAt || null,
    };
  });

  const missing = rows.filter((row) => row.tokenCount === 0);
  const legacyOnly = rows.filter((row) => row.tokenCount > 0 && !row.hasProductionToken && row.hasLegacyToken);

  console.log('\n=== PUSH READINESS REPORT ===');
  console.log(`Total users: ${users.length}`);
  console.log(`Users with any token: ${withAnyToken}`);
  console.log(`Users with production token: ${withProductionToken}`);
  console.log(`Users with legacy-only token: ${withLegacyOnly}`);
  console.log(`Users missing token: ${missing.length}`);

  if (missing.length) {
    console.log('\n--- Missing token users ---');
    missing.forEach((row) => {
      console.log(`- ${row.name} <${row.email}>`);
    });
  }

  if (legacyOnly.length) {
    console.log('\n--- Legacy-only token users (Expo Go) ---');
    legacyOnly.forEach((row) => {
      console.log(`- ${row.name} <${row.email}>`);
    });
  }

  console.log('\nTip: For App Store production reliability, users should have ExpoPushToken[...] tokens.');

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('Push readiness audit failed:', error?.message || error);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
