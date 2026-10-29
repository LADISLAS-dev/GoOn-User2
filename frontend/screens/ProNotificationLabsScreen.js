import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';

import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import {
  getNotificationPreferencesApi,
  getPushTokenDiagnostic,
  removePushToken,
  sendDiagnosticTestPush,
  updatePushToken,
  updateNotificationPreferencesApi,
} from '../services/api';
import {
  getPushRuntimeContext,
  registerForPushNotifications,
  setNotificationDisplayPreferences,
} from '../services/notificationService';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  saveNotificationPreferences,
} from '../services/notificationPreferences';

const POLLING_OPTIONS = [8, 15, 30, 60];
const DIGEST_INTERVAL_OPTIONS = [1, 2, 4, 8, 12, 24];

const C = {
  bg: '#F5F3FF',
  card: '#FFFFFF',
  border: '#E9D5FF',
  title: '#1F1147',
  text: '#334155',
  muted: '#64748B',
  accent: '#7C3AED',
  accentSoft: '#EDE9FE',
  success: '#10B981',
  danger: '#EF4444',
};

function OptionRow({ label, hint, value, onChange, disabled = false }) {
  return (
    <View style={[styles.optionRow, disabled && styles.optionRowDisabled]}>
      <View style={styles.optionTextWrap}>
        <Text style={styles.optionLabel}>{label}</Text>
        {hint ? <Text style={styles.optionHint}>{hint}</Text> : null}
      </View>
      <Switch
        trackColor={{ false: '#CBD5E1', true: '#C4B5FD' }}
        thumbColor={value ? C.accent : '#FFFFFF'}
        value={Boolean(value)}
        onValueChange={onChange}
        disabled={disabled}
      />
    </View>
  );
}

