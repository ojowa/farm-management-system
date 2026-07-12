import { Repository } from '@farm/domain-core';
import { ScheduledReport } from '../entities/scheduled-report.entity';
import { ReportFrequency } from '../value-objects/report-frequency.value-object';

export interface ScheduledReportRepository extends Repository<ScheduledReport> {
  findByOrganizationId(organizationId: string): Promise<ScheduledReport[]>;
  findByFrequency(frequency: ReportFrequency): Promise<ScheduledReport[]>;
  findActiveReports(): Promise<ScheduledReport[]>;
}
