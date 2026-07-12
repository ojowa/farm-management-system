import { Injectable } from '@nestjs/common';
import { emitHrEvent } from '@farm/utils';

@Injectable()
export class HrEventService {
  async emitHrEvent(action: 'created' | 'updated' | 'deleted', data: { entity: string; data?: any; id?: string }) {
    await emitHrEvent(action, data);
  }
}
