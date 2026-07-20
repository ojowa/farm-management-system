import { Injectable } from '@nestjs/common';
import { emitLivestockEvent } from '@farm/utils';
import { Livestock } from '../../domain/entities/livestock.entity';

@Injectable()
export class LivestockEventService {
  async emitLivestockCreatedEvent(livestock: Livestock) {
    await emitLivestockEvent('created', livestock);
  }

  async emitLivestockUpdatedEvent(livestock: Livestock) {
    await emitLivestockEvent('updated', livestock);
  }

  async emitLivestockDeletedEvent(livestockId: string) {
    await emitLivestockEvent('deleted', { id: livestockId });
  }
}
