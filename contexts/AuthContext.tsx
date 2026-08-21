/**
 * AuthContext - Global authentication state management
 *
 * Manages user authentication state, guest mode, and provides
 * login/register/logout/forgotPassword/resetPassword functions.
 *
 * Guest Mode:
 * - Users can browse without authentication
 * - Protected features show AuthPromptModal instead of blocking navigation
 * - Auth is only required for: booking, messaging, dashboard, profile, settings, ad viewing
 */
import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, AuthContextType, ResetPasswordData } from '../types/auth';
import * as authService from '../services/authService';
import * as apiService from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // Derived: authenticated means a real user is logged in (not a guest)
  const isAuthenticated = user !== null && !isGuest;

  // Load persisted session on mount
  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');

      if (token && userData) {
        setUser(JSON.parse(userData));
        setIsGuest(false);
        // Initialize API tokens from storage
        await apiService.initTokens();
      } else {
        // No stored credentials → enter guest mode
        setUser(null);
        setIsGuest(true);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      setUser(null);
      setIsGuest(true);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login({ email, password });
      setUser(response.user);
      setIsGuest(false);
      await AsyncStorage.setItem('userData', JSON.stringify(response.user));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (userData: { name: string; email: string; password: string; phone?: string }) => {
    setIsLoading(true);
    try {
      const response = await authService.register(userData);
      setUser(response.user);
      setIsGuest(false);
      await AsyncStorage.setItem('userData', JSON.stringify(response.user));
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsGuest(true);
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('refreshToken');
      setIsLoading(false);
    }
  }, []);

  const continueAsGuest = useCallback(() => {
    setUser(null);
    setIsGuest(true);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await authService.forgotPassword(email);
  }, []);

  const resetPassword = useCallback(async (data: ResetPasswordData) => {
    await authService.resetPassword(data);
  }, []);

  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    isGuest,
    login,
    register,
    logout,
    continueAsGuest,
    forgotPassword,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
