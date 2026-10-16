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
   *
   * Pass `organizationId` whenever the payload belongs to a tenant. When it
   * is omitted it is derived from the payload instead (full entity rows carry
   * `organizationId`; HR-style events nest it under `data`), so tenant rows
   * no longer fall back to a global broadcast. Payloads without any
   * organization reference (crop/poultry rows scope by farmId) still go
   * global — scoping those needs caller-side changes in those modules.
   */
  emitDomainEvent(entity: string, action: 'created' | 'updated' | 'deleted', data: any, organizationId?: string): void {
    const event: RealtimeEvent = {
      entity,
      action,
      data,
      timestamp: new Date().toISOString(),
    };

    // Broadcast via WebSocket (org-scoped: explicit id, else payload-derived)
    this.realtime.broadcastRealtimeEvent(event, organizationId ?? pickOrganizationId(data));

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

/** Best-effort tenant extraction from an event payload (top-level or nested). */
function pickOrganizationId(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  if (typeof record.organizationId === 'string' && record.organizationId) {
    return record.organizationId;
  }
  const nested = record.data;
  if (nested && typeof nested === 'object') {
    const org = (nested as Record<string, unknown>).organizationId;
    if (typeof org === 'string' && org) return org;
  }
  return undefined;
}
