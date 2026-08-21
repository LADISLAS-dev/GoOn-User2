const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendExpoPushNotifications } = require('../utils/expoPush');
const { extractAllPushTokens } = require('../utils/pushTokenSelection');
const { buildDigestCopy, getUserNotificationLanguage } = require('../utils/notificationLocalization');

const DIGEST_POLL_MS = 60 * 1000;

let digestIntervalRef = null;
let digestRunning = false;

function getPreference(user, key, fallback) {
  const prefs = user?.notificationPreferences || {};
  return prefs[key] === undefined || prefs[key] === null ? fallback : prefs[key];
}

async function processUserDigest(user) {
  const digestEnabled = Boolean(getPreference(user, 'digestEnabled', false));
  const masterEnabled = Boolean(getPreference(user, 'masterEnabled', true));
  const intervalHours = Math.max(1, Math.min(24, Number(getPreference(user, 'digestIntervalHours', 4))));

  if (!masterEnabled || !digestEnabled) return;

  const lastSentAtRaw = getPreference(user, 'digestLastSentAt', null);
  const lastSentAt = lastSentAtRaw ? new Date(lastSentAtRaw) : null;
  const now = new Date();

  if (lastSentAt && now.getTime() - lastSentAt.getTime() < intervalHours * 60 * 60 * 1000) {
    return;
  }

  const queued = await Notification.find({
    receiverId: user._id,
    deliveryState: 'digest_queued',
    digestSentAt: null,
  })
    .select('_id type')
    .sort({ createdAt: 1 })
    .lean();

  if (!queued.length) return;

  const tokens = extractAllPushTokens(user);
  if (!tokens.length) return;

  const byType = queued.reduce((acc, notification) => {
    const type = String(notification?.type || 'general').toLowerCase();
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const totalCount = queued.length;
  const language = getUserNotificationLanguage(user);
  const { title, body } = buildDigestCopy(language, totalCount, byType);

  const pushResult = await sendExpoPushNotifications({
    tokens,
    title,
    body,
    data: {
      type: 'digest',
      totalCount,
      byType,
      generatedAt: now.toISOString(),
    },
  });

  if (!pushResult.success) return;

  const queuedIds = queued.map((n) => n._id);
  await Notification.updateMany(
    { _id: { $in: queuedIds } },
    {
      $set: {
        deliveryState: 'digest_sent',
        digestSentAt: now,
        errorMessage: null,
      },
    }
  );

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        'notificationPreferences.digestLastSentAt': now,
      },
    }
  );
}

async function digestTick() {
  if (digestRunning) return;
  digestRunning = true;

  try {
    const users = await User.find({
      'notificationPreferences.digestEnabled': true,
      'notificationPreferences.masterEnabled': { $ne: false },
    })
      .select('_id language notificationPreferences expoPushToken expoPushTokens expoPushRegistrations')
      .lean();

    for (const user of users) {
      await processUserDigest(user);
    }
  } catch (error) {
    console.error('Digest tick error:', error.message);
  } finally {
    digestRunning = false;
  }
}

function startNotificationDigestService() {
  if (digestIntervalRef) return;
  digestTick();
  digestIntervalRef = setInterval(digestTick, DIGEST_POLL_MS);
  console.log('Notification digest service started (1 minute polling).');
}

module.exports = {
  startNotificationDigestService,
};
