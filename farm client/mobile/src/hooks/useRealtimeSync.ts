import { useEffect, useRef } from 'react';
import { socketService, RealtimePayload } from '../sync/socketService';
import { useAppDispatch } from './useAuth';

type ModuleName = 'farm' | 'crop' | 'livestock' | 'poultry' | 'finance';

export function useRealtimeSync(module: ModuleName, onInvalidate: () => void) {
  const dispatch = useAppDispatch();
  const callbackRef = useRef(onInvalidate);
  callbackRef.current = onInvalidate;

  useEffect(() => {
    const unsub = socketService.onModuleEvent(module, {
      onCreated: () => callbackRef.current(),
      onUpdated: () => callbackRef.current(),
      onDeleted: () => callbackRef.current(),
    });

    return unsub;
  }, [module, dispatch]);
}
