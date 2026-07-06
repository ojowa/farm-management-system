'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const authClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

interface User {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: { name: string; permissions: { permission: { name: string }[] }[] };
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
      // Platform console requires SUPER_ADMIN or SUPPORT_ADMIN
      if (user.role?.name !== 'SUPER_ADMIN' && user.role?.name !== 'SUPPORT_ADMIN') {
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

    await fetchUser();
  };

  const logout = async () => {
    try {
      await authClient.post('/auth/logout');
    } finally {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  };

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
