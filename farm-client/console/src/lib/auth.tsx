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
  transientError: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retryAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface PlatformAdminGate {
  allowed: boolean;
  source: string;
  transient: boolean;
}

// Decide platform-admin access from `/auth/me` alone when the payload embeds
// `role.isPlatformAdmin`. Only fall back to the extra platform-admin-roles
// request for older payloads, and report a transport failure as `transient`
// instead of treating it as "not an admin" — a blip must never log you out.
async function resolvePlatformAdmin(user: any): Promise<PlatformAdminGate> {
  const roleName = user?.roleName || user?.role?.name;

  if (typeof user?.role?.isPlatformAdmin === 'boolean') {
    return { allowed: user.role.isPlatformAdmin === true, source: 'role.isPlatformAdmin', transient: false };
  }

  try {
    const optsRes = await platformClient.get('/api/platform-options/platform-admin-roles');
    const roles: string[] = (optsRes.data?.roles || []).map((r: any) => r.value);
    authAudit('FETCH_USER_OK', { platformAdminRoles: roles });
    return { allowed: roles.includes(roleName), source: 'platform-admin-roles', transient: false };
  } catch (e: any) {
    const status = e?.response?.status;
    if (status === 401 || status === 403) {
      return { allowed: false, source: 'platform-admin-roles', transient: false };
    }
    authAudit('FETCH_USER_TRANSIENT', { step: 'platform_admin_roles', status, error: String(e) });
    return { allowed: false, source: 'platform-admin-roles', transient: true };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    transientError: false,
  });

  const fetchUser = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, transientError: false }));
    try {
      authAudit('FETCH_USER_START', { endpoint: '/auth/me' });
      const res = await authClient.get('/auth/me');
      const user = res.data;
      authAudit('FETCH_USER_OK', {
        id: user.id,
        email: user.email,
        roleName: user.roleName || user.role?.name,
      });

      const gate = await resolvePlatformAdmin(user);
      const roleName = user.roleName || user.role?.name;
      authAudit('FETCH_USER_OK', { roleName, allowed: gate.allowed, source: gate.source });

      if (gate.transient) {
        setState({ user: null, isLoading: false, isAuthenticated: false, transientError: true });
        return;
      }
      if (!gate.allowed) {
        authAudit('FETCH_USER_DENIED', { reason: 'role_not_platform_admin', roleName });
        setState({ user: null, isLoading: false, isAuthenticated: false, transientError: false });
        return;
      }
      authAudit('FETCH_USER_OK', { action: 'authenticated' });
      setState({ user, isLoading: false, isAuthenticated: true, transientError: false });
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        authAudit('FETCH_USER_DENIED', { reason: 'auth_status', status });
        setState({ user: null, isLoading: false, isAuthenticated: false, transientError: false });
        return;
      }
      authAudit('FETCH_USER_TRANSIENT', { status, message: e?.message });
      setState({ user: null, isLoading: false, isAuthenticated: false, transientError: true });
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

      const gate = await resolvePlatformAdmin(user);
      const roleName = user.roleName || user.role?.name;

      if (gate.transient) {
        authAudit('LOGIN_FAIL', { reason: 'platform_admin_check_unavailable', source: gate.source });
        throw new Error('Could not verify platform admin access — check your connection and try again');
      }
      if (!gate.allowed) {
        authAudit('LOGIN_DENIED', { reason: 'role_not_platform_admin', roleName, source: gate.source });
        await authClient.post('/auth/logout').catch(() => {});
        setState({ user: null, isLoading: false, isAuthenticated: false, transientError: false });
        throw new Error('Access denied: Platform admin role required');
      }

      authAudit('LOGIN_OK', { action: 'authenticated' });
      setState({ user, isLoading: false, isAuthenticated: true, transientError: false });
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
      setState({ user: null, isLoading: false, isAuthenticated: false, transientError: false });
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
    <AuthContext.Provider value={{ ...state, login, logout, retryAuth: fetchUser }}>
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
