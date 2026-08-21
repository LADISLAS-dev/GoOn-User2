/**
 * Authentication service for GoOn
 * Handles login, register, forgot password, reset password, and logout
 */
import { apiRequest, setTokens, clearTokens } from './api';
import {
  LoginCredentials,
  RegisterData,
  LoginResponse,
  RegisterResponse,
  ForgotPasswordResponse,
  ResetPasswordData,
} from '../types/auth';

export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const response = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: credentials,
    requiresAuth: false,
  });

  // Store tokens
  await setTokens(response.token, response.refreshToken);

  return response;
};

export const register = async (data: RegisterData): Promise<RegisterResponse> => {
  const response = await apiRequest<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: data,
    requiresAuth: false,
  });

  // Store tokens
  await setTokens(response.token, response.refreshToken);

  return response;
};

export const forgotPassword = async (email: string): Promise<ForgotPasswordResponse> => {
  return apiRequest<ForgotPasswordResponse>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
    requiresAuth: false,
  });
};

export const resetPassword = async (data: ResetPasswordData): Promise<{ message: string }> => {
  return apiRequest<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: data,
    requiresAuth: false,
  });
};

export const logout = async (): Promise<void> => {
  try {
    await apiRequest('/auth/logout', {
      method: 'POST',
      requiresAuth: true,
    });
  } catch {
    // Logout locally even if server call fails
  } finally {
    await clearTokens();
  }
};

export const refreshToken = async (token: string): Promise<{ accessToken: string; refreshToken: string }> => {
  return apiRequest('/auth/refresh', {
    method: 'POST',
    body: { refreshToken: token },
    requiresAuth: false,
  });
};
