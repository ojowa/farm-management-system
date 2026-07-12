import { Injectable } from '@nestjs/common';
import { scopedPrisma as prisma } from '@farm/database';
import { ReportRepository, ScheduledReportRepository } from '../../domain/repositories/report.repository';
import { Report, ScheduledReport } from '../../domain/entities/report.entity';

@Injectable()
export class PrismaReportRepository implements ReportRepository {
  async findById(id: string): Promise<Report | null> {
    const record = await prisma.syncQueue.findUnique({ where: { id } });
    if (!record || record.entity !== 'report') return null;
    const payload = (() => { try { return record.payload ? JSON.parse(record.payload) : {}; } catch { return {}; } })();
    return {
      id: record.id,
      farmId: payload.farmId || '',
      title: payload.title || '',
      status: payload.status || 'pending',
      parameters: payload.parameters || {},
      createdAt: record.createdAt,
      updatedAt: record.createdAt,
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
    const where: any = { entity: 'report' };

    const records = await prisma.syncQueue.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit });
    const total = await prisma.syncQueue.count({ where });

    const reports: Report[] = records
      .map((r) => {
        const payload = (() => { try { return r.payload ? JSON.parse(r.payload) : {}; } catch { return {}; } })();
        return {
          id: r.id,
          farmId: payload.farmId || '',
          title: payload.title || '',
          status: payload.status || 'pending',
          parameters: payload.parameters || {},
          createdAt: r.createdAt,
          updatedAt: r.createdAt,
        };
      })
      .filter((r) => !farmId || r.farmId === farmId);

    return { reports, total, page, totalPages: Math.ceil(total / limit) } as any;
  }

  async create(data: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>): Promise<Report> {
    const record = await prisma.syncQueue.create({
      data: {
        entity: 'report',
        entityId: undefined as any,
        operation: 'create',
        payload: JSON.stringify({ farmId: data.farmId, title: data.title, status: data.status, parameters: data.parameters }),
      },
    });
    return {
      id: record.id,
      farmId: data.farmId,
      title: data.title,
      status: data.status,
      parameters: data.parameters,
      createdAt: record.createdAt,
      updatedAt: record.createdAt,
    };
  }

  async update(id: string, data: Partial<Report>): Promise<Report> {
    const existing = await this.findById(id);
    if (!existing) throw new Error('Report not found');
    const merged = { ...existing, ...data };
    await prisma.syncQueue.update({
      where: { id },
      data: { operation: 'update', payload: JSON.stringify({ farmId: merged.farmId, title: merged.title, status: merged.status, parameters: merged.parameters }) },
    });
    return merged as Report;
  }

  async delete(id: string): Promise<void> {
    await prisma.syncQueue.delete({ where: { id } });
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

  async findById(id: string): Promise<ScheduledReport | null> {
    return prisma.scheduledReport.findUnique({ where: { id } }) as Promise<ScheduledReport | null>;
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
