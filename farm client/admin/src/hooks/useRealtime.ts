'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/lib/socket';

type Entity =
  | 'farm'
  | 'crop'
  | 'livestock'
  | 'poultry'
  | 'inventory'
  | 'worker'
  | 'sale'
  | 'expense'
  | 'finance'
  | 'flock'
  | 'feeding'
  | 'feedingRecord'
  | 'vaccination'
  | 'vaccinationRecord'
  | 'mortality'
  | 'mortalityRecord'
  | 'egg-production'
  | 'eggProduction'
  | 'medication'
  | 'poultryHouse'
  | 'notification';
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
  const { socket, isConnected } = useSocket();
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const handler = useCallback(
    (event: RealtimeEvent) => {
      const entities = Array.isArray(entity) ? entity : [entity];
      if (entities.includes(event.entity)) {
        onEventRef.current(event);
      }
    },
    [entity]
  );

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on('realtime:event', handler);
    return () => {
      socket.off('realtime:event', handler);
    };
  }, [socket, isConnected, handler]);
}
