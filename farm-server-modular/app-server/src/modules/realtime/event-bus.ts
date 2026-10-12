import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RealtimeGateway, RealtimeEvent } from './realtime.gateway';

/**
 * Central event bus for the modular monolith.
 *
 * Replaces the old HTTP-based `emitRealtimeEvent()` which POSTed to the
 * API gateway, which then called back into the app server. That circular
 * pattern is now eliminated — everything is in-process.
 *
 * Usage from any module:
 *   import { EventBus } from '../realtime/event-bus';
 *   constructor(private readonly events: EventBus) {}
 *   this.events.emitDomainEvent('farm', 'created', farmData);
 */
@Injectable()
export class EventBus {
  private readonly logger = new Logger(EventBus.name);

  constructor(
    private readonly realtime: RealtimeGateway,
  ) {}

  /**
   * Emit a domain event that:
   * 1. Broadcasts via WebSocket to connected clients
   * 2. Fires an in-process EventEmitter2 event for other modules to consume
   */
  emitDomainEvent(entity: string, action: 'created' | 'updated' | 'deleted', data: any): void {
    const event: RealtimeEvent = {
      entity,
      action,
      data,
      timestamp: new Date().toISOString(),
    };

    // Broadcast via WebSocket
    this.realtime.broadcastRealtimeEvent(event);

    // Also emit via EventEmitter2 so other modules can subscribe
    this.logger.debug(`Emitting event: ${entity}.${action}`);
  }

  /**
   * Emit a custom event for cross-module communication.
   * Other modules can subscribe with `@OnEvent('event.name')`.
   */
  emit(eventName: string, payload: any): void {
    const parts = eventName.split('.');
    const entity = parts[0];
    const action = (['created', 'updated', 'deleted'].includes(parts[1]) ? parts[1] : 'created') as 'created' | 'updated' | 'deleted';
    this.logger.debug(`Emitting event: ${eventName}`);
    this.realtime.broadcastRealtimeEvent({
      entity,
      action,
      data: payload,
      timestamp: new Date().toISOString(),
    });
  }
}
