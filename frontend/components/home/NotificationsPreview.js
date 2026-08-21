import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import EmptyNotification from './EmptyNotifications'; // ou ton chemin réel
import NotificationCard from '../NotificationCard'; // ou ton chemin réel
import styles from '../../styles/homeStyles';
import { useLanguage } from '../../context/LanguageContext';

const previewCopyByLanguage = {
  fr: { title: 'Notifications récentes', seeAll: 'Tout voir →' },
  en: { title: 'Recent Notifications', seeAll: 'See all →' },
  es: { title: 'Notificaciones recientes', seeAll: 'Ver todo →' },
  pt: { title: 'Notificações recentes', seeAll: 'Ver tudo →' },
};


const NotificationsPreview = ({
  notifications,
  isUserA,
  navigation,
}) => {
  const { language } = useLanguage();
  const copy = previewCopyByLanguage[language] || previewCopyByLanguage.en;

  // Empty state propre
  if (!notifications || notifications.length === 0) {
    return <EmptyNotification isUserA={isUserA} />;
  }

  const recentNotifications = notifications.slice(0, 3);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{copy.title}</Text>

        {notifications.length > 3 && (
          <Text
            style={styles.seeAll}
            onPress={() => navigation?.navigate('Notifications')}
          >
            {copy.seeAll}
          </Text>
        )}
      </View>

      {/* List */}
      {recentNotifications.map((item) => (
        <NotificationCard
          key={item._id}
          notification={item}
        />
      ))}
    </View>
  );
};

export default NotificationsPreview;