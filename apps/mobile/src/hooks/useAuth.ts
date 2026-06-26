import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import {
  login as loginAction,
  register as registerAction,
  logout as logoutAction,
  refreshAccessToken,
  requestPasswordReset as requestPasswordResetAction,
  resetPassword as resetPasswordAction,
  verifyMFA as verifyMFAAction,
  clearError,
  resetMFA,
} from '../store/slices/authSlice';
import { AppDispatch, RootState } from '../store/store';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    user,
    accessToken,
    isAuthenticated,
    loading,
    error,
    mfaRequired,
    mfaSessionToken,
  } = useSelector((state: RootState) => state.auth);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await dispatch(loginAction({ email, password }));
      return result.payload;
    },
    [dispatch]
  );

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      const result = await dispatch(
        registerAction({ email, password, fullName })
      );
      return result.payload;
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    await dispatch(logoutAction());
  }, [dispatch]);

  const refresh = useCallback(async (token: string) => {
    await dispatch(refreshAccessToken(token));
  }, [dispatch]);

  const requestReset = useCallback(async (email: string) => {
    await dispatch(requestPasswordResetAction(email));
  }, [dispatch]);

  const resetPass = useCallback(
    async (token: string, newPassword: string) => {
      await dispatch(resetPasswordAction({ token, newPassword }));
    },
    [dispatch]
  );

  const verifyMfa = useCallback(
    async (sessionToken: string, code: string) => {
      const result = await dispatch(verifyMFAAction({ mfaSessionToken: sessionToken, code }));
      return result.payload;
    },
    [dispatch]
  );

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleResetMFA = useCallback(() => {
    dispatch(resetMFA());
  }, [dispatch]);

  return {
    user,
    accessToken,
    isAuthenticated,
    loading,
    error,
    mfaRequired,
    mfaSessionToken,
    login,
    register,
    logout,
    refresh,
    requestReset,
    resetPass,
    verifyMfa,
    clearError: handleClearError,
    resetMFA: handleResetMFA,
  };
};

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = (selector: (state: RootState) => any) =>
  useSelector(selector);
