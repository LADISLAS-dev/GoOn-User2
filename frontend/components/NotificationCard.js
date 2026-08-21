import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNotifications } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedNotificationCopy } from '../utils/notificationI18n';

const formatDate = (dateStr, t, locale) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t('justNow');
  if (diffMin < 60) return t('minutesAgo', `${diffMin}m`).replace('{count}', String(diffMin));
  if (diffHr < 24) return t('hoursAgo', `${diffHr}h`).replace('{count}', String(diffHr));
  if (diffDay < 7) return t('daysAgo', `${diffDay}d`).replace('{count}', String(diffDay));
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
};

const STATUS_CONFIG = {
  sent: { labelKey: 'notifStatusSent', color: '#4CAF50', emoji: '✅' },
  delivered: { labelKey: 'notifStatusDelivered', color: '#4CAF50', emoji: '✅' },
  pending: { labelKey: 'notifStatusPending', color: '#FF9800', emoji: '⏳' },
  failed: { labelKey: 'notifStatusFailed', color: '#F44336', emoji: '❌' },
};

const LOCALE_BY_LANGUAGE = {
  fr: 'fr-FR',
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-PT',
};

const NotificationCard = ({ notification, compact = false }) => {
  const { markAsRead } = useNotifications();
  const { t, language } = useLanguage();

  const {
    _id,
    message,
    title,
    senderId,
    receiverId,
    status,
    read,
    createdAt,
    errorMessage,
  } = notification;

  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const senderName = senderId?.name || t('unknownSender', 'Unknown sender');
  const senderRole = senderId?.role || '?';
  const roleColor = senderRole === 'A' ? '#6C63FF' : '#FF6584';
  const { title: displayTitle, message: displayMessage } = getLocalizedNotificationCopy(notification, language, {
    senderName,
    fallbackTitle: title,
    fallbackMessage: message,
  });

  const handlePress = useCallback(() => {
    if (!read) {
      markAsRead(_id);
    }
  }, [_id, read, markAsRead]);

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.card, styles.compactCard, !read && styles.unreadCard]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {!read && <View style={styles.unreadDot} />}
        <View style={styles.compactLeft}>
          <View style={[styles.roleChip, { backgroundColor: roleColor + '22' }]}>
            <Text style={[styles.roleChipText, { color: roleColor }]}>{senderRole}</Text>
          </View>
          <Text style={styles.compactMessage} numberOfLines={1}>
            {displayTitle}
          </Text>
        </View>
        <Text style={styles.compactTime}>{formatDate(createdAt, t, LOCALE_BY_LANGUAGE[language] || 'en-US')}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, !read && styles.unreadCard]}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      {!read && <View style={styles.unreadDot} />}

      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={styles.senderInfo}>
          <View style={[styles.avatar, { backgroundColor: roleColor }]}>
            <Text style={styles.avatarText}>{senderRole}</Text>
          </View>
          <View>
            <Text style={styles.senderName}>{senderName}</Text>
            <Text style={styles.senderRole}>{t('senderRoleLabel').replace('{role}', senderRole)}</Text>
          </View>
        </View>
        <View style={styles.meta}>
          <Text style={styles.timestamp}>{formatDate(createdAt, t, LOCALE_BY_LANGUAGE[language] || 'en-US')}</Text>
          <View style={[styles.statusChip, { backgroundColor: statusConfig.color + '22' }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.emoji} {t(statusConfig.labelKey)}
            </Text>
          </View>
        </View>
      </View>

      {/* Message */}
      <Text style={styles.title}>{displayTitle}</Text>
      <Text style={styles.message}>{displayMessage}</Text>

      {/* Error message if failed */}
      {status === 'failed' && errorMessage && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
        </View>
      )}

      {!read && (
        <Text style={styles.tapToRead}>{t('tapToRead')}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A2A3E',
    position: 'relative',
  },
  unreadCard: {
    borderColor: '#6C63FF44',
    backgroundColor: '#1E1A35',
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6C63FF',
  },
  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    marginRight: 8,
  },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleChipText: { fontSize: 11, fontWeight: '700' },
  compactMessage: { flex: 1, fontSize: 14, color: '#CCC' },
  compactTime: { fontSize: 11, color: '#555', flexShrink: 0 },
  // Full card styles
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  senderInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  senderName: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  senderRole: { fontSize: 11, color: '#666', marginTop: 1 },
  meta: { alignItems: 'flex-end', gap: 6 },
  timestamp: { fontSize: 11, color: '#555' },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 4,
  },
  message: {
    fontSize: 15,
    color: '#DDD',
    lineHeight: 22,
  },
  errorBox: {
    backgroundColor: '#F4433615',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F4433633',
  },
  errorText: { fontSize: 12, color: '#F44336' },
  tapToRead: {
    fontSize: 11,
    color: '#6C63FF',
    marginTop: 8,
    fontWeight: '500',
  },
});

export default NotificationCard;
