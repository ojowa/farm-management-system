import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authAPI } from '../../services/api';

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

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  mfaRequired: boolean;
  mfaSessionToken: string | null;
  lastLoginAt: string | null;
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

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await authAPI.login(email, password);
      if (res.requiresMFA) {
        return { requiresMFA: true, mfaToken: res.mfaToken, user: res.user };
      }
      return {
        requiresMFA: false,
        user: res.user,
        accessToken: res.accessToken || null,
        refreshToken: res.refreshToken || null,
      };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

export const verifyMFA = createAsyncThunk(
  'auth/verifyMFA',
  async ({ mfaToken, code }: { mfaToken: string; code: string }, { rejectWithValue }) => {
    try {
      const res = await authAPI.verifyMFA(mfaToken, code);
      return {
        user: res.user,
        accessToken: res.accessToken || null,
        refreshToken: res.refreshToken || null,
      };
    } catch (err: any) {
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
      return rejectWithValue({
        message: err.response?.data?.message || 'Failed to fetch profile',
        status: err.response?.status
      });
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
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
      // login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.requiresMFA) {
          state.mfaRequired = true;
          state.mfaSessionToken = action.payload.mfaToken ?? null;
          state.user = action.payload.user ?? null;
        } else {
          state.isAuthenticated = true;
          state.user = action.payload.user ?? null;
          state.accessToken = action.payload.accessToken ?? null;
          state.refreshToken = action.payload.refreshToken ?? null;
          state.lastLoginAt = new Date().toISOString();
          state.mfaRequired = false;
          state.mfaSessionToken = null;
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // verifyMFA
      .addCase(verifyMFA.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyMFA.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken ?? null;
        state.refreshToken = action.payload.refreshToken ?? null;
        state.mfaRequired = false;
        state.mfaSessionToken = null;
        state.lastLoginAt = new Date().toISOString();
      })
      .addCase(verifyMFA.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // fetchProfile
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.bootstrapped = true;
      })
      .addCase(fetchProfile.rejected, (state, action: any) => {
        state.bootstrapped = true;
        const status = action.payload?.status;
        if (status === 401 || status === 403 || !state.accessToken) {
          state.isAuthenticated = false;
          state.user = null;
          state.accessToken = null;
          state.refreshToken = null;
        }
      })
      // logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.error = null;
        state.mfaRequired = false;
        state.mfaSessionToken = null;
        state.lastLoginAt = null;
      });
  },
});

export const { clearError, resetMFA, setUser, setBootstrapped } = authSlice.actions;
export default authSlice.reducer;