export default function NotificationLabsScreen() {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useUser();

  const [prefs, setPrefs] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [tokenInfo, setTokenInfo] = useState({ token: null, count: 0 });

  const tr = useCallback((key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  }, [t]);

  const loadState = useCallback(async () => {
    setLoading(true);
    try {
      const [storedPrefs, permissions, diagnostic] = await Promise.all([
        getNotificationPreferences(),
        Notifications.getPermissionsAsync(),
        isAuthenticated ? getPushTokenDiagnostic().catch(() => null) : Promise.resolve(null),
      ]);

      const remotePrefs = isAuthenticated
        ? await getNotificationPreferencesApi().catch(() => null)
        : null;
      const effectivePrefs = remotePrefs ? { ...storedPrefs, ...remotePrefs } : storedPrefs;

      setPrefs(effectivePrefs);
      setNotificationDisplayPreferences(effectivePrefs);
      setPermissionStatus(permissions?.status || 'unknown');
      setTokenInfo({
        token: diagnostic?.expoPushToken || null,
        count: Number(diagnostic?.totalTokens || 0),
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const persist = useCallback(async (next) => {
    setSaving(true);
    try {
      const saved = await saveNotificationPreferences(next);
      if (isAuthenticated) {
        await updateNotificationPreferencesApi(saved).catch(() => null);
      }
      setPrefs(saved);
      setNotificationDisplayPreferences(saved);
      return saved;
    } finally {
      setSaving(false);
    }
  }, [isAuthenticated]);

  const handleMasterToggle = useCallback(async (enabled) => {
    const saved = await persist({ ...prefs, masterEnabled: enabled });

    if (!user?._id) return;

    if (!enabled) {
      if (user?.expoPushToken) {
        await removePushToken(user._id, user.expoPushToken);
      }
      await loadState();
      return;
    }

    const token = await registerForPushNotifications();
    if (!token) {
      Alert.alert(tr('error', 'Error'), tr('noPushToken', 'Unable to retrieve a push token on this device.'));
      return;
    }

    await updatePushToken(user._id, token, getPushRuntimeContext());
    setNotificationDisplayPreferences(saved);
    await loadState();
  }, [loadState, persist, prefs, tr, user]);

  const handlePermissionRequest = useCallback(async () => {
    const req = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    setPermissionStatus(req?.status || 'unknown');
  }, []);

  const handleResyncToken = useCallback(async () => {
    if (!user?._id) return;

    const token = await registerForPushNotifications();
    if (!token) {
      Alert.alert(tr('error', 'Error'), tr('noPushToken', 'Unable to retrieve a push token on this device.'));
      return;
    }

    await updatePushToken(user._id, token, getPushRuntimeContext());
    await loadState();
    Alert.alert(tr('success', 'Succès'), tr('profileUpdated', 'Profil mis a jour'));
  }, [loadState, tr, user?._id]);

  const handleSendTest = useCallback(async () => {
    try {
      const result = await sendDiagnosticTestPush();
      Alert.alert(
        tr('success', 'Succès'),
        `${tr('sendNotificationButton', 'Notification envoyée')} (${result?.messagesQueued || 0})`
      );
    } catch (error) {
      Alert.alert(tr('error', 'Erreur'), error?.response?.data?.error || error?.message || 'Test push failed');
    }
  }, [tr]);

  const permissionLabel = useMemo(() => {
    if (permissionStatus === 'granted') return tr('permissionGranted', 'Granted');
    if (permissionStatus === 'denied') return tr('permissionDenied', 'Denied');
    if (permissionStatus === 'undetermined') return tr('permissionUndetermined', 'Undetermined');
    return permissionStatus;
  }, [permissionStatus, tr]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={C.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{tr('notificationLabsTitle', 'Notification Labs')}</Text>
        <Text style={styles.subtitle}>{tr('notificationLabsSubtitle', 'Push settings and experience')}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr('status', 'Status')}</Text>
          <Text style={styles.statusLine}>{tr('permission', 'Permission')}: <Text style={styles.statusValue}>{permissionLabel}</Text></Text>
          <Text style={styles.statusLine}>{tr('tokenLabel', 'Token')}: <Text style={styles.statusValue}>{tokenInfo.token ? tr('available', 'Available') : tr('missing', 'Missing')}</Text></Text>
          <Text style={styles.statusLine}>{tr('storedTokens', 'Stored tokens')}: <Text style={styles.statusValue}>{tokenInfo.count}</Text></Text>

          <View style={styles.inlineActions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handlePermissionRequest}>
              <Text style={styles.secondaryBtnText}>{tr('requestPermission', 'Request permission')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => Linking.openSettings()}>
              <Text style={styles.secondaryBtnText}>{tr('openSettings', 'Open settings')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr('global', 'Global')}</Text>
          <OptionRow
            label={tr('enableNotifications', 'Enable notifications')}
            hint={tr('enableNotificationsHint', 'Disable to stop pushes for this device')}
            value={prefs.masterEnabled}
            onChange={handleMasterToggle}
            disabled={saving}
          />
          <OptionRow
            label={tr('messages', 'Messages')}
            hint={tr('messagesNotifHint', 'Chat and direct message notifications')}
            value={prefs.allowMessages}
            onChange={(value) => persist({ ...prefs, allowMessages: value })}
            disabled={!prefs.masterEnabled || saving}
          />
          <OptionRow
            label={tr('bookings', 'Bookings')}
            hint={tr('bookingsNotifHint', 'Appointments and booking status updates')}
            value={prefs.allowBookings}
            onChange={(value) => persist({ ...prefs, allowBookings: value })}
            disabled={!prefs.masterEnabled || saving}
          />
          <OptionRow
            label={tr('generalUpdates', 'General updates')}
            hint={tr('generalUpdatesHint', 'Other app events and announcements')}
            value={prefs.allowGeneral}
            onChange={(value) => persist({ ...prefs, allowGeneral: value })}
            disabled={!prefs.masterEnabled || saving}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr('display', 'Display')}</Text>
          <OptionRow
            label={tr('showBanners', 'Show banners')}
            hint={tr('showBannersHint', 'Display push banner on incoming notifications')}
            value={prefs.bannerEnabled}
            onChange={(value) => persist({ ...prefs, bannerEnabled: value })}
            disabled={!prefs.masterEnabled || saving}
          />
          <OptionRow
            label={tr('playSound', 'Play sound')}
            hint={tr('playSoundHint', 'Play sound when receiving notifications')}
            value={prefs.soundEnabled}
            onChange={(value) => persist({ ...prefs, soundEnabled: value })}
            disabled={!prefs.masterEnabled || saving}
          />
          <OptionRow
            label={tr('updateBadge', 'Update badge')}
            hint={tr('updateBadgeHint', 'Display unread count on app icon')}
            value={prefs.badgeEnabled}
            onChange={(value) => persist({ ...prefs, badgeEnabled: value })}
            disabled={!prefs.masterEnabled || saving}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr('quietHours', 'Quiet hours')}</Text>
          <OptionRow
            label={tr('enableQuietHours', 'Enable quiet hours')}
            hint={`${prefs.quietStart} - ${prefs.quietEnd}`}
            value={prefs.quietHoursEnabled}
            onChange={(value) => persist({ ...prefs, quietHoursEnabled: value })}
            disabled={!prefs.masterEnabled || saving}
          />
          <View style={styles.inlineActions}>
            <TouchableOpacity
              style={[styles.secondaryBtn, !prefs.masterEnabled && styles.btnDisabled]}
              disabled={!prefs.masterEnabled}
              onPress={() => persist({ ...prefs, quietStart: '22:00', quietEnd: '07:00' })}
            >
              <Text style={styles.secondaryBtnText}>{tr('nightPreset', 'Night preset')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, !prefs.masterEnabled && styles.btnDisabled]}
              disabled={!prefs.masterEnabled}
              onPress={() => persist({ ...prefs, quietStart: '13:00', quietEnd: '14:00' })}
            >
              <Text style={styles.secondaryBtnText}>{tr('lunchPreset', 'Lunch preset')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr('sync', 'Sync')}</Text>
          <Text style={styles.optionHint}>{tr('backgroundRefreshInterval', 'Background refresh interval')}</Text>
          <View style={styles.inlineActions}>
            {POLLING_OPTIONS.map((seconds) => {
              const active = Number(prefs.pollingIntervalSec) === seconds;
              return (
                <TouchableOpacity
                  key={String(seconds)}
                  style={[styles.chipBtn, active && styles.chipBtnActive]}
                  onPress={() => persist({ ...prefs, pollingIntervalSec: seconds })}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{seconds}s</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.inlineActions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleResyncToken}>
              <Text style={styles.primaryBtnText}>{tr('resyncToken', 'Re-sync token')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSendTest}>
              <Text style={styles.primaryBtnText}>{tr('sendTestPush', 'Send test push')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr('digestMode', 'Digest mode')}</Text>
          <OptionRow
            label={tr('enableDigestSummary', 'Enable digest summary')}
            hint={tr('enableDigestSummaryHint', 'Group notifications and receive a periodic summary')}
            value={prefs.digestEnabled}
            onChange={(value) => persist({ ...prefs, digestEnabled: value })}
            disabled={!prefs.masterEnabled || saving}
          />
          <Text style={styles.optionHint}>{tr('digestInterval', 'Digest interval')}</Text>
          <View style={styles.inlineActions}>
            {DIGEST_INTERVAL_OPTIONS.map((hours) => {
              const active = Number(prefs.digestIntervalHours) === hours;
              return (
                <TouchableOpacity
                  key={String(hours)}
                  style={[styles.chipBtn, active && styles.chipBtnActive, !prefs.digestEnabled && styles.btnDisabled]}
                  disabled={!prefs.digestEnabled}
                  onPress={() => persist({ ...prefs, digestIntervalHours: hours })}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{hours}h</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: C.title,
  },
  subtitle: {
    marginTop: 2,
    marginBottom: 8,
    color: C.muted,
    fontSize: 13,
  },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.title,
  },
  statusLine: {
    color: C.text,
    fontSize: 13,
  },
  statusValue: {
    fontWeight: '800',
    color: C.title,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 12,
  },
  optionRowDisabled: {
    opacity: 0.45,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionLabel: {
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
  },
  optionHint: {
    marginTop: 2,
    color: C.muted,
    fontSize: 12,
  },
  inlineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#DDD6FE',
    backgroundColor: C.accentSoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  secondaryBtnText: {
    color: C.accent,
    fontWeight: '700',
    fontSize: 12,
  },
  primaryBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  chipBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#F8FAFC',
  },
  chipBtnActive: {
    borderColor: '#C4B5FD',
    backgroundColor: '#EDE9FE',
  },
  chipText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 12,
  },
  chipTextActive: {
    color: C.accent,
  },
  btnDisabled: {
    opacity: 0.45,
  },
});
