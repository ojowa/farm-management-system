import { Repository, Id } from '@farm/domain-core';
import { Attendance } from '../entities/attendance.entity';

export interface AttendanceRepository extends Repository<Attendance> {
  findByWorkerIdAndDate(workerId: Id, date: Date): Promise<Attendance | null>;
  findByOrganizationIdAndDate(organizationId: Id, date: Date): Promise<Attendance[]>;
  findByWorkerIdAndDateRange(workerId: Id, startDate: Date, endDate: Date): Promise<Attendance[]>;
}
