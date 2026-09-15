import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

import { registerUser, loginUser, logoutUser } from '../services/authService';
import { getPushRuntimeContext, registerForPushNotifications } from '../services/notificationService';
import {
  createUserProfile,
  deleteMyAccount,
  getAllUsers,
  getUserByFirebaseUid,
  sendNotification,
  getNotifications,
  createAppointment,
  updateAppointmentStatus,
  updatePushToken,
  removePushToken,
  getPushTokenDiagnostic,
} from '../services/api';
import { API_URL } from '../env';
import { resolveAvatarUri } from '../utils/profileUtils';
import { getExecutionContext } from '../services/productionNotificationConfig';

const UserContext = createContext();
const DELETED_ACCOUNT_MARKERS_KEY = 'deleted_account_markers_v1';

const normalizeUserForClient = (nextUser) => {
  if (!nextUser) return nextUser;
  return {
    ...nextUser,
    avatar: resolveAvatarUri(nextUser.avatar || '', API_URL),
  };
};

const isAccountDeletedError = (error) => {
  const status = error?.response?.status;
  const code = String(error?.response?.data?.code || '').toUpperCase();
  const message = String(error?.response?.data?.error || error?.message || '').toLowerCase();

  return (
    code === 'ACCOUNT_DELETED' ||
    (status === 403 && /account deleted|compte supprime|cuenta eliminada|conta excluida/.test(message))
  );
};

const buildDeletedAccountAuthError = (message) => ({
  success: false,
  errorCode: 'ACCOUNT_DELETED',
  error: message,
});

const PUSH_ALERT_LANGUAGE_CODES = ['en', 'fr', 'es', 'pt', 'zh', 'hi', 'ar', 'bn', 'ru', 'ja', 'de', 'id', 'ur'];

function getDeviceLanguageCode() {
  try {
    const locale = Intl?.DateTimeFormat?.().resolvedOptions?.().locale || '';
    const normalized = String(locale).toLowerCase();
    const base = normalized.split(/[-_]/)[0] || '';

    if (base === 'in') return 'id';
    if (PUSH_ALERT_LANGUAGE_CODES.includes(base)) return base;
    return 'en';
  } catch (_) {
    return 'en';
  }
}

