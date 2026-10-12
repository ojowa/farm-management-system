import { Report, ScheduledReport } from '../entities/report.entity';

export interface ReportRepository {
  findById(id: string): Promise<Report | null>;
  findByOrganizationId(organizationId: string, options?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    farmId?: string;
  }): Promise<{ reports: Report[]; total: number }>;
  create(data: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>): Promise<Report>;
  update(id: string, data: Partial<Report>): Promise<Report>;
  delete(id: string): Promise<void>;
}

export interface ScheduledReportRepository {
  findByOrganizationId(organizationId: string): Promise<ScheduledReport[]>;
  findById(id: string): Promise<ScheduledReport | null>;
  create(data: Omit<ScheduledReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduledReport>;
  update(id: string, data: Partial<ScheduledReport>): Promise<ScheduledReport>;
  delete(id: string): Promise<void>;
}
