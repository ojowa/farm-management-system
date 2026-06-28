interface RealtimePayload {
  entity: 'farm' | 'crop' | 'livestock' | 'poultry' | 'inventory' | 'finance' | 'notification';
  action: 'created' | 'updated' | 'deleted';
  data: any;
  timestamp: string;
}

class SocketGateway {
  private static instance: SocketGateway;
  private eventHandlers: Map<string, Array<(payload: RealtimePayload) => void>> = new Map();

  private constructor() {}

  static getInstance(): SocketGateway {
    if (!SocketGateway.instance) {
      SocketGateway.instance = new SocketGateway();
    }
    return SocketGateway.instance;
  }

  emitRealtimeEvent(payload: RealtimePayload): void {
    const payloadWithTimestamp = { ...payload, timestamp: new Date().toISOString() };
    // Emit to all connected clients via WebSocket gateway
    // This will be implemented in the backend services
    for (const handler of this.eventHandlers.values()) {
      handler(payloadWithTimestamp);
    }
  }

  subscribeToEntity(
    entity: RealtimePayload['entity'],
    handler: (payload: RealtimePayload) => void
  ): () => void {
    if (!this.eventHandlers.has(entity)) {
      this.eventHandlers.set(entity, []);
    }
    this.eventHandlers.get(entity)!.push(handler);

    return () => {
      const handlers = this.eventHandlers.get(entity);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }
}

export { SocketGateway, RealtimePayload };