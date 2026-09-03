import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authAPI, apiClient } from '../../services/api';
import { loadCurrencySymbol } from '../../utils/currency';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  roleId: string;
  organizationId: string;
  organizationName?: string;
  permissions: string[];
  avatar?: string;
  isActive?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  planFeatures?: { modules: string[]; farmTypes: string[] };
  twoFactorEnabled?: boolean;
}

function transformUser(raw: any): User {
  const roleName = raw.role?.name ?? raw.role ?? '';
  const rawPermissions = raw.role?.permissions ?? raw.permissions ?? [];
  const permissions: string[] = rawPermissions.map((rp: any) =>
    typeof rp === 'string' ? rp : rp.permission?.name ?? rp.name ?? ''
  ).filter(Boolean);
  return {
    ...raw,
    role: roleName,
    permissions,
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  mfaRequired: boolean;
  mfaSessionToken: string | null;
  lastLoginAt: string | null;
  bootstrapped: boolean;
  socketAccessToken: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  mfaRequired: false,
  mfaSessionToken: null,
  lastLoginAt: null,
  bootstrapped: false,
  socketAccessToken: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await authAPI.login(email, password);
      if (res.requiresMFA) {
        return { requiresMFA: true, mfaToken: res.mfaToken, user: res.user };
      }
      // Set token expiry for client-side check
      if (res.expiresIn) {
        apiClient.setTokenExpiry(res.expiresIn * 1000);
      }
      const profileRes = await authAPI.getProfile();
      await loadCurrencySymbol();
      return {
        requiresMFA: false,
        user: profileRes.data,
        socketAccessToken: res.accessToken || null,
      };
    } catch (err: any) {
      if (__DEV__) console.warn('[THUNK] login failed');
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

export const verifyMFA = createAsyncThunk(
  'auth/verifyMFA',
  async ({ mfaToken, code }: { mfaToken: string; code: string }, { rejectWithValue }) => {
    try {
      const res = await authAPI.verifyMFA(mfaToken, code);
      // Set token expiry for client-side check
      if (res.expiresIn) {
        apiClient.setTokenExpiry(res.expiresIn * 1000);
      }
      const profileRes = await authAPI.getProfile();
      return { user: profileRes.data, socketAccessToken: res.accessToken || null };
    } catch (err: any) {
      if (__DEV__) console.warn('[THUNK] MFA failed');
      return rejectWithValue(err.response?.data?.message || 'MFA verification failed');
    }
  }
);

export const fetchProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authAPI.getProfile();
      return res.data;
    } catch (err: any) {
      if (__DEV__) console.warn('[THUNK] fetchProfile failed');
      return rejectWithValue({
        message: err.response?.data?.message || 'Failed to fetch profile',
        status: err.response?.status
      });
    }
  }
);

export const refreshSocketToken = createAsyncThunk(
  'auth/refreshSocketToken',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.axiosInstance.post('/auth/refresh', {});
      return res.data.accessToken as string;
    } catch {
      return null;
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Unregister push notifications before logging out
      try {
        const { unregisterFromNotifications } = await import('../../services/notifications');
        await unregisterFromNotifications();
      } catch {
        // Non-critical — continue with logout even if unregister fails
      }
      await authAPI.logout();
    } catch {
      // Best-effort — clear local state regardless
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    resetMFA(state) {
      state.mfaRequired = false;
      state.mfaSessionToken = null;
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    setBootstrapped(state) {
      state.bootstrapped = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.requiresMFA) {
          state.mfaRequired = true;
          state.mfaSessionToken = action.payload.mfaToken ?? null;
          state.user = action.payload.user ? transformUser(action.payload.user) : null;
        } else {
          state.isAuthenticated = true;
          state.user = action.payload.user ? transformUser(action.payload.user) : null;
          state.socketAccessToken = action.payload.socketAccessToken ?? null;
          state.lastLoginAt = new Date().toISOString();
          state.mfaRequired = false;
          state.mfaSessionToken = null;
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(verifyMFA.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyMFA.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = transformUser(action.payload.user);
        state.socketAccessToken = action.payload.socketAccessToken ?? null;
        state.mfaRequired = false;
        state.mfaSessionToken = null;
        state.lastLoginAt = new Date().toISOString();
      })
      .addCase(verifyMFA.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = transformUser(action.payload);
        state.isAuthenticated = true;
        state.bootstrapped = true;
      })
      .addCase(fetchProfile.rejected, (state) => {
        state.bootstrapped = true;
        state.isAuthenticated = false;
        state.user = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
        state.mfaRequired = false;
        state.mfaSessionToken = null;
        state.lastLoginAt = null;
        state.socketAccessToken = null;
        apiClient.clearTokenExpiry();
      })
      .addCase(refreshSocketToken.fulfilled, (state, action) => {
        if (action.payload) {
          state.socketAccessToken = action.payload;
        }
      });
  },
});

export const { clearError, resetMFA, setUser, setBootstrapped } = authSlice.actions;
export default authSlice.reducer;
