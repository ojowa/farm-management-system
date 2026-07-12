import { Injectable } from '@nestjs/common';
import { emitPoultryEvent } from '@farm/utils';

@Injectable()
export class PoultryEventService {
  async emitCreated(entityType: string, data: Record<string, unknown>) {
    await emitPoultryEvent('created', { entityType, ...data });
  }

  async emitUpdated(entityType: string, data: Record<string, unknown>) {
    await emitPoultryEvent('updated', { entityType, ...data });
  }

  async emitDeleted(entityType: string, id: string) {
    await emitPoultryEvent('deleted', { entityType, id });
  }
}
