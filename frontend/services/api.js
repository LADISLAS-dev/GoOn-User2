import axios from 'axios';
import Constants from 'expo-constants';
import { auth } from './firebase';
import { API_URL } from '../env';
import { isCompanyPubliclyVisible } from '../utils/companyVisibility';

const resolveExpoHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost ||
    '';

  if (!hostUri) return null;
  return hostUri.split(':')[0];
};

// 🔥 BASE URL UNIQUE
const API = (() => {
  const url = (API_URL || 'https://goon-user.onrender.com').replace(/\/$/, '');
  console.log('✅ API endpoint:', url);
  return url;
})();

// AXIOS INSTANCE
const api = axios.create({
  baseURL: API,
  timeout: 60000,
});

const DEBUG_API_LOGS = Boolean(Constants.expoConfig?.extra?.debugApiLogs);

let lastNetworkErrorLogAt = 0;

// LOG REQUEST
api.interceptors.request.use(async (req) => {
  if (!req.headers) {
    req.headers = {};
  }

  if (!req.headers.Authorization && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        req.headers.Authorization = `Bearer ${token}`;
        console.log('✅ Auth token attached');
      }
    } catch (err) {
      console.warn('⚠️ Unable to attach auth token:', err.message);
    }
  }

  console.log('➡️ REQUEST:', req.method?.toUpperCase(), req.url);
  return req;
});

// LOG RESPONSE
api.interceptors.response.use(
  res => {
    console.log('✅ RESPONSE:', res.config.url, res.status);
    return res;
  },
  async error => {
    const status = error?.response?.status;
    const originalRequest = error?.config || {};
    const isNetworkError = !error.response;
    const errorMsg = error?.message || 'Unknown error';

    // Log the actual error details
    console.log('❌ API ERROR:');
    console.log('  - Type:', isNetworkError ? 'Network Error' : `HTTP ${status}`);
    console.log('  - Message:', errorMsg);
    console.log('  - URL:', originalRequest?.url);
    
    if (error?.response?.data) {
      console.log('  - Response:', error.response.data);
    }

    if ((status === 401 || status === 403) && auth.currentUser && !originalRequest._retryAuth) {
      originalRequest._retryAuth = true;

      try {
        const freshToken = await auth.currentUser.getIdToken(true);
        if (freshToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
          console.log('🔄 Retrying request with fresh token');
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.log('❌ TOKEN REFRESH ERROR:', refreshError?.message || refreshError);
      }
    }

    return Promise.reject(error);
  }
);

//////////////////////////////
// USERS
//////////////////////////////

export const createUserProfile = async (data) => {
  const res = await api.post(
    '/users',
    data,
    data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
  );
  return res.data;
};

export const updateMyProfile = async (data) => {
  const config = data instanceof FormData
    ? { headers: { 'Content-Type': 'multipart/form-data' } }
    : undefined;

  try {
    const res = await api.patch('/users/profile', data, config);
    return res.data;
  } catch (error) {
    // Backward compatibility and resilience when PATCH endpoint is unavailable or temporarily failing.
    if ([404, 405, 500, 502, 503].includes(error?.response?.status)) {
      const fallback = await api.post('/users', data, config);
      return fallback.data;
    }
    throw error;
  }
};

export const getAllUsers = async () => {
  const res = await api.get('/users');
  return res.data;
};

export const getUserByFirebaseUid = async (uid) => {
  const res = await api.get(`/users/firebase/${uid}`);
  return res.data;
};

export const deleteMyAccount = async () => {
  const res = await api.delete('/users/me');
  return res.data;
};

//////////////////////////////
// NOTIFICATIONS
//////////////////////////////

export const sendNotification = async (data) => {
  const res = await api.post('/notifications', data);
  return res.data;
};

export const getNotifications = async (userId) => {
  const res = await api.get(`/notifications/${userId}`);
  return res.data;
};

export const markNotificationAsRead = async (notificationId) => {
  const res = await api.patch(`/notifications/${notificationId}/read`);
  return res.data;
};

export const deleteNotificationApi = async (notificationId) => {
  const res = await api.delete(`/notifications/${notificationId}`);
  return res.data;
};

//////////////////////////////
// APPOINTMENTS
//////////////////////////////

export const createAppointment = async (data) => {
  const res = await api.post('/appointments', data);
  return res.data;
};

export const getAppointmentById = async (id) => {
  const res = await api.get(`/appointments/${id}`);
  return res.data;
};

export const updateAppointmentStatus = async (id, status, extra = {}) => {
  const res = await api.patch(`/appointments/${id}`, { status, ...extra });
  return res.data;
};

export const getAppointmentAppreciations = async (id) => {
  const res = await api.get(`/appointments/${id}/appreciations`);
  return res.data;
};

export const submitAppointmentAppreciation = async (id, payload) => {
  const res = await api.post(`/appointments/${id}/appreciations`, payload);
  return res.data;
};

export const getAppointmentsByCompany = async (companyId) => {
  const res = await api.get(`/appointments/company/${companyId}`);
  return res.data;
};

export const updatePushToken = async (userId, token, pushContext = null) => {
  if (!token) {
    return { skipped: true };
  }

  const payload = {
    expoPushToken: token,
    ...(pushContext ? { pushContext } : {}),
  };

  if (!userId) {
    const fallbackRes = await api.patch('/users/push-token', payload);
    return fallbackRes.data;
  }

  const res = await api.patch(`/users/${userId}/push-token`, payload);
  return res.data;
};

export const removePushToken = async (userId, token) => {
  if (!userId || !token) return { skipped: true };
  try {
    const res = await api.delete(`/users/${userId}/push-token`, { data: { expoPushToken: token } });
    return res.data;
  } catch (e) {
    console.warn('removePushToken failed:', e?.message || e);
    return { skipped: true };
  }
};

export const getPushTokenDiagnostic = async () => {
  const res = await api.get('/users/diagnostic/tokens');
  return res.data;
};

export const sendDiagnosticTestPush = async () => {
  const res = await api.post('/users/diagnostic/test-push');
  return res.data;
};

export const getNotificationPreferencesApi = async () => {
  const res = await api.get('/users/notification-preferences');
  return res.data?.preferences || null;
};

export const updateNotificationPreferencesApi = async (preferences) => {
  const res = await api.patch('/users/notification-preferences', { preferences });
  return res.data?.preferences || null;
};

// ======================
// COMPANIES
// ======================

export const createCompany = async (data) => {
  try {
    console.log('📤 createCompany called with:', typeof data);
    
    // Si c'est déjà un FormData, on l'utilise directement
    if (data instanceof FormData) {
      console.log('✅ Data is FormData, sending directly');
      const response = await api.post('/companies', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data;
    }
    
    // Sinon, on convertit en FormData
    console.log('🔄 Converting data to FormData...');
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value === undefined || value === null || value === '') return;

      if (
        typeof File !== 'undefined' && value instanceof File ||
        typeof Blob !== 'undefined' && value instanceof Blob
      ) {
        formData.append(key, value);
        console.log(`  - Appended ${key} (File/Blob)`);
      } else {
        formData.append(key, String(value));
        console.log(`  - Appended ${key}: ${String(value).substring(0, 50)}`);
      }
    });
    
    console.log('📤 Sending POST /companies...');
    const response = await api.post('/companies', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    console.log('✅ Company created successfully:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Create company error:', error.message);
    console.error('  - Full error:', error);
    throw error;
  }
};

