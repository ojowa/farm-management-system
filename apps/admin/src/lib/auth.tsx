'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { startInactivityTracker } from '@/lib/inactivity';

interface User {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: { name: string; permissions: { permission: { name: string }[] }[] };
  organizationId: string | null;
  organization: any;
  twoFactorEnabled: boolean;
  [key: string]: any;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const fetchUser = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/me');
      setState({ user: res.data, isLoading: false, isAuthenticated: true });
    } catch {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!state.isAuthenticated) return;
    const stop = startInactivityTracker(() => {
      logout();
    });
    return stop;
  }, [state.isAuthenticated]);

  const login = async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const data = res.data;

    if (data.requiresMFA) {
      throw { requiresMFA: true, mfaToken: data.mfaToken, user: data.user };
    }

    // Cookies set by server — just fetch user
    await fetchUser();
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
