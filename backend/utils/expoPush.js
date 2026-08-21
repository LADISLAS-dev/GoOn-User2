const fetch = require('node-fetch');
const logger = require('./logger');
const { extractAllPushTokens } = require('./pushTokenSelection');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';

/**
 * Validates an Expo push token format
 * @param {string} token
 * @returns {boolean}
 */
const isValidExpoPushToken = (token) => {
  if (!token || typeof token !== 'string') return false;
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
};

const normalizePushTokens = (tokens = []) => {
  return Array.from(
    new Set(
      tokens
        .filter((token) => typeof token === 'string')
        .map((token) => token.trim())
        .filter((token) => token.length > 0)
    )
  ).filter(isValidExpoPushToken);
};

const DEFAULT_NOTIFICATION_PREFERENCES = {
  masterEnabled: true,
  allowMessages: true,
  allowBookings: true,
  allowGeneral: true,
  digestEnabled: false,
  digestIntervalHours: 4,
};

const resolveNotificationPreferences = (user = {}) => {
  const raw = user?.notificationPreferences && typeof user.notificationPreferences === 'object'
    ? user.notificationPreferences
    : {};

  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...raw,
    digestIntervalHours: Math.max(1, Math.min(24, Number(raw?.digestIntervalHours || DEFAULT_NOTIFICATION_PREFERENCES.digestIntervalHours))),
  };
};

const isTypeAllowedByPreferences = (preferences, type) => {
  if (!preferences?.masterEnabled) return false;

  const normalizedType = String(type || '').toLowerCase();
  if (normalizedType === 'message') return Boolean(preferences.allowMessages);
  if (normalizedType === 'appointment' || normalizedType === 'booking') {
    return Boolean(preferences.allowBookings);
  }

  return Boolean(preferences.allowGeneral);
};

/**
 * Remove a stale token from the User document when Expo reports DeviceNotRegistered.
 * Best-effort — never throws.
 */
const removeStaleToken = async (token) => {
  try {
    const User = require('../models/User');
    await User.updateMany(
      {
        $or: [{ expoPushToken: token }, { expoPushTokens: token }],
      },
      {
        $unset: { expoPushToken: '' },
        $pull: { expoPushTokens: token, expoPushRegistrations: { token } },
      }
    );
    logger.warn(`[EXPO] Stale token removed from DB: ${token.substring(0, 30)}...`);
  } catch (e) {
    logger.warn(`[EXPO] Failed to remove stale token: ${e.message}`);
  }
};

/**
 * Send a single push notification via Expo Push API
 * @param {Object} params
 * @param {string} params.to - Expo push token
 * @param {string} params.title - Notification title
 * @param {string} params.body - Notification body
 * @param {Object} [params.data] - Extra data payload
 * @returns {Promise<{success: boolean, ticketId?: string, error?: string, deviceNotRegistered?: boolean}>}
 */
