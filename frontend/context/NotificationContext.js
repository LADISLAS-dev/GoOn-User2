import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useState,
  useRef,
} from 'react';
import { AppState } from 'react-native';

import {
  getNotifications,
  getNotificationPreferencesApi,
  markNotificationAsRead,
  updatePushToken,
} from '../services/api';

import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getLastNotificationResponse,
  setInAppNotificationFilter,
  setNotificationDisplayPreferences,
  registerForPushNotifications,
  getPushRuntimeContext,
} from '../services/notificationService';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  shouldAllowNotificationType,
} from '../services/notificationPreferences';

import { useUser } from './UserContext';
import { navigateToAppointmentDetails, navigateToMessages, navigateToMyOrders } from '../navigation/navigationRef';

// ================= STATE =================
const initialState = {
  notifications: [],
  unreadCount: 0,
  total: 0,
  isLoading: false,
};

// ================= REDUCER =================
function reducer(state, action) {
  switch (action.type) {
    case 'SET':
      return {
        ...state,
        notifications: action.payload.notifications,
        unreadCount: action.payload.unreadCount,
        total: action.payload.total,
        isLoading: false,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    default:
      return state;
  }
}

// ================= CONTEXT =================
const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const { user, isAuthenticated } = useUser();
  const pollingRef = useRef(null);
  const lastNetworkLogAtRef = useRef(0);
  const activeMessageConversationRef = useRef({ senderId: null, companyId: null });
  const [notificationPrefs, setNotificationPrefs] = useState(DEFAULT_NOTIFICATION_PREFERENCES);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const localPrefs = await getNotificationPreferences();
      const remotePrefs = isAuthenticated
        ? await getNotificationPreferencesApi().catch(() => null)
        : null;
      const prefs = remotePrefs ? { ...localPrefs, ...remotePrefs } : localPrefs;
      if (!mounted) return;
      setNotificationPrefs(prefs);
      setNotificationDisplayPreferences(prefs);
    })();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  const normalizeEntityId = useCallback((value) => {
    return String(value?._id || value?.id || value || '').trim();
  }, []);

  const isMessageForActiveConversation = useCallback((data) => {
    const type = String(data?.type || '').toLowerCase();
    if (type !== 'message') return false;

    const activeSenderId = normalizeEntityId(activeMessageConversationRef.current?.senderId);
    if (!activeSenderId) return false;

    const senderId = normalizeEntityId(data?.senderId);
    if (!senderId || senderId !== activeSenderId) return false;

    const activeCompanyId = normalizeEntityId(activeMessageConversationRef.current?.companyId);
    const incomingCompanyId = normalizeEntityId(data?.companyId);

    if (activeCompanyId && incomingCompanyId && activeCompanyId !== incomingCompanyId) {
      return false;
    }

    return true;
  }, [normalizeEntityId]);

  const setActiveMessageConversation = useCallback((conversation) => {
    if (!conversation) {
      activeMessageConversationRef.current = { senderId: null, companyId: null };
      return;
    }

    activeMessageConversationRef.current = {
      senderId: normalizeEntityId(conversation?.senderId),
      companyId: normalizeEntityId(conversation?.companyId),
    };
  }, [normalizeEntityId]);

  // ================= FETCH =================
  const fetchNotifications = useCallback(async () => {
    if (!user?._id) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const res = await getNotifications(user._id);
      const notifications = res?.notifications || [];

      dispatch({
        type: 'SET',
        payload: {
          notifications,
          unreadCount: res?.unreadCount ?? notifications.filter(n => !n.read).length,
          total: res?.total ?? notifications.length,
        },
      });
    } catch (e) {
      dispatch({ type: 'SET_LOADING', payload: false });
      const now = Date.now();
      if (now - lastNetworkLogAtRef.current > 1987) {
        console.warn('Notifications fetch failed:', e?.message || e);
        lastNetworkLogAtRef.current = now;
      }
    }
  }, [user?._id]);

  const markOneAsRead = useCallback(async (notificationId) => {
    if (!notificationId) return;
    try {
      await markNotificationAsRead(notificationId);
      await fetchNotifications();
    } catch (e) {
      console.warn('markOneAsRead error:', e?.message || e);
    }
  }, [fetchNotifications]);

  const markAllRead = useCallback(async () => {
    const unreadNotifications = (state.notifications || []).filter((notification) => !notification?.read);
    if (!unreadNotifications.length) return;

    try {
      await Promise.all(unreadNotifications.map((notification) => markNotificationAsRead(notification._id)));
      await fetchNotifications();
    } catch (e) {
      console.warn('markAllRead error:', e?.message || e);
    }
  }, [fetchNotifications, state.notifications]);

  const markMessageNotificationsBySender = useCallback(async (senderId) => {
    if (!senderId) return;
    const targetSenderId = String(senderId);

    const unreadFromSender = (state.notifications || []).filter((n) => {
      if (n.read || n.type !== 'message') return false;
      const notifSenderId = String(n?.senderId?._id || n?.senderId || '');
      return notifSenderId === targetSenderId;
    });

    if (unreadFromSender.length === 0) return;

    try {
      await Promise.all(unreadFromSender.map((n) => markNotificationAsRead(n._id)));
      await fetchNotifications();
    } catch (e) {
      console.warn('markMessageNotificationsBySender error:', e?.message || e);
    }
  }, [state.notifications, fetchNotifications]);

  const markConversationMessagesAsRead = useCallback(async ({ senderId, companyId }) => {
    if (!user?._id) return;

    const targetSender = normalizeEntityId(senderId);
    const targetCompany = normalizeEntityId(companyId);
    if (!targetSender) return;

    try {
      const res = await getNotifications(user._id);
      const notifications = res?.notifications || [];

      const unread = notifications.filter((n) => {
        if (n?.read) return false;
        if (String(n?.type || '').toLowerCase() !== 'message') return false;

        const notifSender = normalizeEntityId(n?.senderId);
        if (notifSender !== targetSender) return false;

        if (targetCompany) {
          const notifCompany = normalizeEntityId(n?.companyId);
          if (notifCompany && notifCompany !== targetCompany) return false;
        }

        return true;
      });

      if (!unread.length) return;

      await Promise.all(unread.map((n) => markNotificationAsRead(n._id)));
      await fetchNotifications();
    } catch (e) {
      console.warn('markConversationMessagesAsRead error:', e?.message || e);
    }
  }, [fetchNotifications, normalizeEntityId, user?._id]);

  useEffect(() => {
    setNotificationDisplayPreferences(notificationPrefs);

    setInAppNotificationFilter((data) => {
      const type = String(data?.type || '').toLowerCase();
      if (!shouldAllowNotificationType(notificationPrefs, type)) {
        return true;
      }
      return isMessageForActiveConversation(data);
    });

    return () => {
      setInAppNotificationFilter(null);
    };
  }, [isMessageForActiveConversation, notificationPrefs]);

  // ================= RECEIVE =================
  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;

    fetchNotifications();
    pollingRef.current = setInterval(
      fetchNotifications,
      Math.max(5000, Number(notificationPrefs?.pollingIntervalSec || 8) * 1000)
    );

    // Re-register push token if user has no token stored
    if (!user?.expoPushToken) {
      registerForPushNotifications().then((token) => {
        if (token) {
          console.log('[NotifCtx] Force re-registering missing push token:', token.slice(0, 30));
          updatePushToken(user._id, token, getPushRuntimeContext()).catch((e) =>
            console.warn('[NotifCtx] updatePushToken failed:', e?.message)
          );
        }
      }).catch(() => {});
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [isAuthenticated, user?._id, fetchNotifications, notificationPrefs?.pollingIntervalSec]);

  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;

      fetchNotifications();
    });

    return () => appStateSub.remove();
  }, [isAuthenticated, user?._id, fetchNotifications]);

  useEffect(() => {
    const sub = addNotificationReceivedListener(async (notification) => {
      const data = notification?.request?.content?.data || {};
      const type = String(data?.type || '').toLowerCase();

      if (!shouldAllowNotificationType(notificationPrefs, type)) {
        return;
      }

      if (isMessageForActiveConversation(data)) {
        await markConversationMessagesAsRead({
          senderId: data?.senderId,
          companyId: data?.companyId,
        });
        return;
      }

      fetchNotifications();
    });

    return () => sub.remove();
  }, [fetchNotifications, isMessageForActiveConversation, markConversationMessagesAsRead, notificationPrefs]);

  // ================= CLICK NOTIFICATION =================
  const handleNotificationNavigation = useCallback((data) => {
    if (!data) return;

    console.log('CLICK DATA:', data);

    if (data?.type === 'order') {
      navigateToMyOrders();
      markOneAsRead(data?.notificationId);
      return;
    }

    if (data?.type === 'appointment' && data?.appointmentId) {
      navigateToAppointmentDetails(data.appointmentId);
      markOneAsRead(data?.notificationId);
      return;
    }

    if (data?.type === 'message') {
      navigateToMessages(data?.companyId, {
        selectedUserId: data?.senderId,
        selectedUserName: data?.senderName,
      });
      markOneAsRead(data?.notificationId);
    }
  }, [markOneAsRead]);

  useEffect(() => {
    let isMounted = true;

    const hydrateInitialResponse = async () => {
      try {
        const response = await getLastNotificationResponse();
        if (!isMounted) return;

        const data = response?.notification?.request?.content?.data;
        handleNotificationNavigation(data);
      } catch (e) {
        console.warn('Failed to process initial notification response:', e?.message || e);
      }
    };

    hydrateInitialResponse();

    const sub = addNotificationResponseListener((response) => {
      const data = response?.notification?.request?.content?.data;
      handleNotificationNavigation(data);
    });

    return () => {
      isMounted = false;
      sub.remove();
    };
  }, [handleNotificationNavigation]);

  return (
    <NotificationContext.Provider
      value={{
        ...state,
        fetchNotifications,
        markOneAsRead,
        markAsRead: markOneAsRead,
        markAllRead,
        markMessageNotificationsBySender,
        setActiveMessageConversation,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('Provider missing');
  return ctx;
};