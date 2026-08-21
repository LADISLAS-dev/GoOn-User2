import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

const LoadingScreen = ({ message }) => {
  const { t } = useLanguage();
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6C63FF" />
      <Text style={styles.text}>{message || t('loading', 'Loading...')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    color: '#666',
    fontSize: 14,
  },
});

export default LoadingScreen;
