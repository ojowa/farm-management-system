import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, registerForceLogoutHandler } from '../../services/api';
import { clearAllStorage } from '../../utils/storage';
import { describeApiError } from '../../utils/apiError';

// Persisted token keys. Keep these in sync with utils/storage.ts so the
// store owns the durable secret material and the storage helper owns the
// bulk-clean contract.
export const ACCESS_TOKEN_KEY = 'accessToken';
export const REFRESH_TOKEN_KEY = 'refreshToken';
export const USER_KEY = 'user';
export const MFA_SESSION_KEY = 'mfaSessionToken';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string; // derived: `${firstName} ${lastName}`
  role: string; // role name string
  roleId: string;
  organizationId: string;
  permissions: string[];
  avatar?: string;
  isActive?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  mfaRequired: boolean;
  mfaSessionToken: string | null;
  lastLoginAt: string | null;
  // Indicates whether restoreSession has run yet. Until that completes we
  // intentionally treat the user as signed-out so the splash screen stays
  // up while we check persisted credentials.
  bootstrapped: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  mfaRequired: false,
  mfaSessionToken: null,
  lastLoginAt: null,
  bootstrapped: false,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(describeApiError(error, 'Login failed'));
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (
    data: { email: string; password: string; fullName: string },
    { rejectWithValue }
  ) => {
    try {
      const [firstName, ...rest] = data.fullName.trim().split(' ');
      const lastName = rest.join(' ') || firstName;
      const response = await authAPI.register({
        email: data.email,
        password: data.password,
        firstName,
        lastName,
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(describeApiError(error, 'Registration failed'));
    }
  }
);

export const refreshAccessToken = createAsyncThunk(
  'auth/refreshToken',
  async (refreshToken: string, { rejectWithValue }) => {
    try {
      const response = await authAPI.refreshToken({ refreshToken });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(describeApiError(error, 'Token refresh failed'));
    }
  }
);

export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async (email: string, { rejectWithValue }) => {
    try {
      await authAPI.requestPasswordReset({ email });
      return 'Password reset email sent';
    } catch (error: any) {
      return rejectWithValue(describeApiError(error, 'Password reset request failed'));
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (
    data: { token: string; newPassword: string },
    { rejectWithValue }
  ) => {
    try {
      await authAPI.resetPassword(data);
      return 'Password reset successful';
    } catch (error: any) {
      return rejectWithValue(describeApiError(error, 'Password reset failed'));
    }
  }
);

export const verifyMFA = createAsyncThunk(
  'auth/verifyMFA',
  async (
    data: { mfaSessionToken: string; code: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await authAPI.verifyMFA(data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(describeApiError(error, 'MFA verification failed'));
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Best-effort server-side logout (token may already be expired)
      try {
        await authAPI.logout();
      } catch {
        // Ignore server errors — local cleanup is what matters
      }
      await clearAllStorage();
      return null;
    } catch (error: any) {
      return rejectWithValue('Logout failed');
    }
  }
);

export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    try {
      const [accessToken, refreshToken, userStr] = await Promise.all([
        AsyncStorage.getItem(ACCESS_TOKEN_KEY),
        AsyncStorage.getItem(REFRESH_TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (!accessToken || !userStr) {
        // No persisted session: leave the user signed-out but mark the
        // bootstrap as complete so the UI can render the login screen.
        return { authenticated: false } as const;
      }

      let user: User;
      try {
        const raw = JSON.parse(userStr) as any;
        // Re-normalize in case the shape changed between app versions
        user = {
          id: raw.id,
          email: raw.email,
          firstName: raw.firstName ?? '',
          lastName: raw.lastName ?? '',
          fullName: raw.fullName ?? `${raw.firstName ?? ''} ${raw.lastName ?? ''}`.trim(),
          role: typeof raw.role === 'object' ? raw.role?.name ?? 'USER' : raw.role ?? 'USER',
          roleId: raw.roleId ?? (typeof raw.role === 'object' ? raw.role?.id : '') ?? '',
          organizationId: raw.organizationId ?? '',
          permissions: raw.permissions ?? (typeof raw.role === 'object' ? raw.role?.permissions ?? [] : []),
          avatar: raw.avatar,
          isActive: raw.isActive,
          lastLoginAt: raw.lastLoginAt,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt,
        };
      } catch {
        // Corrupt user blob: drop it and force a fresh login.
        await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
        return { authenticated: false } as const;
      }

      return {
        authenticated: true,
        accessToken,
        refreshToken,
        user,
      } as const;
    } catch (error) {
      return rejectWithValue('Session restore failed');
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetMFA: (state) => {
      state.mfaRequired = false;
      state.mfaSessionToken = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(login.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.loading = false;
      if (action.payload.mfaRequired) {
        state.mfaRequired = true;
        state.mfaSessionToken = action.payload.mfaSessionToken;
      } else {
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.lastLoginAt = new Date().toISOString();
        saveTokens(action.payload);
      }
    });
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
      state.isAuthenticated = false;
    });

    // Register
    builder.addCase(register.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(register.fulfilled, (state, action) => {
      state.loading = false;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.lastLoginAt = new Date().toISOString();
      saveTokens(action.payload);
    });
    builder.addCase(register.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Refresh Token
    builder.addCase(refreshAccessToken.fulfilled, (state, action) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      saveTokens(action.payload);
    });
    builder.addCase(refreshAccessToken.rejected, (state) => {
      state.isAuthenticated = false;
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.mfaRequired = false;
      state.mfaSessionToken = null;
      state.lastLoginAt = null;
      state.loading = false;
    });

    // Verify MFA
    builder.addCase(verifyMFA.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(verifyMFA.fulfilled, (state, action) => {
      state.loading = false;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.mfaRequired = false;
      state.mfaSessionToken = null;
      state.lastLoginAt = new Date().toISOString();
      saveTokens(action.payload);
    });
    builder.addCase(verifyMFA.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.mfaRequired = false;
      state.mfaSessionToken = null;
      state.lastLoginAt = null;
    });

    // Restore Session
    builder.addCase(restoreSession.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(restoreSession.fulfilled, (state, action) => {
      state.loading = false;
      state.bootstrapped = true;
      if (action.payload.authenticated) {
        state.accessToken = action.payload.accessToken ?? null;
        state.refreshToken = action.payload.refreshToken ?? null;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      } else {
        state.isAuthenticated = false;
      }
    });
    builder.addCase(restoreSession.rejected, (state) => {
      state.loading = false;
      state.bootstrapped = true;
      state.isAuthenticated = false;
    });

    // Password Reset Requests
    builder.addCase(requestPasswordReset.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(requestPasswordReset.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(requestPasswordReset.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    builder.addCase(resetPassword.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(resetPassword.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(resetPassword.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearError, resetMFA } = authSlice.actions;
export default authSlice.reducer;

// Register a force-logout handler so the API interceptor can trigger a
// global logout when a refresh token is no longer valid.
registerForceLogoutHandler(() => {
  storeDispatch(logout());
});

// Lazy reference to the store's dispatch — set once from the store module.
let storeDispatch: any = null;
export function setStoreDispatch(dispatch: any) {
  storeDispatch = dispatch;
}

// Helper function to save tokens. Centralized so the keys stay in sync
// with the bootstrap reducer above.
async function saveTokens(payload: {
  accessToken?: string;
  refreshToken?: string;
  user?: any;
}) {
  if (!payload?.accessToken || !payload.user) return;
  try {
    const raw = payload.user;
    // Normalize: backend returns firstName/lastName + role object; we derive
    // a flat `fullName` and extract role name + permissions for the UI.
    const user: User = {
      id: raw.id,
      email: raw.email,
      firstName: raw.firstName ?? '',
      lastName: raw.lastName ?? '',
      fullName: raw.fullName ?? `${raw.firstName ?? ''} ${raw.lastName ?? ''}`.trim(),
      role: typeof raw.role === 'object' ? raw.role?.name ?? 'USER' : raw.role ?? 'USER',
      roleId: raw.roleId ?? raw.role?.id ?? '',
      organizationId: raw.organizationId ?? '',
      permissions: typeof raw.role === 'object' ? (raw.role?.permissions ?? []) : [],
      avatar: raw.avatar,
      isActive: raw.isActive,
      lastLoginAt: raw.lastLoginAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
    await Promise.all([
      AsyncStorage.setItem(ACCESS_TOKEN_KEY, payload.accessToken),
      AsyncStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken ?? ''),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
    ]);
  } catch (error) {
    // We can't recover from a write failure, but we don't want to crash
    // the UI either. The next mutation will retry; otherwise the user will
    // be prompted to sign in again on next launch.
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('Failed to persist tokens:', error);
    }
  }
}
