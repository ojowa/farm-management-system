import { Repository, Id } from '@farm/domain-core';
import { HealthRecord } from '../entities/health-record.entity';
import { HealthRecordType } from '../value-objects/health-record-type.value-object';

export interface HealthRecordRepository extends Repository<HealthRecord> {
  findByLivestockId(livestockId: Id): Promise<HealthRecord[]>;
  findByType(type: HealthRecordType, organizationId: Id): Promise<HealthRecord[]>;
  findUpcomingCheckups(organizationId: Id, beforeDate: Date): Promise<HealthRecord[]>;
}