const PUSH_ALERT_COPY = {
  fr: {
    requiredTitle: 'Notifications requises',
    requiredBody: 'Activez les notifications dans les reglages pour continuer cette action.',
    cancel: 'Annuler',
    openLabs: 'Ouvrir Notification Labs',
    missingTokenTitle: 'Token push manquant',
    missingTokenBody: 'Ce compte doit synchroniser son token push avant de continuer. Ouvrez Notification Labs et utilisez Re-sync token.',
    unavailableTitle: 'Notification indisponible',
    unavailableBody: (source) => `Impossible de verifier le statut push (${source}). Reessayez dans quelques secondes.`,
  },
  en: {
    requiredTitle: 'Notifications required',
    requiredBody: 'Enable notifications in settings to continue this action.',
    cancel: 'Cancel',
    openLabs: 'Open Notification Labs',
    missingTokenTitle: 'Missing push token',
    missingTokenBody: 'This account must sync its push token before continuing. Open Notification Labs and use Re-sync token.',
    unavailableTitle: 'Notifications unavailable',
    unavailableBody: (source) => `Unable to verify push status (${source}). Please try again in a few seconds.`,
  },
  es: {
    requiredTitle: 'Notificaciones requeridas',
    requiredBody: 'Activa las notificaciones en ajustes para continuar esta accion.',
    cancel: 'Cancelar',
    openLabs: 'Abrir Notification Labs',
    missingTokenTitle: 'Falta token push',
    missingTokenBody: 'Esta cuenta debe sincronizar su token push antes de continuar. Abre Notification Labs y usa Re-sync token.',
    unavailableTitle: 'Notificaciones no disponibles',
    unavailableBody: (source) => `No se puede verificar el estado push (${source}). Intentalo de nuevo en unos segundos.`,
  },
  pt: {
    requiredTitle: 'Notificacoes necessarias',
    requiredBody: 'Ative as notificacoes nas configuracoes para continuar esta acao.',
    cancel: 'Cancelar',
    openLabs: 'Abrir Notification Labs',
    missingTokenTitle: 'Token push ausente',
    missingTokenBody: 'Esta conta precisa sincronizar o token push antes de continuar. Abra o Notification Labs e use Re-sync token.',
    unavailableTitle: 'Notificacoes indisponiveis',
    unavailableBody: (source) => `Nao foi possivel verificar o status push (${source}). Tente novamente em alguns segundos.`,
  },
  zh: {
    requiredTitle: '需要通知权限',
    requiredBody: '请在设置中启用通知后继续此操作。',
    cancel: '取消',
    openLabs: '打开 Notification Labs',
    missingTokenTitle: '缺少推送令牌',
    missingTokenBody: '继续前此账号必须同步推送令牌。请打开 Notification Labs 并使用 Re-sync token。',
    unavailableTitle: '通知不可用',
    unavailableBody: (source) => `无法验证推送状态（${source}）。请几秒后重试。`,
  },
  hi: {
    requiredTitle: 'सूचनाएं आवश्यक हैं',
    requiredBody: 'इस क्रिया को जारी रखने के लिए सेटिंग्स में सूचनाएं सक्षम करें।',
    cancel: 'रद्द करें',
    openLabs: 'Notification Labs खोलें',
    missingTokenTitle: 'पुश टोकन नहीं मिला',
    missingTokenBody: 'जारी रखने से पहले इस खाते को अपना पुश टोकन सिंक करना होगा। Notification Labs खोलें और Re-sync token उपयोग करें।',
    unavailableTitle: 'सूचनाएं उपलब्ध नहीं',
    unavailableBody: (source) => `पुश स्थिति सत्यापित नहीं हो सकी (${source})। कृपया कुछ सेकंड बाद फिर प्रयास करें।`,
  },
  ar: {
    requiredTitle: 'الإشعارات مطلوبة',
    requiredBody: 'فعّل الإشعارات من الإعدادات للمتابعة.',
    cancel: 'إلغاء',
    openLabs: 'فتح Notification Labs',
    missingTokenTitle: 'رمز الدفع مفقود',
    missingTokenBody: 'يجب مزامنة رمز الدفع لهذا الحساب قبل المتابعة. افتح Notification Labs واستخدم Re-sync token.',
    unavailableTitle: 'الإشعارات غير متاحة',
    unavailableBody: (source) => `تعذر التحقق من حالة الدفع (${source}). حاول مرة أخرى بعد بضع ثوانٍ.`,
  },
  bn: {
    requiredTitle: 'নোটিফিকেশন প্রয়োজন',
    requiredBody: 'এই কাজ চালাতে সেটিংসে নোটিফিকেশন চালু করুন।',
    cancel: 'বাতিল',
    openLabs: 'Notification Labs খুলুন',
    missingTokenTitle: 'পুশ টোকেন নেই',
    missingTokenBody: 'চালিয়ে যাওয়ার আগে এই অ্যাকাউন্টে পুশ টোকেন সিঙ্ক করতে হবে। Notification Labs খুলে Re-sync token ব্যবহার করুন।',
    unavailableTitle: 'নোটিফিকেশন অনুপলব্ধ',
    unavailableBody: (source) => `পুশ স্ট্যাটাস যাচাই করা যায়নি (${source})। কয়েক সেকেন্ড পরে আবার চেষ্টা করুন।`,
  },
  ru: {
    requiredTitle: 'Требуются уведомления',
    requiredBody: 'Включите уведомления в настройках, чтобы продолжить это действие.',
    cancel: 'Отмена',
    openLabs: 'Открыть Notification Labs',
    missingTokenTitle: 'Отсутствует push-токен',
    missingTokenBody: 'Перед продолжением этому аккаунту нужно синхронизировать push-токен. Откройте Notification Labs и используйте Re-sync token.',
    unavailableTitle: 'Уведомления недоступны',
    unavailableBody: (source) => `Не удалось проверить статус push (${source}). Повторите попытку через несколько секунд.`,
  },
  ja: {
    requiredTitle: '通知が必要です',
    requiredBody: 'この操作を続けるには、設定で通知を有効にしてください。',
    cancel: 'キャンセル',
    openLabs: 'Notification Labs を開く',
    missingTokenTitle: 'Pushトークンがありません',
    missingTokenBody: '続行する前に、このアカウントで Push トークンを同期する必要があります。Notification Labs を開いて Re-sync token を使ってください。',
    unavailableTitle: '通知を利用できません',
    unavailableBody: (source) => `Push ステータスを確認できませんでした (${source})。数秒後に再試行してください。`,
  },
  de: {
    requiredTitle: 'Benachrichtigungen erforderlich',
    requiredBody: 'Aktiviere Benachrichtigungen in den Einstellungen, um fortzufahren.',
    cancel: 'Abbrechen',
    openLabs: 'Notification Labs öffnen',
    missingTokenTitle: 'Push-Token fehlt',
    missingTokenBody: 'Dieses Konto muss vor dem Fortfahren sein Push-Token synchronisieren. Öffne Notification Labs und nutze Re-sync token.',
    unavailableTitle: 'Benachrichtigungen nicht verfügbar',
    unavailableBody: (source) => `Push-Status konnte nicht geprüft werden (${source}). Bitte in einigen Sekunden erneut versuchen.`,
  },
  id: {
    requiredTitle: 'Notifikasi diperlukan',
    requiredBody: 'Aktifkan notifikasi di pengaturan untuk melanjutkan tindakan ini.',
    cancel: 'Batal',
    openLabs: 'Buka Notification Labs',
    missingTokenTitle: 'Token push hilang',
    missingTokenBody: 'Akun ini harus menyinkronkan token push sebelum melanjutkan. Buka Notification Labs dan gunakan Re-sync token.',
    unavailableTitle: 'Notifikasi tidak tersedia',
    unavailableBody: (source) => `Tidak dapat memverifikasi status push (${source}). Coba lagi dalam beberapa detik.`,
  },
  ur: {
    requiredTitle: 'نوٹیفکیشن درکار ہیں',
    requiredBody: 'اس عمل کو جاری رکھنے کے لیے سیٹنگز میں نوٹیفکیشن فعال کریں۔',
    cancel: 'منسوخ',
    openLabs: 'Notification Labs کھولیں',
    missingTokenTitle: 'پش ٹوکن موجود نہیں',
    missingTokenBody: 'آگے بڑھنے سے پہلے اس اکاؤنٹ کو پش ٹوکن سنک کرنا ہوگا۔ Notification Labs کھولیں اور Re-sync token استعمال کریں۔',
    unavailableTitle: 'نوٹیفکیشن دستیاب نہیں',
    unavailableBody: (source) => `پش اسٹیٹس کی تصدیق نہیں ہو سکی (${source})۔ چند سیکنڈ بعد دوبارہ کوشش کریں۔`,
  },
};

