'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { platformAuthAPI } from '@/lib/api';

interface ConsoleUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  organizationName: string;
}

interface AuthContextValue {
  user: ConsoleUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
});

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ConsoleUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('console_accessToken');
      if (!token) { setUser(null); return; }
      const { data } = await platformAuthAPI.me();
      setUser(data);
      localStorage.setItem('console_user', JSON.stringify(data));
    } catch {
      localStorage.removeItem('console_accessToken');
      localStorage.removeItem('console_refreshToken');
      localStorage.removeItem('console_user');
      deleteCookie('console_accessToken');
      deleteCookie('console_refreshToken');
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('console_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch { /* ignore */ } }
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await platformAuthAPI.login({ email, password });
    const u: ConsoleUser = {
      id: data.user.id, email: data.user.email, firstName: data.user.firstName,
      lastName: data.user.lastName, role: data.user.role, organizationId: data.user.organizationId,
      organizationName: data.user.organizationName || '',
    };
    localStorage.setItem('console_accessToken', data.accessToken);
    localStorage.setItem('console_refreshToken', data.refreshToken);
    localStorage.setItem('console_user', JSON.stringify(u));
    setCookie('console_accessToken', data.accessToken, 1);
    setCookie('console_refreshToken', data.refreshToken, 7);
    setUser(u);
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem('console_accessToken');
    localStorage.removeItem('console_refreshToken');
    localStorage.removeItem('console_user');
    deleteCookie('console_accessToken');
    deleteCookie('console_refreshToken');
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
