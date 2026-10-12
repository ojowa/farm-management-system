import { Inject,  Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ReportRepository, ScheduledReportRepository } from '../../domain/repositories/report.repository';

@Injectable()
export class ReportApplicationService {
  constructor(@Inject('ReportRepository') private readonly reportRepo: ReportRepository, @Inject('ScheduledReportRepository') private readonly scheduledReportRepo: ScheduledReportRepository, 
  ) {}

  async getAllReports(organizationId: string,  options: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    farmId?: string;
  } = {}) {
    return this.reportRepo.findByOrganizationId(organizationId, options);
  }

  async getReportById(id: string,  organizationId: string) {
    const report = await this.reportRepo.findById(id);
    if (!report) throw new NotFoundException(`Report with ID ${id} not found`);
    return report;
  }

  async createReport(data: { farmId: string; title: string; status?: string; parameters?: Record<string, any> },  organizationId: string) {
    if (!data?.farmId || !data?.title) throw new BadRequestException('farmId and title are required');
    return this.reportRepo.create({
      organizationId,
      farmId: data.farmId,
      title: data.title,
      status: data.status ?? 'pending',
      parameters: data.parameters ?? {},
    });
  }

  async updateReport(id: string,  data: Partial<{ farmId: string; title: string; status: string; parameters: Record<string, any> }>,  organizationId: string) {
    await this.getReportById(id, organizationId);
    return this.reportRepo.update(id, data);
  }

  async deleteReport(id: string,  organizationId: string) {
    await this.getReportById(id, organizationId);
    return this.reportRepo.delete(id);
  }

  async getAllScheduledReports(organizationId: string) {
    return this.scheduledReportRepo.findByOrganizationId(organizationId);
  }

  async createScheduledReport(data: {
    organizationId: string;
    name: string;
    template: string;
    recipients?: string[];
    frequency: string;
  }) {
    return this.scheduledReportRepo.create({
      organizationId: data.organizationId,
      name: data.name,
      template: data.template,
      recipients: data.recipients || [],
      frequency: data.frequency,
      nextSend: this.calculateNextSend(data.frequency),
      isActive: true,
    });
  }

  async updateScheduledReport(id: string, data: Partial<{ name: string; template: string; recipients: string[]; frequency: string; isActive: boolean }>) {
    const updateData: any = { ...data };
    if (data.frequency) {
      updateData.nextSend = this.calculateNextSend(data.frequency);
    }
    return this.scheduledReportRepo.update(id, updateData);
  }

  async deleteScheduledReport(id: string) {
    return this.scheduledReportRepo.delete(id);
  }

  private calculateNextSend(frequency: string): Date {
    const now = new Date();
    switch (frequency) {
      case 'DAILY': now.setDate(now.getDate() + 1); break;
      case 'WEEKLY': now.setDate(now.getDate() + 7); break;
      case 'MONTHLY': now.setMonth(now.getMonth() + 1); break;
      case 'QUARTERLY': now.setMonth(now.getMonth() + 3); break;
    }
    return now;
  }
}