const resolvePushAlertLanguage = async (explicitLanguage) => {
  if (PUSH_ALERT_LANGUAGE_CODES.includes(explicitLanguage)) return explicitLanguage;

  if (explicitLanguage === 'system') {
    return getDeviceLanguageCode();
  }

  try {
    const saved = await AsyncStorage.getItem('app_language');
    if (saved === 'system') {
      return getDeviceLanguageCode();
    }
    if (saved && saved !== 'system' && PUSH_ALERT_LANGUAGE_CODES.includes(saved)) {
      return saved;
    }
  } catch (_) {
    // Ignore storage errors and fallback to english
  }

  return 'en';
};

const normalizeDeletedMarker = (firebaseUid = '', email = '') => ({
  firebaseUid: String(firebaseUid || '').trim(),
  email: String(email || '').trim().toLowerCase(),
});

const readDeletedAccountMarkers = async () => {
  try {
    const raw = await AsyncStorage.getItem(DELETED_ACCOUNT_MARKERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => normalizeDeletedMarker(entry?.firebaseUid, entry?.email))
      .filter((entry) => entry.firebaseUid || entry.email);
  } catch (_) {
    return [];
  }
};

const persistDeletedAccountMarker = async (firebaseUid = '', email = '') => {
  const nextEntry = normalizeDeletedMarker(firebaseUid, email);
  if (!nextEntry.firebaseUid && !nextEntry.email) return;

  const existing = await readDeletedAccountMarkers();
  const alreadyExists = existing.some(
    (entry) =>
      (nextEntry.firebaseUid && entry.firebaseUid === nextEntry.firebaseUid) ||
      (nextEntry.email && entry.email === nextEntry.email)
  );

  if (alreadyExists) return;

  const next = [nextEntry, ...existing].slice(0, 25);
  await AsyncStorage.setItem(DELETED_ACCOUNT_MARKERS_KEY, JSON.stringify(next));
};

