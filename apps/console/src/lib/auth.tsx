'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { startInactivityTracker } from '@/lib/inactivity';
import { platformClient } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const authClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

{
  let isRefreshing = false;
  let failedQueue: Array<{ resolve: (v?: unknown) => void; reject: (e?: unknown) => void }> = [];

  const processQueue = (error: unknown) => {
    failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
    failedQueue = [];
  };

  authClient.interceptors.response.use(
    (res) => res,
    async (error) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(() => authClient(originalRequest))
            .catch((err) => Promise.reject(err));
        }
        originalRequest._retry = true;
        isRefreshing = true;
        try {
          await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
          processQueue(null);
          return authClient(originalRequest);
        } catch {
          processQueue(error);
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        } finally {
          isRefreshing = false;
        }
      }
      return Promise.reject(error);
    }
  );
}

interface User {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  roleName?: string;
  role?: { name: string; permissions?: { permission: { name: string }[] }[] };
  organizationId: string | null;
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
      const res = await authClient.get('/auth/me');
      const user = res.data;

      let platformAdminRoles: string[] = [];
      try {
        const optsRes = await platformClient.get('/platform-options/platform-admin-roles');
        platformAdminRoles = optsRes.data.roles.map((r: any) => r.value);
      } catch {
        platformAdminRoles = [];
      }

      const roleName = user.roleName || user.role?.name;
      if (!platformAdminRoles.includes(roleName)) {
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const res = await authClient.post('/auth/login', { email, password });
    const data = res.data;

    if (data.requiresMFA) {
      throw { requiresMFA: true, mfaToken: data.mfaToken, user: data.user };
    }

    const profileRes = await authClient.get('/auth/me');
    const user = profileRes.data;

    let platformAdminRoles: string[] = [];
    try {
      const optsRes = await platformClient.get('/platform-options/platform-admin-roles');
      platformAdminRoles = optsRes.data.roles.map((r: any) => r.value);
    } catch {
      platformAdminRoles = [];
    }

    const roleName = user.roleName || user.role?.name;
    if (!platformAdminRoles.includes(roleName)) {
      await authClient.post('/auth/logout').catch(() => {});
      setState({ user: null, isLoading: false, isAuthenticated: false });
      throw new Error('Access denied: Platform admin role required');
    }

    setState({ user, isLoading: false, isAuthenticated: true });
  };

  const logout = async () => {
    try {
      await authClient.post('/auth/logout');
    } finally {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  };

  useEffect(() => {
    if (!state.isAuthenticated) return;
    const stop = startInactivityTracker(() => {
      logout();
    });
    return stop;
  }, [state.isAuthenticated]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
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
