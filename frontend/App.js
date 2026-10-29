import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Constants from 'expo-constants';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, TouchableOpacity } from 'react-native';

import { UserProvider } from './context/UserContext';
import { NotificationProvider } from './context/NotificationContext';
import { LanguageProvider, LanguageContext } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import AppNavigator from './navigation/AppNavigator';

import { navigationRef } from './navigation/navigationRef';

const GIF_SPLASH_DURATION_MS =
  Number(Constants.expoConfig?.extra?.gifSplashDurationMs) || 4400;

class AppErrorBoundary extends React.Component {
  static contextType = LanguageContext;
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: String(error?.message || 'Unexpected error'),
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Fatal UI error captured by boundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <GestureHandlerRootView style={styles.root}>
          <View style={styles.errorWrap}>
            <Text style={styles.errorTitle}>{this.context?.t ? this.context.t('error') : 'An error occurred'}</Text>
            <Text style={styles.errorText}>
              {this.context?.t ? this.context.t('unspecifiedError') || this.context.t('continueAction') : "The app crashed on this screen. Press Retry."}
            </Text>
            <Text style={styles.errorDetail} numberOfLines={3}>{this.state.errorMessage}</Text>
            <TouchableOpacity onPress={this.handleRetry} style={styles.errorButton} activeOpacity={0.85}>
              <Text style={styles.errorButtonText}>{this.context?.t ? this.context.t('continueAction') || 'Retry' : 'Retry'}</Text>
            </TouchableOpacity>
          </View>
        </GestureHandlerRootView>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [showGifSplash, setShowGifSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowGifSplash(false);
    }, GIF_SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  if (showGifSplash) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.splashWrap}>
          <Image
            source={require('./assets/LogoAnimeGoOn.gif')}
            style={styles.splashGif}
            resizeMode="contain"
          />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <LanguageProvider>
      <ThemeProvider>
      <AppErrorBoundary>
        <GestureHandlerRootView style={styles.root}>
          <UserProvider>
            <NotificationProvider>
              <SafeAreaProvider>
                <AppNavigator ref={navigationRef} />
              </SafeAreaProvider>
            </NotificationProvider>
          </UserProvider>
        </GestureHandlerRootView>
      </AppErrorBoundary>
      </ThemeProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splashWrap: {
    flex: 1,
    backgroundColor: '#9320B5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashGif: {
    width: '90%',
    height: '90%',
  },
  errorWrap: {
    flex: 1,
    backgroundColor: '#0D1117',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    color: '#D1D5DB',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorDetail: {
    color: '#9CA3AF',
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#9320B5',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});