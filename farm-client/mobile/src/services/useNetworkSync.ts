import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type { NetInfoState } from '@react-native-community/netinfo';
import { useAppDispatch, useAppSelector } from '../modules/auth/hooks/useAuth';
import { setIsOnline, setSocketConnected, setReconnectAttempt } from '../store/slices/syncSlice';
import { socketService } from './socketService';
import { reconcileOfflineQueue } from './reconcileQueue';

export function useNetworkSync() {
  const dispatch = useAppDispatch();
  const reconcileRef = useRef<ReturnType<typeof reconcileOfflineQueue> | null>(null);
  const socketAccessToken = useAppSelector((state) => state.auth.socketAccessToken);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const userId = useAppSelector((state) => state.auth.user?.id);
  const organizationId = useAppSelector((state) => state.auth.user?.organizationId);

  useEffect(() => {
    if (!isAuthenticated) {
      socketService.disconnect();
      dispatch(setSocketConnected(false));
      dispatch(setReconnectAttempt(0));
      return;
    }

    // Notifications are only delivered to authenticated users who joined a
    // room named after their user id — pass identity so the socket service
    // can join it on connect and reconnect.
    const socketIdentity = userId
      ? { userId, organizationId }
      : undefined;

    let unsubscribeNetInfo: (() => void) | null = null;

    socketService.setConnectionChangeHandler((connected) => {
      dispatch(setSocketConnected(connected));
    });

    socketService.setReconnectingHandler((attempt) => {
      dispatch(setReconnectAttempt(attempt));
    });

    const updateNetworkStatus = (state: NetInfoState) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      dispatch(setIsOnline(online));

      if (online && socketAccessToken && !socketService.isConnected) {
        void socketService.connect(socketAccessToken, socketIdentity);
      }
    };

    // NetInfo is not reliable on web — default to online
    if (Platform.OS !== 'web') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const NetInfo = require('@react-native-community/netinfo').default;
      unsubscribeNetInfo = NetInfo.addEventListener(updateNetworkStatus);
    } else {
      // On web, default to online
      dispatch(setIsOnline(true));
      if (socketAccessToken && !socketService.isConnected) {
        void socketService.connect(socketAccessToken, socketIdentity);
      }
    }

    reconcileRef.current = reconcileOfflineQueue(dispatch);

    return () => {
      unsubscribeNetInfo?.();
      socketService.disconnect();
      reconcileRef.current?.stop();
    };
  }, [dispatch, socketAccessToken, isAuthenticated, userId, organizationId]);
}
