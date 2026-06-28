import authReducer, {
  clearError,
  resetMFA,
  login,
  register,
  refreshAccessToken,
  logout,
  restoreSession,
  verifyMFA,
  requestPasswordReset,
  resetPassword,
  AuthState,
} from '../store/slices/authSlice';

const mockUser = {
  id: 'u1',
  email: 'test@farm.com',
  fullName: 'Test Farmer',
  role: 'farmer',
  organizationId: 'org1',
  permissions: ['farms.read'],
};

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

describe('authSlice — synchronous reducers', () => {
  it('should return the initial state', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('clearError should clear error', () => {
    const state = authReducer({ ...initialState, error: 'some error' }, clearError());
    expect(state.error).toBeNull();
  });

  it('resetMFA should clear mfaRequired and mfaSessionToken', () => {
    const state = authReducer(
      { ...initialState, mfaRequired: true, mfaSessionToken: 'tok' },
      resetMFA()
    );
    expect(state.mfaRequired).toBe(false);
    expect(state.mfaSessionToken).toBeNull();
  });
});

describe('authSlice — login thunk', () => {
  it('login.pending sets loading and clears error', () => {
    const action = { type: login.pending.type };
    const state = authReducer({ ...initialState, error: 'old' }, action);
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('login.fulfilled sets user and tokens', () => {
    const action = {
      type: login.fulfilled.type,
      payload: {
        accessToken: 'acc123',
        refreshToken: 'ref123',
        user: mockUser,
      },
    };
    const state = authReducer(initialState, action);
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('acc123');
    expect(state.refreshToken).toBe('ref123');
    expect(state.user).toEqual(mockUser);
    expect(state.loading).toBe(false);
  });

  it('login.fulfilled with mfaRequired sets MFA state', () => {
    const action = {
      type: login.fulfilled.type,
      payload: { mfaRequired: true, mfaSessionToken: 'mfa-tok' },
    };
    const state = authReducer(initialState, action);
    expect(state.mfaRequired).toBe(true);
    expect(state.mfaSessionToken).toBe('mfa-tok');
    expect(state.isAuthenticated).toBe(false);
  });

  it('login.rejected sets error and clears auth', () => {
    const action = {
      type: login.rejected.type,
      payload: 'Invalid credentials',
    };
    const state = authReducer({ ...initialState, loading: true }, action);
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Invalid credentials');
    expect(state.isAuthenticated).toBe(false);
  });
});

describe('authSlice — register thunk', () => {
  it('register.fulfilled sets auth state', () => {
    const action = {
      type: register.fulfilled.type,
      payload: { accessToken: 'a', refreshToken: 'r', user: mockUser },
    };
    const state = authReducer(initialState, action);
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
  });

  it('register.rejected sets error', () => {
    const action = { type: register.rejected.type, payload: 'Email taken' };
    const state = authReducer({ ...initialState, loading: true }, action);
    expect(state.error).toBe('Email taken');
    expect(state.loading).toBe(false);
  });
});

describe('authSlice — refreshAccessToken thunk', () => {
  it('refreshAccessToken.fulfilled updates tokens', () => {
    const action = {
      type: refreshAccessToken.fulfilled.type,
      payload: { accessToken: 'new-acc', refreshToken: 'new-ref' },
    };
    const state = authReducer(
      { ...initialState, accessToken: 'old-acc', refreshToken: 'old-ref' },
      action
    );
    expect(state.accessToken).toBe('new-acc');
    expect(state.refreshToken).toBe('new-ref');
  });

  it('refreshAccessToken.rejected clears ALL auth state', () => {
    const action = { type: refreshAccessToken.rejected.type };
    const state = authReducer(
      {
        ...initialState,
        isAuthenticated: true,
        accessToken: 'acc',
        refreshToken: 'ref',
        user: mockUser,
        mfaRequired: true,
        mfaSessionToken: 'mfa',
        lastLoginAt: '2024-01-01',
        loading: true,
      },
      action
    );
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.mfaRequired).toBe(false);
    expect(state.mfaSessionToken).toBeNull();
    expect(state.lastLoginAt).toBeNull();
    expect(state.loading).toBe(false);
  });
});

describe('authSlice — logout thunk', () => {
  it('logout.fulfilled clears everything', () => {
    const action = { type: logout.fulfilled.type };
    const state = authReducer(
      {
        ...initialState,
        isAuthenticated: true,
        accessToken: 'acc',
        refreshToken: 'ref',
        user: mockUser,
        mfaRequired: true,
        mfaSessionToken: 'mfa',
        lastLoginAt: '2024-01-01',
        error: 'err',
      },
      action
    );
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.error).toBeNull();
    expect(state.mfaRequired).toBe(false);
    expect(state.mfaSessionToken).toBeNull();
    expect(state.lastLoginAt).toBeNull();
  });
});

describe('authSlice — restoreSession thunk', () => {
  it('restoreSession.fulfilled with authenticated=true sets user', () => {
    const action = {
      type: restoreSession.fulfilled.type,
      payload: { authenticated: true, accessToken: 'a', refreshToken: 'r', user: mockUser },
    };
    const state = authReducer(initialState, action);
    expect(state.isAuthenticated).toBe(true);
    expect(state.bootstrapped).toBe(true);
    expect(state.user).toEqual(mockUser);
  });

  it('restoreSession.fulfilled with authenticated=false marks bootstrapped', () => {
    const action = {
      type: restoreSession.fulfilled.type,
      payload: { authenticated: false },
    };
    const state = authReducer(initialState, action);
    expect(state.isAuthenticated).toBe(false);
    expect(state.bootstrapped).toBe(true);
  });

  it('restoreSession.rejected marks bootstrapped and not authenticated', () => {
    const action = { type: restoreSession.rejected.type };
    const state = authReducer(initialState, action);
    expect(state.bootstrapped).toBe(true);
    expect(state.isAuthenticated).toBe(false);
  });
});

describe('authSlice — verifyMFA thunk', () => {
  it('verifyMFA.fulfilled sets auth and clears MFA', () => {
    const action = {
      type: verifyMFA.fulfilled.type,
      payload: { accessToken: 'a', refreshToken: 'r', user: mockUser },
    };
    const state = authReducer(
      { ...initialState, mfaRequired: true, mfaSessionToken: 'mfa' },
      action
    );
    expect(state.isAuthenticated).toBe(true);
    expect(state.mfaRequired).toBe(false);
    expect(state.mfaSessionToken).toBeNull();
  });
});

describe('authSlice — password reset thunks', () => {
  it('requestPasswordReset.fulfilled clears loading', () => {
    const action = { type: requestPasswordReset.fulfilled.type };
    const state = authReducer({ ...initialState, loading: true }, action);
    expect(state.loading).toBe(false);
  });

  it('requestPasswordReset.rejected sets error', () => {
    const action = { type: requestPasswordReset.rejected.type, payload: 'Email not found' };
    const state = authReducer({ ...initialState, loading: true }, action);
    expect(state.error).toBe('Email not found');
  });

  it('resetPassword.fulfilled clears loading', () => {
    const action = { type: resetPassword.fulfilled.type };
    const state = authReducer({ ...initialState, loading: true }, action);
    expect(state.loading).toBe(false);
  });

  it('resetPassword.rejected sets error', () => {
    const action = { type: resetPassword.rejected.type, payload: 'Invalid token' };
    const state = authReducer({ ...initialState, loading: true }, action);
    expect(state.error).toBe('Invalid token');
  });
});
