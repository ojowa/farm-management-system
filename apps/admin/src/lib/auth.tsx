'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  fullName: string;
  role: string;
  organizationId: string;
  organizationName?: string;
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
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
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
  setCookie('accessToken', accessToken, 1);
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

function buildUser(raw: any): User {
  return {
    id: raw.id,
    email: raw.email,
    firstName: raw.firstName || '',
    lastName: raw.lastName || '',
    middleName: raw.middleName || undefined,
    fullName: [raw.firstName, raw.middleName, raw.lastName].filter(Boolean).join(' '),
    role: typeof raw.role === 'string' ? raw.role : raw.role?.name || '',
    organizationId: raw.organizationId,
    organizationName: raw.organization?.name || undefined,
    permissions: raw.role?.permissions?.map((p: any) => p.permission?.name || p) || [],
    avatar: raw.avatar,
  };
}

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
      const userObj = buildUser(data.user || data);
      setUser(userObj);
      localStorage.setItem('user', JSON.stringify(userObj));
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
        router.push('/login');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshUser, router]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authAPI.login({ email, password });
    if (data.mfaRequired) {
      localStorage.setItem('mfaSessionToken', data.mfaSessionToken);
      router.push('/mfa');
      return;
    }
    const userObj = buildUser(data.user);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(userObj));
    setAuthCookies(data.accessToken, data.refreshToken);
    setUser(userObj);
    router.push('/');
  }, [router]);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch { /* best effort */ }
    clearAllAuth();
    setUser(null);
    router.push('/login');
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