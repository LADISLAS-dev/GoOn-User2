import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';

import styles from '../../styles/homeStyles';
import { useLanguage } from '../../context/LanguageContext';

const Header = ({
  user,
  roleColor,
  isUserA,
  onLogout,
}) => {
  const { t } = useLanguage();

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>
          {t('welcomeBack')} 👋
        </Text>

        <View style={styles.userPill}>
          <View
            style={[
              styles.roleDot,
              { backgroundColor: roleColor },
            ]}
          />

          <Text style={styles.userName}>
            {user?.name}
          </Text>

          <View
            style={[
              styles.roleBadge,
              {
                backgroundColor: roleColor + '22',
              },
            ]}
          >
            <Text
              style={[
                styles.roleText,
                { color: roleColor },
              ]}
            >
              {isUserA ? t('sender') : t('receiver')}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => {
          console.log('logout pressed');

          if (typeof onLogout === 'function') {
            onLogout();
          } else {
            console.log('onLogout is undefined');
          }
        }}
        style={styles.logoutButton}
      >
        <Text style={styles.logoutText}>
          {t('logout')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default Header;