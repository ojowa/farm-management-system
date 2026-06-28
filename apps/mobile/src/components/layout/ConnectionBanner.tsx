import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useAppSelector } from '../../hooks/useAuth';
import { colors } from '../../components/common/UIComponents';
import { useToasts } from '../../hooks/useToasts';

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warning,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerOffline: {
    backgroundColor: colors.error,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

export function ConnectionBanner() {
  const isOnline = useAppSelector((s) => s.sync.isOnline);
  const socketConnected = useAppSelector((s) => s.sync.socketConnected);
  const reconnectAttempt = useAppSelector((s) => s.sync.reconnectAttempt);
  const syncing = useAppSelector((s) => s.sync.syncing);
  const offlineQueue = useAppSelector((s) => s.sync.offlineQueue);
  const { success } = useToasts();
  const wasOffline = useRef(!isOnline);

  // Show "back online" toast when transitioning from offline to online
  useEffect(() => {
    if (wasOffline.current && isOnline && socketConnected) {
      success('Back online');
    }
    wasOffline.current = !isOnline;
  }, [isOnline, socketConnected, success]);

  if (isOnline && socketConnected && offlineQueue.length === 0) {
    return null;
  }

  let message = '';
  if (!isOnline) {
    message = 'You are offline. Changes will sync when reconnected.';
  } else if (!socketConnected && reconnectAttempt > 0) {
    message = `Reconnecting… (attempt ${reconnectAttempt})`;
  } else if (syncing) {
    message = `Syncing ${offlineQueue.length} pending change${offlineQueue.length !== 1 ? 's' : ''}…`;
  } else if (offlineQueue.length > 0) {
    message = `${offlineQueue.length} pending change${offlineQueue.length !== 1 ? 's' : ''} will sync when online.`;
  }

  if (!message) return null;

  return (
    <View style={[styles.banner, !isOnline && styles.bannerOffline]}>
      <View style={styles.dot} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}
