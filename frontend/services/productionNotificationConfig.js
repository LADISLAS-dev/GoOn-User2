/**
 * Production Notification Configuration
 * 
 * This script tests and optimizes push notifications for:
 * - Expo Go (development)
 * - EAS builds (production - iOS TestFlight & App Store)
 * - EAS builds (production - Android Play Store)
 */

import Constants from 'expo-constants';

/**
 * Get the current execution environment
 */
export const getExecutionContext = () => {
  return {
    appOwnership: Constants.appOwnership || null,
    executionEnvironment: Constants.executionEnvironment || null,
    projectId: Constants.easConfig?.projectId || null,
    channel: Constants.easConfig?.channel || null,
    isStandalone: Constants.executionEnvironment === 'standalone' || Constants.executionEnvironment === 'bare',
    isExpoGo: Constants.appOwnership === 'expo',
    isProduction: Constants.easConfig?.channel === 'production',
  };
};

/**
 * Log context info (useful for debugging production builds)
 */
export const logExecutionContext = () => {
  const context = getExecutionContext();
  console.log('[PUSH] Execution Context:', context);
  
  if (context.isExpoGo) {
    console.log('[PUSH] ℹ️  Running in Expo Go (development)');
  } else if (context.isStandalone && context.isProduction) {
    console.log('[PUSH] ✅ Running in Production Build (EAS)');
  } else if (context.isStandalone) {
    console.log('[PUSH] 🔧 Running in Standalone Build (development/preview)');
  }
};

/**
 * Validate push token for the current environment
 */
export const isValidPushTokenForEnvironment = (token) => {
  if (!token || typeof token !== 'string') return false;
  
  // Accept both Expo Go and production tokens
  const isExpoToken = token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');
  
  if (!isExpoToken) return false;
  
  const context = getExecutionContext();
  
  // In Expo Go, accept ExponentPushToken
  if (context.isExpoGo && token.startsWith('ExponentPushToken[')) {
    return true;
  }
  
  // In production builds, accept ExpoPushToken
  if (context.isStandalone && token.startsWith('ExpoPushToken[')) {
    return true;
  }
  
  // Accept modern tokens in any environment
  if (token.startsWith('ExpoPushToken[')) {
    return true;
  }
  
  return false;
};

/**
 * Get recommended token type for current environment
 */
export const getRecommendedTokenType = () => {
  const context = getExecutionContext();
  
  if (context.isExpoGo) {
    return 'ExponentPushToken'; // Expo Go
  } else if (context.isStandalone) {
    return 'ExpoPushToken'; // Production/Preview builds
  }
  
  return 'ExpoPushToken'; // Default to modern tokens
};
