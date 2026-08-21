import React from 'react';
import { View, Text } from 'react-native';

import styles from '../../styles/homeStyles';

const TokenStatus = ({ pushToken }) => {
  return (
    <View style={styles.tokenStatus}>
      <View
        style={[
          styles.tokenDot,
          {
            backgroundColor: pushToken
              ? '#4CAF50'
              : '#FF9800',
          },
        ]}
      />

      <Text style={styles.tokenLabel}>
        {pushToken
          ? 'Push notifications active'
          : 'No push token'}
      </Text>
    </View>
  );
};

export default TokenStatus;