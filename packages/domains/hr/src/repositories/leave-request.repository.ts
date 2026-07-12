import { Repository, Id } from '@farm/domain-core';
import { LeaveRequest } from '../entities/leave-request.entity';
import { LeaveStatus } from '../value-objects/leave-status.value-object';

export interface LeaveRequestRepository extends Repository<LeaveRequest> {
  findByUserId(userId: Id): Promise<LeaveRequest[]>;
  findByOrganizationId(organizationId: Id): Promise<LeaveRequest[]>;
  findByStatus(status: LeaveStatus, organizationId: Id): Promise<LeaveRequest[]>;
  findByUserIdAndLeaveTypeId(userId: Id, leaveTypeId: Id): Promise<LeaveRequest[]>;
}
