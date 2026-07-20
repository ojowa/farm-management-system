import { Injectable } from '@nestjs/common';
import { EventBus } from '../../../realtime/event-bus';

@Injectable()
export class HrEventService {
  constructor(private readonly events: EventBus) {}

  emitHrEvent(action: 'created' | 'updated' | 'deleted', data: { entity: string; data?: any; id?: string }) {
    this.events.emitDomainEvent('hr', action, data);
  }
}
