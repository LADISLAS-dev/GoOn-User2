import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@goon:notification-preferences';

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  masterEnabled: true,
  allowMessages: true,
  allowBookings: true,
  allowGeneral: true,
  bannerEnabled: true,
  soundEnabled: true,
  badgeEnabled: true,
  quietHoursEnabled: false,
  quietStart: '22:00',
  quietEnd: '07:00',
  pollingIntervalSec: 8,
  digestEnabled: false,
  digestIntervalHours: 4,
  digestLastSentAt: null,
};

function clampPollingInterval(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_NOTIFICATION_PREFERENCES.pollingIntervalSec;
  return Math.max(5, Math.min(120, Math.round(parsed)));
}

function normalizeTime(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return fallback;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return fallback;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return fallback;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function sanitizeNotificationPreferences(raw = {}) {
  const merged = {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(raw && typeof raw === 'object' ? raw : {}),
  };

  return {
    masterEnabled: Boolean(merged.masterEnabled),
    allowMessages: Boolean(merged.allowMessages),
    allowBookings: Boolean(merged.allowBookings),
    allowGeneral: Boolean(merged.allowGeneral),
    bannerEnabled: Boolean(merged.bannerEnabled),
    soundEnabled: Boolean(merged.soundEnabled),
    badgeEnabled: Boolean(merged.badgeEnabled),
    quietHoursEnabled: Boolean(merged.quietHoursEnabled),
    quietStart: normalizeTime(merged.quietStart, DEFAULT_NOTIFICATION_PREFERENCES.quietStart),
    quietEnd: normalizeTime(merged.quietEnd, DEFAULT_NOTIFICATION_PREFERENCES.quietEnd),
    pollingIntervalSec: clampPollingInterval(merged.pollingIntervalSec),
    digestEnabled: Boolean(merged.digestEnabled),
    digestIntervalHours: Math.max(1, Math.min(24, Number(merged.digestIntervalHours || DEFAULT_NOTIFICATION_PREFERENCES.digestIntervalHours))),
    digestLastSentAt: merged.digestLastSentAt || null,
  };
}

export async function getNotificationPreferences() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
    return sanitizeNotificationPreferences(JSON.parse(raw));
  } catch (_) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

export async function saveNotificationPreferences(nextPreferences) {
  const clean = sanitizeNotificationPreferences(nextPreferences);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  return clean;
}

export async function updateNotificationPreferences(partial) {
  const current = await getNotificationPreferences();
  return saveNotificationPreferences({ ...current, ...(partial || {}) });
}

export function shouldAllowNotificationType(preferences, type) {
  const prefs = sanitizeNotificationPreferences(preferences);
  if (!prefs.masterEnabled) return false;

  const normalizedType = String(type || '').toLowerCase();
  if (normalizedType === 'message') return prefs.allowMessages;
  if (normalizedType === 'appointment' || normalizedType === 'booking') return prefs.allowBookings;
  return prefs.allowGeneral;
}
