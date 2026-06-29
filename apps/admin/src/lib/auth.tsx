'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  organizationId: string;
  permissions: string[];
  avatar?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

function setCookie(name: string, value: string, days: number) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

function clearAuthCookies() {
  deleteCookie('accessToken');
  deleteCookie('refreshToken');
}

function setAuthCookies(accessToken: string, refreshToken: string) {
  setCookie('accessToken', accessToken, 7);
  setCookie('refreshToken', refreshToken, 30);
}

function clearAllAuth() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('mfaSessionToken');
  clearAuthCookies();
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  updateProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setUser(null);
        return;
      }
      const { data } = await authAPI.getProfile();
      setUser(data.user || data);
      localStorage.setItem('user', JSON.stringify(data.user || data));
    } catch {
      clearAllAuth();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
    refreshUser().finally(() => setLoading(false));

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'accessToken' && !e.newValue) {
        clearAllAuth();
        setUser(null);
        router.push('/(auth)/login');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshUser, router]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authAPI.login({ email, password });
    if (data.mfaRequired) {
      localStorage.setItem('mfaSessionToken', data.mfaSessionToken);
      router.push('/(auth)/mfa');
      return;
    }
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setAuthCookies(data.accessToken, data.refreshToken);
    setUser(data.user);
    router.push('/');
  }, [router]);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch { /* best effort */ }
    clearAllAuth();
    setUser(null);
    router.push('/(auth)/login');
  }, [router]);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    await authAPI.updateProfile(data);
    await refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, logout, refreshUser, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);