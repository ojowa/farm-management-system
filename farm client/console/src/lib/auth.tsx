'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { startInactivityTracker } from '@/lib/inactivity';
import { authClient, platformClient } from '@/lib/api';
import { authAudit } from '@/lib/auth-audit';
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
      authAudit('FETCH_USER_START', { endpoint: '/auth/me' });
      const res = await authClient.get('/auth/me');
      const user = res.data;
      authAudit('FETCH_USER_OK', {
        id: user.id,
        email: user.email,
        roleName: user.roleName || user.role?.name,
      });

      let platformAdminRoles: string[] = [];
      try {
        const optsRes = await platformClient.get('/api/platform-options/platform-admin-roles');
        platformAdminRoles = optsRes.data.roles.map((r: any) => r.value);
        authAudit('FETCH_USER_OK', { platformAdminRoles });
      } catch (e) {
        authAudit('FETCH_USER_TRANSIENT', { step: 'platform_admin_roles', error: String(e) });
        platformAdminRoles = [];
      }

      const roleName = user.roleName || user.role?.name;
      authAudit('FETCH_USER_OK', { roleName, isPlatformAdmin: platformAdminRoles.includes(roleName) });
      if (!platformAdminRoles.includes(roleName)) {
        authAudit('FETCH_USER_DENIED', { reason: 'role_not_platform_admin', roleName });
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }
      authAudit('FETCH_USER_OK', { action: 'authenticated' });
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        authAudit('FETCH_USER_DENIED', { reason: 'auth_status', status });
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }
      authAudit('FETCH_USER_TRANSIENT', { status, message: e?.message });
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    authAudit('FETCH_USER_START', { trigger: 'mount' });
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    authAudit('LOGIN_START', { email });
    try {
      const res = await authClient.post('/auth/login', { email, password });
      const data = res.data;
      authAudit('LOGIN_RESPONSE', {
        requiresMFA: data.requiresMFA,
        hasUser: !!data.user,
        hasAccessTokenInBody: !!data.accessToken,
        refreshTokenLength: data.refreshToken ? data.refreshToken.length : 0,
      });

      if (data.requiresMFA) {
        authAudit('LOGIN_MFA_REQUIRED', { hasMfaToken: !!data.mfaToken });
        throw { requiresMFA: true, mfaToken: data.mfaToken, user: data.user };
      }

      const profileRes = await authClient.get('/auth/me');
      const user = profileRes.data;
      authAudit('LOGIN_OK', { id: user.id, email: user.email, roleName: user.roleName || user.role?.name });

      let platformAdminRoles: string[] = [];
      try {
        const optsRes = await platformClient.get('/api/platform-options/platform-admin-roles');
        platformAdminRoles = optsRes.data.roles.map((r: any) => r.value);
      } catch (e) {
        authAudit('LOGIN_DENIED', { reason: 'platform_roles_fetch_failed', error: String(e) });
        platformAdminRoles = [];
      }

      const roleName = user.roleName || user.role?.name;
      if (!platformAdminRoles.includes(roleName)) {
        authAudit('LOGIN_DENIED', { reason: 'role_not_platform_admin', roleName });
        await authClient.post('/auth/logout').catch(() => {});
        setState({ user: null, isLoading: false, isAuthenticated: false });
        throw new Error('Access denied: Platform admin role required');
      }

      authAudit('LOGIN_OK', { action: 'authenticated' });
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch (error) {
      authAudit('LOGIN_FAIL', { error: String(error), requiresMFA: !!(error as any)?.requiresMFA });
      throw error;
    }
  };

  const logout = async () => {
    authAudit('LOGOUT_START', {});
    try {
      await authClient.post('/auth/logout');
    } finally {
      authAudit('LOGOUT_OK', {});
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
