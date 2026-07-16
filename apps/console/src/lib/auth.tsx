'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { startInactivityTracker } from '@/lib/inactivity';
import { authClient, platformClient } from '@/lib/api';
import type { PlatformAdminUser } from '@farm/types';

interface AuthState {
  user: PlatformAdminUser | null;
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
