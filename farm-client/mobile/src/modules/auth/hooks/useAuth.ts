import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { AppDispatch, RootState } from '../../../store/store';
import {
  login as loginThunk,
  verifyMFA as verifyMFAThunk,
  fetchProfile as fetchProfileThunk,
  logout as logoutThunk,
  clearError,
  resetMFA,
} from '../services/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    user,
    isAuthenticated,
    loading,
    error,
    mfaRequired,
    mfaSessionToken,
    bootstrapped,
    lastLoginAt,
  } = useSelector((state: RootState) => state.auth);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await dispatch(loginThunk({ email, password })).unwrap();
      return result;
    },
    [dispatch]
  );

  const verifyMFA = useCallback(
    async (mfaToken: string, code: string) => {
      const result = await dispatch(verifyMFAThunk({ mfaToken, code })).unwrap();
      return result;
    },
    [dispatch]
  );

  const fetchProfile = useCallback(async () => {
    const result = await dispatch(fetchProfileThunk()).unwrap();
    return result;
  }, [dispatch]);

  const logout = useCallback(async () => {
    await dispatch(logoutThunk());
  }, [dispatch]);

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleResetMFA = useCallback(() => {
    dispatch(resetMFA());
  }, [dispatch]);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    mfaRequired,
    mfaSessionToken,
    bootstrapped,
    lastLoginAt,
    login,
    verifyMFA,
    fetchProfile,
    logout,
    clearError: handleClearError,
    resetMFA: handleResetMFA,
  };
};

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T,>(selector: (state: RootState) => T): T =>
  useSelector(selector);
