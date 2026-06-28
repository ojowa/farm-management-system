import { useEffect, useRef } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useAppDispatch } from './useAuth';
import { setIsOnline, setSocketConnected, setReconnectAttempt } from '../store/slices/syncSlice';
import { socketService } from '../sync/socketService';
import { reconcileOfflineQueue } from '../sync/reconcileQueue';

export function useNetworkSync() {
  const dispatch = useAppDispatch();
  const reconcileRef = useRef<ReturnType<typeof reconcileOfflineQueue> | null>(null);

  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      dispatch(setIsOnline(online));

      if (online && !socketService.isConnected) {
        socketService.connect();
      }
    });

    socketService.setConnectionChangeHandler((connected) => {
      dispatch(setSocketConnected(connected));
    });

    socketService.setReconnectingHandler((attempt) => {
      dispatch(setReconnectAttempt(attempt));
    });

    socketService.connect();

    reconcileRef.current = reconcileOfflineQueue(dispatch);

    return () => {
      unsubscribeNetInfo();
      socketService.disconnect();
      reconcileRef.current?.stop();
    };
  }, [dispatch]);
}
