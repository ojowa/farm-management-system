import authReducer, {
  clearError,
  resetMFA,
  login,
  logout,
  verifyMFA,
  fetchProfile,
  setBootstrapped,
  User,
} from '../store/slices/authSlice';

const mockUser: User = {
  id: 'u1',
  email: 'test@farm.com',
  firstName: 'Test',
  lastName: 'Farmer',
  fullName: 'Test Farmer',
  role: 'farmer',
  roleId: 'role1',
  organizationId: 'org1',
  permissions: ['farms.read'],
};

const initialState = {
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

  it('setBootstrapped sets bootstrapped to true', () => {
    const state = authReducer(initialState, setBootstrapped());
    expect(state.bootstrapped).toBe(true);
  });
});

describe('authSlice — login thunk', () => {
  it('login.pending sets loading and clears error', () => {
    const action = { type: login.pending.type };
    const state = authReducer({ ...initialState, error: 'old' }, action);
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('login.fulfilled with requiresMFA=false sets user and isAuthenticated', () => {
    const action = {
      type: login.fulfilled.type,
      payload: {
        requiresMFA: false,
        user: mockUser,
        accessToken: 'acc123',
        refreshToken: 'ref123',
      },
    };
    const state = authReducer(initialState, action);
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.mfaRequired).toBe(false);
    expect(state.loading).toBe(false);
  });

  it('login.fulfilled with requiresMFA=true sets MFA state', () => {
    const action = {
      type: login.fulfilled.type,
      payload: { requiresMFA: true, mfaToken: 'mfa-tok', user: mockUser },
    };
    const state = authReducer(initialState, action);
    expect(state.mfaRequired).toBe(true);
    expect(state.mfaSessionToken).toBe('mfa-tok');
    expect(state.user).toEqual(mockUser);
  });

  it('login.rejected sets error', () => {
    const action = {
      type: login.rejected.type,
      payload: 'Invalid credentials',
    };
    const state = authReducer({ ...initialState, loading: true }, action);
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Invalid credentials');
  });
});

describe('authSlice — verifyMFA thunk', () => {
  it('verifyMFA.fulfilled sets auth and clears MFA', () => {
    const action = {
      type: verifyMFA.fulfilled.type,
      payload: { user: mockUser },
    };
    const state = authReducer(
      { ...initialState, mfaRequired: true, mfaSessionToken: 'mfa' },
      action
    );
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.mfaRequired).toBe(false);
    expect(state.mfaSessionToken).toBeNull();
  });

  it('verifyMFA.rejected sets error', () => {
    const action = {
      type: verifyMFA.rejected.type,
      payload: 'Invalid code',
    };
    const state = authReducer({ ...initialState, loading: true }, action);
    expect(state.loading).toBe(false);
    expect(state.error).toBe('Invalid code');
  });
});

describe('authSlice — fetchProfile thunk', () => {
  it('fetchProfile.fulfilled sets user and isAuthenticated', () => {
    const action = {
      type: fetchProfile.fulfilled.type,
      payload: mockUser,
    };
    const state = authReducer(initialState, action);
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.bootstrapped).toBe(true);
  });

  it('fetchProfile.rejected marks bootstrapped', () => {
    const action = { type: fetchProfile.rejected.type };
    const state = authReducer(initialState, action);
    expect(state.bootstrapped).toBe(true);
  });
});

describe('authSlice — logout thunk', () => {
  it('logout.fulfilled clears everything', () => {
    const action = { type: logout.fulfilled.type };
    const state = authReducer(
      {
        ...initialState,
        isAuthenticated: true,
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
