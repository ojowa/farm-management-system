'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';
import {
  setAuthCookies,
  clearAuthCookies,
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  getUser,
  setUser as setUserStorage,
  setMfaToken,
  clearAllAuthStorage,
} from '@farm/auth';

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
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  planFeatures?: { modules: string[]; farmTypes: string[] };
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

function buildUser(raw: any): User {
  const org = raw.organization;
  const planFeatures = org?.subscriptionPlanRef?.features;
  return {
    id: raw.id,
    email: raw.email,
    firstName: raw.firstName || '',
    lastName: raw.lastName || '',
    middleName: raw.middleName || undefined,
    fullName: [raw.firstName, raw.middleName, raw.lastName].filter(Boolean).join(' '),
    role: typeof raw.role === 'string' ? raw.role : raw.role?.name || '',
    organizationId: raw.organizationId,
    organizationName: org?.name || undefined,
    permissions: raw.role?.permissions?.map((p: any) => p.permission?.name || p) || [],
    avatar: raw.avatar,
    subscriptionPlan: org?.subscriptionPlan || undefined,
    subscriptionStatus: org?.subscriptionStatus || undefined,
    planFeatures: planFeatures
      ? { modules: planFeatures.modules || [], farmTypes: planFeatures.farmTypes || [] }
      : { modules: ['farm', 'crop', 'task', 'leave', 'roster', 'basic_reporting'], farmTypes: ['CROP'] },
  };
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
      const token = getAccessToken();
      if (!token) {
        setUser(null);
        return;
      }
      const { data } = await authAPI.getProfile();
      const userObj = buildUser(data.user || data);
      setUser(userObj);
      setUserStorage(userObj);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const stored = getUser<User>();
    const token = getAccessToken();

    if (stored) {
      setUser(stored);
    }

    if (!token) {
      setLoading(false);
      return;
    }

    // Show cached user immediately if available, refresh silently in background
    if (stored) {
      setLoading(false);
      refreshUser();
    } else {
      refreshUser().finally(() => setLoading(false));
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'accessToken' && !e.newValue) {
        clearAllAuthStorage();
        clearAuthCookies();
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
      setMfaToken(data.mfaSessionToken);
      router.push('/mfa');
      return;
    }
    const userObj = buildUser(data.user);
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUserStorage(userObj);
    setAuthCookies(data.accessToken, data.refreshToken, { accessDays: 1 });
    setUser(userObj);
    router.push('/');
  }, [router]);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch { /* best effort */ }
    clearAllAuthStorage();
    clearAuthCookies();
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
