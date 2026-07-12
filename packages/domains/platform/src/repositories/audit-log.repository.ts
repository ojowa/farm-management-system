import { Repository, Id } from '@farm/domain-core';
import { AuditLog } from '../entities/audit-log.entity';

export interface AuditLogRepository extends Repository<AuditLog> {
  findByUserId(userId: string): Promise<AuditLog[]>;
  findByOrganizationId(organizationId: string): Promise<AuditLog[]>;
  findByEntity(entity: string, entityId: string): Promise<AuditLog[]>;
  findByAction(action: string): Promise<AuditLog[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]>;
}
