/**
 * Enhanced Production Token Logger
 * 
 * This utility provides detailed logging for push token registration,
 * especially for production builds (EAS).
 */

const getTokenType = (token) => {
  if (!token || typeof token !== 'string') return 'INVALID';
  
  if (token.startsWith('ExponentPushToken[')) {
    return 'EXPO_GO'; // Development - Expo Go
  }
  
  if (token.startsWith('ExpoPushToken[')) {
    return 'PRODUCTION'; // Production - EAS Build
  }
  
  return 'UNKNOWN';
};

const getTokenInfo = (token) => {
  const type = getTokenType(token);
  const prefix = token ? token.substring(0, 30) : 'null';
  
  return {
    type,
    prefix: prefix + '...',
    full: token,
    isProduction: type === 'PRODUCTION',
  };
};

const logTokenRegistration = (userId, token, context = {}) => {
  const info = getTokenInfo(token);
  
  const log = {
    '[PUSH-TOKEN]': 'REGISTERED',
    userId,
    token: info.prefix,
    type: info.type,
    environment: context.executionEnvironment,
    appOwnership: context.appOwnership,
  };
  
  if (info.type === 'PRODUCTION') {
    console.log('🚀', JSON.stringify(log));
  } else if (info.type === 'EXPO_GO') {
    console.log('🧪', JSON.stringify(log));
  } else {
    console.log('⚠️ ', JSON.stringify(log));
  }
};

const logTokenSelection = (userId, availableTokens, selectedTokens, reason = '') => {
  if (availableTokens.length === 0) {
    console.log(`⚠️ [PUSH-TOKEN] No tokens for user ${userId} - ${reason}`);
    return;
  }
  
  const available = availableTokens.map((t) => ({
    type: getTokenType(t),
    prefix: t.substring(0, 20) + '...',
  }));
  
  const selected = selectedTokens.map((t) => ({
    type: getTokenType(t),
    prefix: t.substring(0, 20) + '...',
  }));
  
  console.log('[PUSH-TOKEN] Selection:', {
    userId,
    available: available.length,
    selected: selected.length,
    preferredType: selected[0]?.type,
    availableTypes: available.map((a) => a.type).join(', '),
    reason,
  });
};

const logPushAttempt = (notificationId, tokens) => {
  const breakdown = tokens.reduce((acc, token) => {
    const type = getTokenType(token);
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  const log = {
    '[PUSH-SEND]': 'ATTEMPT',
    notificationId,
    totalTokens: tokens.length,
    breakdown,
  };
  
  console.log('📤', JSON.stringify(log));
};

const logPushResult = (notificationId, results, tokens) => {
  let successCount = 0;
  let failureCount = 0;
  const byType = { PRODUCTION: { success: 0, failed: 0 }, EXPO_GO: { success: 0, failed: 0 }, UNKNOWN: { success: 0, failed: 0 } };
  
  results.forEach((result, i) => {
    const tokenType = getTokenType(tokens[i]);
    
    if (result.status === 'fulfilled' && result.value?.success) {
      successCount++;
      byType[tokenType].success++;
    } else {
      failureCount++;
      byType[tokenType].failed++;
    }
  });
  
  const log = {
    '[PUSH-SEND]': 'RESULT',
    notificationId,
    success: successCount,
    failed: failureCount,
    byType,
  };
  
  const icon = successCount > 0 ? '✅' : '❌';
  console.log(icon, JSON.stringify(log));
};

module.exports = {
  getTokenType,
  getTokenInfo,
  logTokenRegistration,
  logTokenSelection,
  logPushAttempt,
  logPushResult,
};
