export interface RealtimeEvent {
  entity: string;
  action: 'created' | 'updated' | 'deleted';
  data: any;
  timestamp?: string;
}

/**
 * Stub — in the modular monolith, domain events are emitted via
 * the in-process EventBus (services/realtime/event-bus.ts).
 *
 * These functions are kept for backward compatibility with shared
 * packages that import from @farm/utils, but they are no-ops
 * inside the app-server. The EventBus handles WebSocket + EventEmitter2.
 */
export async function emitRealtimeEvent(_event: Omit<RealtimeEvent, 'timestamp'>): Promise<void> {
  // No-op in modular monolith — use EventBus instead
}

export function emitFarmEvent(_action: 'created' | 'updated' | 'deleted', _data: any) {
  return emitRealtimeEvent({ entity: 'farm', action: _action, data: _data });
}

export function emitCropEvent(_action: 'created' | 'updated' | 'deleted', _data: any) {
  return emitRealtimeEvent({ entity: 'crop', action: _action, data: _data });
}

export function emitLivestockEvent(_action: 'created' | 'updated' | 'deleted', _data: any) {
  return emitRealtimeEvent({ entity: 'livestock', action: _action, data: _data });
}

export function emitPoultryEvent(_action: 'created' | 'updated' | 'deleted', _data: any) {
  return emitRealtimeEvent({ entity: 'poultry', action: _action, data: _data });
}

export function emitInventoryEvent(_action: 'created' | 'updated' | 'deleted', _data: any) {
  return emitRealtimeEvent({ entity: 'inventory', action: _action, data: _data });
}

export function emitFinanceEvent(_action: 'created' | 'updated' | 'deleted', _data: any) {
  return emitRealtimeEvent({ entity: 'finance', action: _action, data: _data });
}

export function emitMedicationEvent(_action: 'created' | 'updated' | 'deleted', _data: any) {
  return emitRealtimeEvent({ entity: 'medication', action: _action, data: _data });
}

export function emitHrEvent(_action: 'created' | 'updated' | 'deleted', _data: any) {
  return emitRealtimeEvent({ entity: 'hr', action: _action, data: _data });
}
