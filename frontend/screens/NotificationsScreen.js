import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotifications } from '../context/NotificationContext';
import NotificationCard from '../components/NotificationCard';
import { useLanguage } from '../context/LanguageContext';

const countSummaryByLanguage = {
  fr: (total, unread) => `${total} au total · ${unread} non lues`,
  en: (total, unread) => `${total} total · ${unread} unread`,
  es: (total, unread) => `${total} en total · ${unread} sin leer`,
  pt: (total, unread) => `${total} no total · ${unread} não lidas`,
  zh: (total, unread) => `${total} 条总计 · ${unread} 条未读`,
  hi: (total, unread) => `${total} कुल · ${unread} अपठित`,
  ar: (total, unread) => `${total} إجمالاً · ${unread} غير مقروءة`,
  bn: (total, unread) => `${total} মোট · ${unread} অপঠিত`,
  ru: (total, unread) => `${total} всего · ${unread} непрочитано`,
  ja: (total, unread) => `${total} 件合計 · 未読 ${unread} 件`,
  de: (total, unread) => `${total} insgesamt · ${unread} ungelesen`,
  id: (total, unread) => `${total} total · ${unread} belum dibaca`,
  ur: (total, unread) => `${total} کل · ${unread} غیر پڑھے ہوئے`,
};

const NotificationsScreen = () => {
  const { t, language } = useLanguage();
  const {
    notifications,
    unreadCount,
    total,
    isLoading,
    fetchNotifications,
    markAllRead,
  } = useNotifications();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const renderItem = ({ item }) => <NotificationCard notification={item} />;

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🔕</Text>
      <Text style={styles.emptyTitle}>{t('noNotifications')}</Text>
      <Text style={styles.emptyText}>{t('noNotificationsSub')}</Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.count}>
        {(countSummaryByLanguage[language] || countSummaryByLanguage.en)(total, unreadCount)}
      </Text>
      {unreadCount > 0 && (
        <TouchableOpacity onPress={markAllRead} style={styles.markAllButton}>
          <Text style={styles.markAllText}>{t('markAllRead')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading && notifications.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loadingText}>{t('loading', 'Chargement...')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => fetchNotifications()}
            tintColor="#6C63FF"
            colors={['#6C63FF']}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { color: '#666', fontSize: 14 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 4,
  },
  count: { fontSize: 13, color: '#666' },
  markAllButton: {
    backgroundColor: '#6C63FF22',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  markAllText: { color: '#6C63FF', fontSize: 13, fontWeight: '600' },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#555' },
  emptyText: { fontSize: 14, color: '#444', textAlign: 'center' },
});

export default NotificationsScreen;