const sendExpoPushNotification = async ({ to, title, body, data = {} }) => {
  if (!isValidExpoPushToken(to)) {
    console.log('[EXPO] Invalid token:', to);
    logger.warn(`Invalid Expo push token: ${to}`);
    return { success: false, error: 'Invalid or missing Expo push token' };
  }

  const message = {
    to,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
    channelId: 'default',
  };

  const attemptSend = async () => {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
      timeout: 10000,
    });
    return response;
  };

  const fetchReceipt = async (ticketId) => {
    if (!ticketId) return null;

    try {
      // Expo receipts are eventually consistent; a short delay makes response stable.
      await new Promise((resolve) => setTimeout(resolve, 1400));

      const response = await fetch(EXPO_RECEIPTS_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: [ticketId] }),
        timeout: 10000,
      });

      if (!response.ok) {
        const errText = await response.text();
        logger.warn(`Expo receipt HTTP error ${response.status}: ${errText}`);
        return null;
      }

      const payload = await response.json();
      return payload?.data?.[ticketId] || null;
    } catch (error) {
      logger.warn(`Expo receipt fetch failed: ${error.message}`);
      return null;
    }
  };

  try {
    console.log('[EXPO] Sending push to token:', to.substring(0, 30) + '...');
    logger.info(`Sending push notification to token: ${to.substring(0, 30)}...`);

    let response;
    try {
      response = await attemptSend();
    } catch (firstError) {
      // One automatic retry after a brief delay on network/timeout errors.
      console.log('[EXPO] First attempt failed, retrying once...', firstError.message);
      await new Promise((r) => setTimeout(r, 1500));
      response = await attemptSend();
    }

    console.log('[EXPO] Response status:', response.status);

    if (!response.ok) {
      const errText = await response.text();
      console.log('[EXPO] HTTP error response:', errText);
      logger.error(`Expo API HTTP error ${response.status}: ${errText}`);
      return { success: false, error: `Expo API error: ${response.status}` };
    }

    const result = await response.json();
    console.log('[EXPO] Response body:', JSON.stringify(result));

    const firstTicket = Array.isArray(result?.data)
      ? result.data[0]
      : result?.data;

    if (firstTicket && firstTicket.status === 'ok') {
      console.log('[EXPO] Success! Ticket:', firstTicket.id);
      logger.success(`Push notification sent. Ticket ID: ${firstTicket.id}`);

      const receipt = await fetchReceipt(firstTicket.id);
      if (receipt && receipt.status === 'error') {
        const receiptError = receipt?.details?.error || 'UnknownReceiptError';
        logger.error(`Expo receipt error: ${receipt.message} (${receiptError})`);

        const isStaleToken = receiptError === 'DeviceNotRegistered';

        if (isStaleToken) {
          await removeStaleToken(to);
        }

        return {
          success: false,
          ticketId: firstTicket.id,
          error: receipt.message || 'Expo receipt delivery error',
          deviceNotRegistered: isStaleToken,
          receiptError,
        };
      }

      return { success: true, ticketId: firstTicket.id, receiptStatus: receipt?.status || null };
    }

    if (firstTicket && firstTicket.status === 'error') {
      console.log('[EXPO] Error response from Expo:', firstTicket.message);
      logger.error(`Push notification failed: ${firstTicket.message} (${firstTicket.details?.error})`);
      const isStaleToken =
        firstTicket.details?.error === 'DeviceNotRegistered';
      if (isStaleToken) {
        await removeStaleToken(to);
      }
      return {
        success: false,
        error: firstTicket.message || 'Expo delivery error',
        deviceNotRegistered: isStaleToken,
      };
    }

    console.log('[EXPO] Unexpected response:', JSON.stringify(result));
    logger.warn(`Unexpected Expo response: ${JSON.stringify(result)}`);
    return { success: false, error: 'Unexpected Expo push response format' };
  } catch (error) {
    console.log('[EXPO] Exception:', error.message);
    if (error.type === 'request-timeout') {
      logger.error('Push notification request timed out');
      return { success: false, error: 'Request timeout reaching Expo push server' };
    }
    logger.error(`sendExpoPushNotification exception: ${error.message}`);
    return { success: false, error: error.message };
  }
};

const sendExpoPushNotifications = async ({ tokens = [], title, body, data = {}, skipTokens = [] }) => {
  const skipSet = new Set(normalizePushTokens(skipTokens));
  const candidateTokens = normalizePushTokens(tokens).filter((token) => !skipSet.has(token));

  if (!candidateTokens.length) {
    return {
      success: false,
      successCount: 0,
      failureCount: 0,
      tokens: [],
      results: [],
      error: 'No push tokens found for user',
    };
  }

  const settled = await Promise.allSettled(
    candidateTokens.map((token) =>
      sendExpoPushNotification({
        to: token,
        title,
        body,
        data,
      })
    )
  );

  const successCount = settled.filter(
    (result) => result.status === 'fulfilled' && result.value?.success === true
  ).length;

  const failureCount = settled.length - successCount;
  const firstFailure = settled.find(
    (result) => result.status === 'rejected' || result.value?.success === false
  );

  return {
    success: successCount > 0,
    successCount,
    failureCount,
    tokens: candidateTokens,
    results: settled,
    error:
      successCount > 0
        ? null
        : firstFailure?.reason?.message || firstFailure?.value?.error || 'Failed to send push notification',
  };
};

const sendExpoPushNotificationToUser = async (user, payload = {}, options = {}) => {
  const preferences = resolveNotificationPreferences(user);
  const notificationType = String(payload?.data?.type || '').toLowerCase();
  const forceImmediate = Boolean(options?.forceImmediate);

  if (!isTypeAllowedByPreferences(preferences, notificationType)) {
    return {
      success: false,
      successCount: 0,
      failureCount: 0,
      skipped: true,
      reason: 'Notification disabled by user preferences',
      error: 'Notification disabled by user preferences',
    };
  }

  const notificationId = payload?.data?.notificationId ? String(payload.data.notificationId) : null;
  if (preferences.digestEnabled && !forceImmediate) {
    if (notificationId) {
      try {
        const Notification = require('../models/Notification');
        await Notification.findByIdAndUpdate(notificationId, {
          $set: {
            deliveryState: 'digest_queued',
            digestQueuedAt: new Date(),
            errorMessage: null,
          },
        });
      } catch (error) {
        logger.warn(`Failed to queue notification for digest (${notificationId}): ${error.message}`);
      }
    }

    return {
      success: true,
      successCount: 0,
      failureCount: 0,
      queuedForDigest: true,
      error: null,
    };
  }

  const tokens = options.tokens || extractAllPushTokens(user);
  return sendExpoPushNotifications({
    tokens,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    skipTokens: options.skipTokens || [],
  });
};

module.exports = {
  sendExpoPushNotification,
  sendExpoPushNotifications,
  sendExpoPushNotificationToUser,
  isValidExpoPushToken,
  normalizePushTokens,
};
