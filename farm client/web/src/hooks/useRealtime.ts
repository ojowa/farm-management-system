'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSocketContext } from '@/lib/socket';

type Entity = 'farm' | 'crop' | 'livestock' | 'poultry' | 'inventory' | 'worker' | 'sale' | 'expense' | 'flock' | 'feeding' | 'vaccination' | 'mortality' | 'egg-production' | 'medication' | 'notification';
type Action = 'created' | 'updated' | 'deleted';

interface RealtimeEvent {
  entity: Entity;
  action: Action;
  data: any;
}

export function useRealtime(
  entity: Entity | Entity[],
  onEvent: (event: RealtimeEvent) => void
) {
  const { socket, connected } = useSocketContext();
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const handler = useCallback((event: RealtimeEvent) => {
    const entities = Array.isArray(entity) ? entity : [entity];
    if (entities.includes(event.entity)) {
      onEventRef.current(event);
    }
  }, [entity]);

  useEffect(() => {
    if (!socket || !connected) return;

    socket.on('realtime:event', handler);
    return () => {
      socket.off('realtime:event', handler);
    };
  }, [socket, connected, handler]);
}

export function useReconnectToast() {
  const { connected, reconnecting } = useSocketContext();
  const wasReconnecting = useRef(false);

  useEffect(() => {
    if (reconnecting && !wasReconnecting.current) {
      wasReconnecting.current = true;
    }
    if (connected && wasReconnecting.current) {
      wasReconnecting.current = false;
    }
  }, [connected, reconnecting]);

  return { connected, reconnecting };
}