const isLocallyDeletedAccount = async (firebaseUid = '', email = '') => {
  const needle = normalizeDeletedMarker(firebaseUid, email);
  if (!needle.firebaseUid && !needle.email) return false;

  const existing = await readDeletedAccountMarkers();
  return existing.some(
    (entry) =>
      (needle.firebaseUid && entry.firebaseUid === needle.firebaseUid) ||
      (needle.email && entry.email === needle.email)
  );
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [pushReadiness, setPushReadiness] = useState({
    permissionStatus: 'unknown',
    hasServerToken: false,
    tokenCount: 0,
    isExpoGo: false,
    requiresAttention: true,
    reason: 'not-checked',
  });
  const profileWriteAtRef = useRef(0);
  const lastRefreshAtRef = useRef(0);
  const refreshSeqRef = useRef(0);

  const handleDeletedAccountState = useCallback(async ({ firebaseUid = '', email = '' } = {}) => {
    await persistDeletedAccountMarker(firebaseUid, email);

    try {
      await logoutUser();
    } catch (_) {
      // best effort sign-out
    }

    try {
      await AsyncStorage.removeItem('user');
    } catch (_) {
      // ignore storage cleanup errors
    }

    setUser(null);
    setIsAuthenticated(false);
    setIsGuest(true);
    setPushReadiness((prev) => ({ ...prev, hasServerToken: false, tokenCount: 0 }));
  }, []);

  const refreshPushReadiness = useCallback(async () => {
    try {
      const [permissionResponse, diagnostic] = await Promise.all([
        Notifications.getPermissionsAsync(),
        getPushTokenDiagnostic().catch(() => null),
      ]);

      const permissionStatus = permissionResponse?.status || 'unknown';
      const tokenCount = Number(diagnostic?.totalTokens || 0);
      const hasServerToken = tokenCount > 0;
      const executionContext = getExecutionContext();
      const isExpoGo = Boolean(executionContext?.isExpoGo);

      let reason = 'ready';
      if (permissionStatus !== 'granted' && permissionResponse?.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) {
        reason = 'permission-denied';
      } else if (!hasServerToken) {
        reason = 'missing-server-token';
      } else if (isExpoGo) {
        reason = 'expo-go-runtime';
      }

      const next = {
        permissionStatus,
        hasServerToken,
        tokenCount,
        isExpoGo,
        requiresAttention: reason !== 'ready',
        reason,
      };

      setPushReadiness(next);
      return next;
    } catch (error) {
      const fallback = {
        permissionStatus: 'unknown',
        hasServerToken: false,
        tokenCount: 0,
        isExpoGo: false,
        requiresAttention: true,
        reason: 'diagnostic-error',
      };
      setPushReadiness(fallback);
      return fallback;
    }
  }, []);

  const ensurePushReadyOrAlert = useCallback(async ({ source = 'action', language: preferredLanguage } = {}) => {
    const current = await refreshPushReadiness();
    const alertLanguage = await resolvePushAlertLanguage(preferredLanguage);
    const copy = PUSH_ALERT_COPY[alertLanguage] || PUSH_ALERT_COPY.en;

    if (current.reason === 'ready' || current.reason === 'expo-go-runtime') {
      return true;
    }

    if (current.reason === 'permission-denied') {
      Alert.alert(
        copy.requiredTitle,
        copy.requiredBody,
        [
          { text: copy.cancel, style: 'cancel' },
          {
            text: copy.openLabs,
            onPress: () => {
              // Caller screen handles navigation UI. Guard only returns false.
            },
          },
        ]
      );
      return false;
    }

    if (current.reason === 'missing-server-token') {
      Alert.alert(
        copy.missingTokenTitle,
        copy.missingTokenBody,
      );
      return false;
    }

    Alert.alert(
      copy.unavailableTitle,
      copy.unavailableBody(source)
    );
    return false;
  }, [refreshPushReadiness]);

  const syncPushTokenSafely = useCallback(async (userId, pushToken, contextLabel) => {
    const normalizedToken = typeof pushToken === 'string' ? pushToken.trim() : '';
    if (!normalizedToken) return;
    const pushContext = getPushRuntimeContext();

    try {
      await updatePushToken(userId, normalizedToken, pushContext);
      console.log(
        `[Push] ${contextLabel} token synced: ${normalizedToken.slice(0, 24)}...`
      );
    } catch (error) {
      const status = error?.response?.status;
      const shouldFallback = Boolean(userId) && (status === 401 || status === 403 || status === 404);

      if (shouldFallback) {
        try {
          await updatePushToken(null, normalizedToken, pushContext);
          console.log(`${contextLabel} push token sync recovered via fallback route`);
          return;
        } catch (fallbackError) {
          console.warn(
            `${contextLabel} fallback push token sync failed:`,
            fallbackError?.message || fallbackError,
          );
        }
      }

      console.warn(`${contextLabel} push token sync failed:`, error?.message || error);
    }
  }, []);

  const buildMongoProfile = async (fbUser, pushToken) => {
    const email = fbUser.email || `${fbUser.uid}@firebase.local`;
    const name = fbUser.displayName || fbUser.email?.split('@')[0] || 'User';
    const language = await resolvePushAlertLanguage();

    try {
      const mongoUser = await createUserProfile({
        firebaseUid: fbUser.uid,
        email,
        name,
        language,
        expoPushToken: pushToken || undefined,
      });
      await syncPushTokenSafely(mongoUser?._id, pushToken, 'buildMongoProfile create');
      return {
        ...mongoUser,
        expoPushToken: pushToken || mongoUser?.expoPushToken || null,
      };
    } catch (error) {
      if (isAccountDeletedError(error)) {
        throw error;
      }

      const existing = await getUserByFirebaseUid(fbUser.uid);
      if (existing) {
        await syncPushTokenSafely(existing?._id, pushToken, 'buildMongoProfile existing');
        return {
          ...existing,
          expoPushToken: pushToken || existing?.expoPushToken || null,
        };
      }
      throw error;
    }
  };

  // RESTORE SESSION
  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          const currentUid = auth.currentUser?.uid;

          // Ignore stale cached user if it belongs to a different Firebase account.
          if (!currentUid || (parsed.firebaseUid && parsed.firebaseUid !== currentUid)) {
            await AsyncStorage.removeItem('user');
          } else {
            setUser(normalizeUserForClient(parsed));
            setIsAuthenticated(true); setIsGuest(false);
          }
        }
      } catch (err) {
        console.warn('restore session error:', err.message);
      }
    };
    load();
  }, []);

  // Keep in sync with Firebase auth state (restore session on app start)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          const blockedByLocalDelete = await isLocallyDeletedAccount(fbUser?.uid, fbUser?.email || '');
          if (blockedByLocalDelete) {
            await handleDeletedAccountState({
              firebaseUid: fbUser?.uid,
              email: fbUser?.email || '',
            });
            return;
          }

          // Sync Mongo profile in background.
          const uid = fbUser.uid;
          try {
            const mongoUser = await getUserByFirebaseUid(uid);
            if (mongoUser) {
              const pushToken = await registerForPushNotifications();
              await syncPushTokenSafely(mongoUser._id, pushToken, 'auth state existing');
              await refreshPushReadiness();

              // Force re-register if user has no stored token
              if (!mongoUser.expoPushToken && pushToken) {
                console.log('[Push] User had no token - forcing registration:', pushToken.slice(0, 30));
              }

              const syncedUser = normalizeUserForClient({
                ...mongoUser,
                expoPushToken: pushToken || mongoUser.expoPushToken || null,
              });

              setUser(syncedUser);
              setIsAuthenticated(true); setIsGuest(false);
              setIsGuest(false);
              await AsyncStorage.setItem('user', JSON.stringify(syncedUser));
            } else {
              const pushToken = await registerForPushNotifications();
              const createdUser = normalizeUserForClient(await buildMongoProfile(fbUser, pushToken));
              setUser(createdUser);
              setIsAuthenticated(true); setIsGuest(false);
              await AsyncStorage.setItem('user', JSON.stringify(createdUser));
              await refreshPushReadiness();
            }
          } catch (syncErr) {
            if (isAccountDeletedError(syncErr)) {
              await handleDeletedAccountState({
                firebaseUid: fbUser?.uid,
                email: fbUser?.email || '',
              });
              return;
            }

            console.warn('Background MongoDB sync failed:', syncErr.message);
            try {
              const cachedRaw = await AsyncStorage.getItem('user');
              if (cachedRaw) {
                const cached = normalizeUserForClient(JSON.parse(cachedRaw));
                if (cached?.firebaseUid === fbUser.uid) {
                  setUser(cached);
                  setIsAuthenticated(true); setIsGuest(false);
                  return;
                }
              }
            } catch (_) {
              // continue to fallback below
            }

            const fallback = normalizeUserForClient({
              firebaseUid: fbUser.uid,
              email: fbUser.email || '',
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            });
            setUser(fallback);
            setIsAuthenticated(true); setIsGuest(false);
            await AsyncStorage.setItem('user', JSON.stringify(fallback));
          }
        } else {
          // no firebase user
          setUser(null);
          setIsAuthenticated(false);
          setIsGuest(true);
          await AsyncStorage.removeItem('user');
        }
      } catch (err) {
        console.warn('onAuthStateChanged handler error:', err.message);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;

    // Force sync token immediately and on every foreground resume
    const forceSyncToken = async (label = 'token-sync') => {
      try {
        const pushToken = await registerForPushNotifications();

        if (!pushToken) {
          console.warn('[Push] No token returned from registerForPushNotifications');
          return;
        }

        await syncPushTokenSafely(user._id, pushToken, label);
        await refreshPushReadiness();

        setUser((prev) => {
          if (!prev) return prev;
          if (prev.expoPushToken === pushToken) return prev;
          console.log(`[Push] Token updated in state: ${pushToken.slice(0, 30)}...`);
          return { ...prev, expoPushToken: pushToken };
        });
      } catch (err) {
        console.warn(`[Push] ${label} failed:`, err?.message || err);
      }
    };

    // Immediate sync on mount
    forceSyncToken('on-mount');

    // Hourly token refresh to keep token fresh
    const hourlyRefresh = setInterval(() => forceSyncToken('hourly-refresh'), 60 * 60 * 1000);

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      forceSyncToken('foreground-resume');
    });

    return () => {
      clearInterval(hourlyRefresh);
      appStateSub.remove();
    };
  }, [isAuthenticated, user?._id, syncPushTokenSafely, refreshPushReadiness]);

  // REGISTER - Plus de paramètre "role" !
  const register = async (email, password, name) => {
    setIsLoading(true);

    try {
      const firebaseUser = await registerUser(email, password);
      const blockedByLocalDelete = await isLocallyDeletedAccount(firebaseUser?.uid, firebaseUser?.email || email);
      if (blockedByLocalDelete) {
        await handleDeletedAccountState({
          firebaseUid: firebaseUser?.uid,
          email: firebaseUser?.email || email,
        });
        return buildDeletedAccountAuthError('This account has been deleted and cannot be used anymore.');
      }

      try {
        const pushToken = await registerForPushNotifications();
        const language = await resolvePushAlertLanguage();

        const rawMongoUser = await createUserProfile({
          firebaseUid: firebaseUser.uid,
          email,
          name,
          language,
          expoPushToken: pushToken || undefined,
        });
        await syncPushTokenSafely(rawMongoUser?._id, pushToken, 'register');
        await refreshPushReadiness();
        const mongoUser = normalizeUserForClient({
          ...rawMongoUser,
          expoPushToken: pushToken || rawMongoUser?.expoPushToken || null,
        });

        await AsyncStorage.setItem('user', JSON.stringify(mongoUser));
        setUser(mongoUser);
        setIsAuthenticated(true); setIsGuest(false);
      } catch (syncErr) {
        if (isAccountDeletedError(syncErr)) {
          await handleDeletedAccountState({
            firebaseUid: firebaseUser?.uid,
            email: firebaseUser?.email || email,
          });
          return buildDeletedAccountAuthError('This account has been deleted and cannot be used anymore.');
        }

        console.warn('Register MongoDB sync failed:', syncErr.message);
        const fallback = normalizeUserForClient({
          firebaseUid: firebaseUser.uid,
          email,
          name,
        });
        await AsyncStorage.setItem('user', JSON.stringify(fallback));
        setUser(fallback);
        setIsAuthenticated(true); setIsGuest(false);
      }

      return { success: true };
    } catch (e) {
      if (isAccountDeletedError(e)) {
        await handleDeletedAccountState({
          firebaseUid: '',
          email,
        });
        return buildDeletedAccountAuthError('This account has been deleted and cannot be used anymore.');
      }

      return {
        success: false,
        error: e.response?.data?.error || e.message,
      };
    } finally {
      setIsLoading(false);
    }
  };

  // LOGIN - Inchangé
  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const firebaseUser = await loginUser(email, password);
      const blockedByLocalDelete = await isLocallyDeletedAccount(firebaseUser?.uid, firebaseUser?.email || email);
      if (blockedByLocalDelete) {
        await handleDeletedAccountState({
          firebaseUid: firebaseUser?.uid,
          email: firebaseUser?.email || email,
        });
        return buildDeletedAccountAuthError('This account has been deleted and cannot sign in anymore.');
      }

      try {
        const uid = firebaseUser.uid;
        const mongoUser = await getUserByFirebaseUid(uid);

        if (!mongoUser) {
          const pushToken = await registerForPushNotifications();
          const createdUser = normalizeUserForClient(await buildMongoProfile(firebaseUser, pushToken));
          await AsyncStorage.setItem('user', JSON.stringify(createdUser));
          setUser(createdUser);
          setIsAuthenticated(true); setIsGuest(false);
          return { success: true };
        }

        const pushToken = await registerForPushNotifications();
        await syncPushTokenSafely(mongoUser._id, pushToken, 'login');
        await refreshPushReadiness();

        const finalUser = normalizeUserForClient({
          ...mongoUser,
          expoPushToken: pushToken || mongoUser?.expoPushToken || null,
        });

        await AsyncStorage.setItem('user', JSON.stringify(finalUser));
        setUser(finalUser);
        setIsAuthenticated(true); setIsGuest(false);
      } catch (syncErr) {
        if (isAccountDeletedError(syncErr)) {
          await handleDeletedAccountState({
            firebaseUid: firebaseUser?.uid,
            email: firebaseUser?.email || email,
          });
          return buildDeletedAccountAuthError('This account has been deleted and cannot sign in anymore.');
        }

        console.warn('Login MongoDB sync failed:', syncErr.message);
        const fallback = normalizeUserForClient({
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email || email,
          name: firebaseUser.displayName || email.split('@')[0],
        });
        await AsyncStorage.setItem('user', JSON.stringify(fallback));
        setUser(fallback);
        setIsAuthenticated(true); setIsGuest(false);
      }

      return { success: true };
    } catch (e) {
      if (isAccountDeletedError(e)) {
        await handleDeletedAccountState({
          firebaseUid: '',
          email,
        });
        return buildDeletedAccountAuthError('This account has been deleted and cannot sign in anymore.');
      }

      return {
        success: false,
        error: e.response?.data?.error || e.message,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Supprimer le token push avant de se déconnecter
      if (user?._id && user?.expoPushToken) {
        await removePushToken(user._id, user.expoPushToken);
      }
      await logoutUser();
      await clearLocalSession();
    } catch (error) {
      console.warn('Logout error:', error);
    }
  };

  // fonction pour nettoyer le cache des entreprises

  const clearCompanyCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const companyKeys = keys.filter(key => key.startsWith('company_cache_'));
      if (companyKeys.length > 0) {
        await AsyncStorage.multiRemove(companyKeys);
        console.log(`🧹 Cache nettoyé: ${companyKeys.length} entreprises`);
      }
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }
  };

  const clearLocalSession = useCallback(async () => {
    await clearCompanyCache();
    await AsyncStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    setIsGuest(true);
    setPushReadiness({
      permissionStatus: 'unknown',
      hasServerToken: false,
      tokenCount: 0,
      isExpoGo: false,
      requiresAttention: true,
      reason: 'logged-out',
    });
  }, []);

  const updateUserProfile = useCallback(async (nextUser) => {
    if (!nextUser) return;

    let normalized = null;
    setUser((prev) => {
      normalized = normalizeUserForClient({ ...(prev || {}), ...nextUser });
      return normalized;
    });
    setIsAuthenticated(true); setIsGuest(false);

    if (normalized) {
      const normalizedUpdatedAt = Date.parse(normalized?.updatedAt || 0) || Date.now();
      profileWriteAtRef.current = Math.max(profileWriteAtRef.current, normalizedUpdatedAt);
      await AsyncStorage.setItem('user', JSON.stringify(normalized));
    }
  }, []);

  const refreshUserProfile = useCallback(async (force = false) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return null;

    const now = Date.now();
    if (!force && now - lastRefreshAtRef.current < 3000) {
      return user;
    }
    lastRefreshAtRef.current = now;

    const seq = ++refreshSeqRef.current;

    try {
      const mongoUser = await getUserByFirebaseUid(uid);
      if (mongoUser) {
        const normalizedServer = normalizeUserForClient(mongoUser);
        const serverUpdatedAt = Date.parse(normalizedServer?.updatedAt || 0) || 0;
        const localUpdatedAt = Math.max(
          profileWriteAtRef.current,
          Date.parse(user?.updatedAt || 0) || 0,
        );

        // Prevent stale responses from overwriting a more recent local/server state.
        if (localUpdatedAt && serverUpdatedAt && serverUpdatedAt < localUpdatedAt) {
          return user;
        }

        // Ignore out-of-order refresh responses.
        if (seq !== refreshSeqRef.current) {
          return user;
        }

        await updateUserProfile(normalizedServer);
        return normalizedServer;
      }
      return null;
    } catch (err) {
      console.warn('refreshUserProfile error:', err.message);
      return null;
    }
  }, [updateUserProfile, user]);

  const continueAsGuest = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    setIsGuest(true);
  }, []);

  const enterGuestMode = useCallback(() => {
    continueAsGuest();
  }, [continueAsGuest]);

  const deleteAccount = useCallback(async () => {
    const currentFirebaseUid = auth.currentUser?.uid || user?.firebaseUid || '';
    const currentEmail = auth.currentUser?.email || user?.email || '';

    try {
      await deleteMyAccount();
    } catch (error) {
      const status = error?.response?.status;
      const message = error?.response?.data?.error || error?.message || 'Failed to delete account';
      const normalizedMessage = String(message || '').toLowerCase();

      if (status === 401) {
        throw new Error('Your session has expired. Please sign in again before deleting your account.');
      }

      // Idempotent delete compatibility with older API behavior.
      if (status === 404 && /user not found/i.test(String(message))) {
        console.warn('Delete account fallback: profile already missing, continuing local sign-out.');
      } else if (
        /unable to remove authentication account|authentication account cleanup is pending/i.test(normalizedMessage)
      ) {
        // Do not block user deletion UX when auth provider cleanup is temporarily unavailable.
        console.warn('Delete account fallback: auth cleanup pending, continuing local sign-out.');
      } else {
        throw new Error(message);
      }
    }

    await persistDeletedAccountMarker(currentFirebaseUid, currentEmail);

    try {
      await logoutUser();
    } catch (error) {
      console.warn('Delete account signOut warning:', error?.message || error);
    }

    await clearLocalSession();
    return { success: true };
  }, [clearLocalSession]);

  return (
    <UserContext.Provider
      value={{
        user,
        isAuthenticated,
        isGuest,
        isLoading,
        pushReadiness,
        login,
        register,
        logout,
        continueAsGuest,
        enterGuestMode,
        deleteAccount,
        updateUserProfile,
        refreshUserProfile,
        refreshPushReadiness,
        ensurePushReadyOrAlert,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);