export const getCompaniesByCategory = async (categoryId) => {
  const res = await api.get(`/companies/category/${categoryId}`);
  const rows = Array.isArray(res.data) ? res.data : [];
  return rows.filter(isCompanyPubliclyVisible);
};

export const getAllCompanies = async () => {
  const res = await api.get('/companies', { params: { scope: 'all' } });
  const rows = Array.isArray(res.data?.data) ? res.data.data : [];
  return rows.filter(isCompanyPubliclyVisible);
};

const isValidCompanyId = (id) => {
  const value = String(id ?? '').trim();
  return !!value && value !== 'undefined' && value !== 'null';
};

export const getCompanyById = async (id) => {
  if (!isValidCompanyId(id)) {
    const error = new Error('Invalid companyId: request skipped');
    error.code = 'INVALID_COMPANY_ID';
    throw error;
  }
  const res = await api.get(`/companies/${id}`);
  return res.data;
};

export const updateCompany = async (id, data) => {
  const res = await api.patch(`/companies/${id}`, data);
  return res.data;
};

export const createService = async (companyId, data) => {
  const res = await api.post(`/companies/${companyId}/services`, data);
  return res.data;
};

export const deleteCompany = async (id) => {
  const res = await api.delete(`/companies/${id}`);
  return res.data;
};

export const getMessages = async (companyId) => {
  const res = await api.get(`/messages/${companyId}`);
  return res.data;
};

//////////////////////////////
// BANNERS
//////////////////////////////

export const getBanners = async () => {
  const res = await api.get('/banners');
  return res.data?.banners || [];
};

export const createBanner = async (data) => {
  const res = await api.post('/banners', data);
  return res.data;
};

export const uploadBannerMedia = async (mediaFile) => {
  const formData = new FormData();
  formData.append('media', mediaFile);

  const res = await api.post('/banners/upload-media', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const updateBanner = async (id, data) => {
  const res = await api.patch(`/banners/${id}`, data);
  return res.data;
};

export const deleteBanner = async (id) => {
  const res = await api.delete(`/banners/${id}`);
  return res.data;
};

export const sendMessageApi = async (body) => {
  const res = await api.post(
    `/messages`,
    body,
    body instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
  );
  return res.data;
};

export const updateMessageApi = async (messageId, text) => {
  const res = await api.patch(`/messages/${messageId}`, { text });
  return res.data;
};

export const deleteMessageApi = async (messageId) => {
  const res = await api.delete(`/messages/${messageId}`);
  return res.data;
};

export const sendTypingStatus = async ({ companyId, receiverId, isTyping }) => {
  const res = await api.post('/messages/typing', { companyId, receiverId, isTyping });
  return res.data;
};

export const getTypingStatus = async ({ companyId, peerId }) => {
  const res = await api.get(`/messages/typing/${companyId}/${peerId}`);
  return res.data;
};

export const createReport = async ({ targetType, targetId, reason, details }) => {
  const res = await api.post('/reports', { targetType, targetId, reason, details });
  return res.data;
};

export default api;