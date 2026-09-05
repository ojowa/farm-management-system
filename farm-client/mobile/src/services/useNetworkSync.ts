import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAppDispatch, useAppSelector } from '../modules/auth/hooks/useAuth';
import { setIsOnline, setSocketConnected, setReconnectAttempt } from '../store/slices/syncSlice';
import { socketService } from './socketService';
import { reconcileOfflineQueue } from './reconcileQueue';

export function useNetworkSync() {
  const dispatch = useAppDispatch();
  const reconcileRef = useRef<ReturnType<typeof reconcileOfflineQueue> | null>(null);
  const socketAccessToken = useAppSelector((state) => state.auth.socketAccessToken);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const initialCheckDone = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      socketService.disconnect();
      return;
    }

    let unsubscribeNetInfo: (() => void) | null = null;

    // NetInfo is not reliable on web — default to online
    if (Platform.OS !== 'web') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const NetInfo = require('@react-native-community/netinfo').default;
      unsubscribeNetInfo = NetInfo.addEventListener((state: any) => {
        if (!initialCheckDone.current) {
          initialCheckDone.current = true;
          if (state.isConnected === false) {
            dispatch(setIsOnline(false));
          }
          return;
        }

        const online = state.isConnected === true && state.isInternetReachable !== false;
        dispatch(setIsOnline(online));

        if (online && socketAccessToken && !socketService.isConnected) {
          socketService.connect(socketAccessToken);
        }
      });
    } else {
      // On web, default to online
      dispatch(setIsOnline(true));
      if (socketAccessToken && !socketService.isConnected) {
        socketService.connect(socketAccessToken);
      }
    }

    socketService.setConnectionChangeHandler((connected) => {
      dispatch(setSocketConnected(connected));
    });

    socketService.setReconnectingHandler((attempt) => {
      dispatch(setReconnectAttempt(attempt));
    });

    reconcileRef.current = reconcileOfflineQueue(dispatch);

    return () => {
      unsubscribeNetInfo?.();
      socketService.disconnect();
      reconcileRef.current?.stop();
    };
  }, [dispatch, socketAccessToken, isAuthenticated]);
}
