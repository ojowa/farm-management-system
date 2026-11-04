import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { AppDispatch, RootState } from '../../../store/store';
import {
  login as loginThunk,
  verifyMFA as verifyMFAThunk,
  fetchProfile as fetchProfileThunk,
  fetchOrganizations as fetchOrganizationsThunk,
  switchOrganization as switchOrganizationThunk,
  logout as logoutThunk,
  clearError,
  resetMFA,
  setOrganizationSelectionRequired as setOrgSelectionRequiredAction,
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
    organizations,
    organizationSelectionRequired,
    organizationsLoading,
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

  const fetchOrganizations = useCallback(async () => {
    const result = await dispatch(fetchOrganizationsThunk()).unwrap();
    return result;
  }, [dispatch]);

  const switchOrganization = useCallback(
    async (organizationId: string) => {
      const result = await dispatch(switchOrganizationThunk(organizationId)).unwrap();
      return result;
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    await dispatch(logoutThunk());
  }, [dispatch]);

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleResetMFA = useCallback(() => {
    dispatch(resetMFA());
  }, [dispatch]);

  const setOrganizationSelectionRequired = useCallback((required: boolean) => {
    dispatch(setOrgSelectionRequiredAction(required));
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
    organizations,
    organizationSelectionRequired,
    organizationsLoading,
    login,
    verifyMFA,
    fetchProfile,
    fetchOrganizations,
    switchOrganization,
    logout,
    setOrganizationSelectionRequired,
    clearError: handleClearError,
    resetMFA: handleResetMFA,
  };
};

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T,>(selector: (state: RootState) => T): T =>
  useSelector(selector);
