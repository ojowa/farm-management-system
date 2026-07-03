'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { platformAuthAPI } from '@/lib/api';
import {
  setCookie,
  deleteCookie,
  getUser,
  setUser as setUserStorage,
  clearAllAuthStorage,
} from '@farm/auth';

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

const CONSOLE_PREFIX = 'console_';

function setConsoleCookies(accessToken: string, refreshToken: string) {
  setCookie(`${CONSOLE_PREFIX}accessToken`, accessToken, 1);
  setCookie(`${CONSOLE_PREFIX}refreshToken`, refreshToken, 7);
}

function clearConsoleCookies() {
  deleteCookie(`${CONSOLE_PREFIX}accessToken`);
  deleteCookie(`${CONSOLE_PREFIX}refreshToken`);
}

function clearConsoleAuth() {
  localStorage.removeItem('console_accessToken');
  localStorage.removeItem('console_refreshToken');
  localStorage.removeItem('console_user');
  clearConsoleCookies();
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
      setUserStorage(data, 'console_user');
    } catch {
      clearConsoleAuth();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const stored = getUser<ConsoleUser>('console_user');
    if (stored) { setUser(stored); }
    refreshUser().finally(() => setLoading(false));

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'console_accessToken' && !e.newValue) {
        clearConsoleAuth();
        setUser(null);
        router.push('/login');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshUser, router]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await platformAuthAPI.login({ email, password });
    const u: ConsoleUser = {
      id: data.user.id, email: data.user.email, firstName: data.user.firstName,
      lastName: data.user.lastName, role: data.user.role, organizationId: data.user.organizationId,
      organizationName: data.user.organizationName || '',
    };
    localStorage.setItem('console_accessToken', data.accessToken);
    localStorage.setItem('console_refreshToken', data.refreshToken);
    setUserStorage(u, 'console_user');
    setConsoleCookies(data.accessToken, data.refreshToken);
    setUser(u);
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(() => {
    clearConsoleAuth();
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
