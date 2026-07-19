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
      console.log('[Console Auth] fetchUser: GET /auth/me');
      const res = await authClient.get('/auth/me');
      const user = res.data;
      console.log('[Console Auth] fetchUser: got user', { id: user.id, email: user.email, roleName: user.roleName || user.role?.name });

      let platformAdminRoles: string[] = [];
      try {
        console.log('[Console Auth] fetchUser: GET /api/platform-options/platform-admin-roles');
        const optsRes = await platformClient.get('/api/platform-options/platform-admin-roles');
        platformAdminRoles = optsRes.data.roles.map((r: any) => r.value);
        console.log('[Console Auth] fetchUser: platform admin roles', platformAdminRoles);
      } catch (e) {
        console.warn('[Console Auth] fetchUser: failed to fetch platform admin roles, defaulting to []', e);
        platformAdminRoles = [];
      }

      const roleName = user.roleName || user.role?.name;
      console.log('[Console Auth] fetchUser: checking role', { roleName, isPlatformAdmin: platformAdminRoles.includes(roleName) });
      if (!platformAdminRoles.includes(roleName)) {
        console.log('[Console Auth] fetchUser: role not in platform admin roles, denying access');
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }
      console.log('[Console Auth] fetchUser: authenticated');
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch (e: any) {
      const status = e?.response?.status;
      // 429 (rate limited) or network/transient errors should NOT log the user out.
      // Only a genuine auth failure (401/403) means the session is invalid.
      if (status === 401 || status === 403) {
        console.warn('[Console Auth] fetchUser: not authenticated', e);
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }
      console.warn('[Console Auth] fetchUser: transient error (status ' + status + '), keeping session pending', e);
      // Leave isLoading true but isAuthenticated false so the page stays put.
      // Do NOT loop on 429 — just stop trying to avoid a rate-limit storm.
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    console.log('[Console Auth] login: POST /auth/login', { email });
    try {
      const res = await authClient.post('/auth/login', { email, password });
      const data = res.data;
      console.log('[Console Auth] login: response received', { 
        requiresMFA: data.requiresMFA, 
        hasUser: !!data.user,
        hasAccessToken: !!data.accessToken,
        refreshTokenLength: data.refreshToken ? data.refreshToken.length : 0,
      });

      if (data.requiresMFA) {
        console.log('[Console Auth] login: MFA required, throwing');
        throw { requiresMFA: true, mfaToken: data.mfaToken, user: data.user };
      }

      console.log('[Console Auth] login: attempting to fetch profile');
      const profileRes = await authClient.get('/auth/me');
      const user = profileRes.data;
      console.log('[Console Auth] login: got user', { id: user.id, email: user.email, roleName: user.roleName || user.role?.name });

      let platformAdminRoles: string[] = [];
      try {
        console.log('[Console Auth] login: GET /api/platform-options/platform-admin-roles');
        const optsRes = await platformClient.get('/api/platform-options/platform-admin-roles');
        platformAdminRoles = optsRes.data.roles.map((r: any) => r.value);
        console.log('[Console Auth] login: platform admin roles', platformAdminRoles);
      } catch (e) {
        console.warn('[Console Auth] login: failed to fetch platform admin roles, defaulting to []', e);
        platformAdminRoles = [];
      }

      const roleName = user.roleName || user.role?.name;
      console.log('[Console Auth] login: checking role', { roleName, isPlatformAdmin: platformAdminRoles.includes(roleName) });
      if (!platformAdminRoles.includes(roleName)) {
        console.log('[Console Auth] login: role not in platform admin roles, logging out');
        await authClient.post('/auth/logout').catch(() => {});
        setState({ user: null, isLoading: false, isAuthenticated: false });
        throw new Error('Access denied: Platform admin role required');
      }

      console.log('[Console Auth] login: authenticated');
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch (error) {
      console.error('[Console Auth] login error:', error);
      throw error;
    }
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
