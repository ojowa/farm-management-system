export interface RealtimeEvent {
  entity: string;
  action: 'created' | 'updated' | 'deleted';
  data: any;
  timestamp?: string;
}

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:4000';

export async function emitRealtimeEvent(event: Omit<RealtimeEvent, 'timestamp'>): Promise<void> {
  const payload: RealtimeEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(`${API_GATEWAY_URL}/realtime/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Failed to emit realtime event: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to emit realtime event:', error);
  }
}

export function emitFarmEvent(action: 'created' | 'updated' | 'deleted', data: any) {
  return emitRealtimeEvent({ entity: 'farm', action, data });
}

export function emitCropEvent(action: 'created' | 'updated' | 'deleted', data: any) {
  return emitRealtimeEvent({ entity: 'crop', action, data });
}

export function emitLivestockEvent(action: 'created' | 'updated' | 'deleted', data: any) {
  return emitRealtimeEvent({ entity: 'livestock', action, data });
}

export function emitPoultryEvent(action: 'created' | 'updated' | 'deleted', data: any) {
  return emitRealtimeEvent({ entity: 'poultry', action, data });
}

export function emitInventoryEvent(action: 'created' | 'updated' | 'deleted', data: any) {
  return emitRealtimeEvent({ entity: 'inventory', action, data });
}

export function emitFinanceEvent(action: 'created' | 'updated' | 'deleted', data: any) {
  return emitRealtimeEvent({ entity: 'finance', action, data });
}

export function emitMedicationEvent(action: 'created' | 'updated' | 'deleted', data: any) {
  return emitRealtimeEvent({ entity: 'medication', action, data });
}
