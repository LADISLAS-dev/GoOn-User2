/**
 * Centralized API service for GoOn backend communication
 * Handles JWT tokens, automatic refresh, and error handling
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
  timeout?: number;
}

interface ApiError {
  status: number;
  message: string;
  code?: string;
}

let accessToken: string | null = null;
let refreshToken: string | null = null;

// Initialize tokens from storage
export const initTokens = async (): Promise<void> => {
  try {
    accessToken = await AsyncStorage.getItem('userToken');
    refreshToken = await AsyncStorage.getItem('refreshToken');
  } catch {
    accessToken = null;
    refreshToken = null;
  }
};

// Set tokens after login/register
export const setTokens = async (access: string, refresh: string): Promise<void> => {
  accessToken = access;
  refreshToken = refresh;
  await AsyncStorage.setItem('userToken', access);
  await AsyncStorage.setItem('refreshToken', refresh);
};

// Clear tokens on logout
export const clearTokens = async (): Promise<void> => {
  accessToken = null;
  refreshToken = null;
  await AsyncStorage.removeItem('userToken');
  await AsyncStorage.removeItem('refreshToken');
};

// Refresh the access token
const refreshAccessToken = async (): Promise<boolean> => {
  if (!refreshToken) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    accessToken = data.accessToken;
    refreshToken = data.refreshToken;

    await AsyncStorage.setItem('userToken', data.accessToken);
    await AsyncStorage.setItem('refreshToken', data.refreshToken);

    return true;
  } catch {
    return false;
  }
};

// Main request function
export const apiRequest = async <T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> => {
  const {
    method = 'GET',
    body,
    headers = {},
    requiresAuth = true,
    timeout = 15000,
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (requiresAuth && accessToken) {
    requestHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
    signal: controller.signal,
  };

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, fetchOptions);
    clearTimeout(timeoutId);

    // Handle 401 - try refresh token
    if (response.status === 401 && requiresAuth && refreshToken) {
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        // Retry with new token
        requestHeaders['Authorization'] = `Bearer ${accessToken}`;
        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...fetchOptions,
          headers: requestHeaders,
        });

        if (!retryResponse.ok) {
          const error = await retryResponse.json().catch(() => ({}));
          throw {
            status: retryResponse.status,
            message: error.message || 'Request failed',
            code: error.code,
          } as ApiError;
        }

        return retryResponse.json();
      }

      // Refresh failed - clear tokens
      await clearTokens();
      throw { status: 401, message: 'Session expired. Please login again.', code: 'SESSION_EXPIRED' } as ApiError;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        message: error.message || 'An error occurred',
        code: error.code,
      } as ApiError;
    }

    // Handle empty response (204 No Content)
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if ((error as ApiError).status) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw { status: 408, message: 'Request timed out. Please try again.', code: 'TIMEOUT' } as ApiError;
    }

    throw {
      status: 0,
      message: 'Network error. Please check your connection.',
      code: 'NETWORK_ERROR',
    } as ApiError;
  }
};

// Initialize tokens on import
initTokens();
