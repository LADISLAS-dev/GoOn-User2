import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  sanitizeNotificationPreferences,
  shouldAllowNotificationType,
} from './notificationPreferences';

let inAppNotificationFilter = null;
let displayPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };

function toMinutes(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return (h * 60) + m;
}

function isWithinQuietHours(preferences) {
  if (!preferences?.quietHoursEnabled) return false;

  const start = toMinutes(preferences.quietStart);
  const end = toMinutes(preferences.quietEnd);
  const now = new Date();
  const nowMinutes = (now.getHours() * 60) + now.getMinutes();

  if (start === end) return true;
  if (start < end) {
    return nowMinutes >= start && nowMinutes < end;
  }

  // Cross-midnight range: e.g. 22:00 -> 07:00
  return nowMinutes >= start || nowMinutes < end;
}

// Android 8+ requires an explicit notification channel.
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Notifications',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#8F2AC3',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  }).catch(() => {});

  // Create a secondary high-priority channel for messages
  Notifications.setNotificationChannelAsync('messages', {
    name: 'Messages',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#8F2AC3',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  }).catch(() => {});
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const prefs = sanitizeNotificationPreferences(displayPreferences);
    const data = notification?.request?.content?.data || {};
    const type = String(data?.type || '').toLowerCase();

    const typeAllowed = shouldAllowNotificationType(prefs, type);
    const inQuietHours = isWithinQuietHours(prefs);

    const shouldSuppress =
      !typeAllowed ||
      inQuietHours ||
      typeof inAppNotificationFilter === 'function'
        ? Boolean(inAppNotificationFilter(data))
        : false;

    if (shouldSuppress) {
      return {
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }

    return {
      shouldShowBanner: !!prefs.bannerEnabled,
      shouldShowList: !!prefs.bannerEnabled,
      shouldPlaySound: !!prefs.soundEnabled,
      shouldSetBadge: !!prefs.badgeEnabled,
    };
  },
});

export function setNotificationDisplayPreferences(preferences = {}) {
  displayPreferences = sanitizeNotificationPreferences(preferences);
}

export function setInAppNotificationFilter(filterFn) {
  inAppNotificationFilter = typeof filterFn === 'function' ? filterFn : null;
}

export function getPushRuntimeContext() {
  return {
    appOwnership: Constants.appOwnership || null,
    executionEnvironment: Constants.executionEnvironment || null,
  };
}

// ================= TOKEN =================
export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.warn('[Push] Simulator detected - skipping push registration.');
    return null;
  }

  console.log('[Push] Starting push token registration...', {
    platform: Platform.OS,
    appOwnership: Constants.appOwnership,
    executionEnvironment: Constants.executionEnvironment,
  });

  // Check and request permissions
  let permissionResponse = await Notifications.getPermissionsAsync();
  console.log('[Push] Current permission status:', permissionResponse.status);

  if (!permissionResponse.granted && permissionResponse.status !== 'undetermined') {
    // Permission was explicitly denied - guide user to settings
    console.warn('[Push] Permission denied. User must enable in Settings.');
    Alert.alert(
      '🔔 Activer les notifications',
      'Les notifications sont désactivées. Pour les recevoir, activez-les dans les Réglages de votre téléphone.',
      [
        { text: 'Ignorer', style: 'cancel' },
        {
          text: 'Ouvrir les Réglages',
          onPress: () => {
            if (Platform.OS === 'ios') {
              const { Linking } = require('react-native');
              Linking.openURL('app-settings:');
            } else {
              const { Linking, IntentLauncher } = require('react-native');
              Linking.openSettings();
            }
          },
        },
      ]
    );
    return null;
  }

  if (!permissionResponse.granted) {
    const req = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    permissionResponse = req;
    console.log('[Push] Permission requested, result:', req.status);
  }

  if (!permissionResponse.granted && permissionResponse?.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) {
    console.warn('[Push] Permission not granted after request.');
    return null;
  }

  const projectId =
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId;

  console.log('[Push] Using projectId:', projectId || 'NONE (will try without)');

  const tryGetToken = async (withProjectId) => {
    try {
      const token = withProjectId
        ? await Notifications.getExpoPushTokenAsync({ projectId: withProjectId })
        : await Notifications.getExpoPushTokenAsync();
      return token?.data || null;
    } catch (e) {
      console.warn(`[Push] getExpoPushTokenAsync${withProjectId ? '(with projectId)' : '(no projectId)'} failed:`, e.message);
      return null;
    }
  };

  let tokenData = projectId ? await tryGetToken(projectId) : null;
  if (!tokenData) {
    tokenData = await tryGetToken(null);
  }

  if (tokenData) {
    console.log(`[Push] ✅ Token obtained: ${tokenData.slice(0, 35)}...`);
  } else {
    console.warn('[Push] ❌ Could not obtain push token');
  }

  return tokenData;
}

// ================= LISTENERS =================
export function addNotificationReceivedListener(cb) {
  return Notifications.addNotificationReceivedListener(cb);
}

export function addNotificationResponseListener(cb) {
  return Notifications.addNotificationResponseReceivedListener(cb);
}

export async function getLastNotificationResponse() {
  return Notifications.getLastNotificationResponseAsync();
}