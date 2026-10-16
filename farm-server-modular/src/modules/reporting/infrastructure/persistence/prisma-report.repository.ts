import { Injectable, NotFoundException } from '@nestjs/common';
import { scopedPrisma as prisma } from '../../../../kernel/database';
import { ReportRepository, ScheduledReportRepository } from '../../domain/repositories/report.repository';
import { Report, ScheduledReport } from '../../domain/entities/report.entity';

@Injectable()
export class PrismaReportRepository implements ReportRepository {
  async findById(id: string, organizationId: string): Promise<Report | null> {
    const row = await prisma.report.findFirst({ where: { id, organizationId } });
    if (!row) return null;
    return {
      id: row.id,
      organizationId: row.organizationId,
      farmId: row.farmId || '',
      title: row.title,
      status: row.status,
      parameters: (row.parameters as Record<string, any>) || {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findByOrganizationId(organizationId: string, options?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    farmId?: string;
  }): Promise<{ reports: Report[]; total: number }> {
    const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20, farmId } = options || {};
    const skip = (page - 1) * limit;
    const where: any = { organizationId };
    if (farmId) where.farmId = farmId;

    const [rows, total] = await Promise.all([
      prisma.report.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      prisma.report.count({ where }),
    ]);

    const reports: Report[] = rows.map((row: any) => ({
      id: row.id,
      organizationId: row.organizationId,
      farmId: row.farmId || '',
      title: row.title,
      status: row.status,
      parameters: (row.parameters as Record<string, any>) || {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return { reports, total, page, totalPages: Math.ceil(total / limit) } as any;
  }

  async create(data: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>): Promise<Report> {
    const row = await prisma.report.create({
      data: {
        organizationId: data.organizationId,
        farmId: data.farmId || null,
        title: data.title,
        status: data.status || 'pending',
        parameters: data.parameters || {},
      },
    });
    return {
      id: row.id,
      organizationId: row.organizationId,
      farmId: row.farmId || '',
      title: row.title,
      status: row.status,
      parameters: (row.parameters as Record<string, any>) || {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async update(id: string, data: Partial<Report>): Promise<Report> {
    // The service authorizes access (and org) via getReportById before calling
    // update; this read only merges the partial payload onto the existing row.
    const existing = await prisma.report.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Report not found');
    const merged = { ...existing, ...data };
    const row = await prisma.report.update({
      where: { id },
      data: {
        farmId: merged.farmId || null,
        title: merged.title,
        status: merged.status,
        parameters: merged.parameters || {},
      },
    });
    return {
      id: row.id,
      organizationId: row.organizationId,
      farmId: row.farmId || '',
      title: row.title,
      status: row.status,
      parameters: (row.parameters as Record<string, any>) || {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async delete(id: string): Promise<void> {
    await prisma.report.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaScheduledReportRepository implements ScheduledReportRepository {
  async findByOrganizationId(organizationId: string): Promise<ScheduledReport[]> {
    return prisma.scheduledReport.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<ScheduledReport[]>;
  }

  async findById(id: string, organizationId: string): Promise<ScheduledReport | null> {
    return prisma.scheduledReport.findFirst({ where: { id, organizationId } }) as Promise<ScheduledReport | null>;
  }

  async create(data: Omit<ScheduledReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduledReport> {
    return prisma.scheduledReport.create({ data }) as Promise<ScheduledReport>;
  }

  async update(id: string, data: Partial<ScheduledReport>): Promise<ScheduledReport> {
    return prisma.scheduledReport.update({ where: { id }, data }) as Promise<ScheduledReport>;
  }

  async delete(id: string): Promise<void> {
    await prisma.scheduledReport.delete({ where: { id } });
  }
}
