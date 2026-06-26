import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../../services/api';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  organizationId: string;
  permissions: string[];
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
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
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
      const response = await authAPI.register(data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
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
      return rejectWithValue(error.response?.data?.message || 'Token refresh failed');
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
      return rejectWithValue(error.response?.data?.message || 'Password reset request failed');
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
      return rejectWithValue(error.response?.data?.message || 'Password reset failed');
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
      return rejectWithValue(error.response?.data?.message || 'MFA verification failed');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('user');
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
        AsyncStorage.getItem('accessToken'),
        AsyncStorage.getItem('refreshToken'),
        AsyncStorage.getItem('user'),
      ]);

      if (!accessToken || !userStr) {
        return null;
      }

      return {
        accessToken,
        refreshToken,
        user: JSON.parse(userStr),
      };
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
    });

    // Restore Session
    builder.addCase(restoreSession.fulfilled, (state, action) => {
      if (action.payload) {
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      }
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

// Helper function to save tokens
async function saveTokens(payload: any) {
  try {
    await Promise.all([
      AsyncStorage.setItem('accessToken', payload.accessToken),
      AsyncStorage.setItem('refreshToken', payload.refreshToken || ''),
      AsyncStorage.setItem('user', JSON.stringify(payload.user)),
    ]);
  } catch (error) {
    console.error('Failed to save tokens:', error);
  }
}
