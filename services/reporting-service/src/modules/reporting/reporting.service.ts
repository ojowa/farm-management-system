import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { scopedPrisma as prisma } from '@farm/database';

type CreateReportInput = { farmId: string; title: string; status?: string; parameters?: Record<string, any> };
type UpdateReportInput = Partial<CreateReportInput>;

@Injectable()
export class ReportingService {
  async getAllReports(organizationId: string, filter: any = {}, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: any = { entity: 'report' };
    const reports = await prisma.syncQueue.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit });
    const total = await prisma.syncQueue.count({ where });
    const payloadByReportId = new Map<string, { farmId?: string }>();
    const distinctFarmIds = new Set<string>();
    for (const r of reports) {
      const payload = (() => { try { return r.payload ? JSON.parse(r.payload) : {}; } catch { return {}; } })();
      const farmId = payload?.farmId as string | undefined;
      if (farmId) { distinctFarmIds.add(farmId); payloadByReportId.set(r.id, { farmId }); }
    }
    if (distinctFarmIds.size === 0) return { data: [], total: 0, page, totalPages: 0 };
    const allowedFarms = await prisma.farm.findMany({ where: { id: { in: Array.from(distinctFarmIds) }, organizationId }, select: { id: true } });
    const allowedFarmIdSet = new Set(allowedFarms.map((f) => f.id));
    const filtered = reports.filter((r) => { const p = payloadByReportId.get(r.id); return !!p?.farmId && allowedFarmIdSet.has(p.farmId); });
    return { data: filtered, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getReportById(id: string, organizationId: string) {
    const report = await prisma.syncQueue.findUnique({ where: { id } });
    if (!report || report.entity !== 'report') throw new NotFoundException(`Report with ID ${id} not found`);
    const payload = (() => { try { return report.payload ? JSON.parse(report.payload) : {}; } catch { return {}; } })();
    const farmId = payload?.farmId as string | undefined;
    if (!farmId) throw new BadRequestException(`Report ${id} is missing farmId`);
    const farm = await prisma.farm.findFirst({ where: { id: farmId, organizationId }, select: { id: true } });
    if (!farm) throw new NotFoundException(`Farm with ID ${farmId} not found for this organization`);
    return report;
  }

  async createReport(data: CreateReportInput, organizationId: string) {
    if (!data?.farmId || !data?.title) throw new BadRequestException('farmId and title are required');
    const farm = await prisma.farm.findFirst({ where: { id: data.farmId, organizationId }, select: { id: true } });
    if (!farm) throw new NotFoundException(`Farm with ID ${data.farmId} not found for this organization`);
    return prisma.syncQueue.create({
      data: {
        entity: 'report', entityId: undefined as any, operation: 'create',
        payload: JSON.stringify({ farmId: data.farmId, title: data.title, status: data.status ?? 'pending', parameters: data.parameters ?? {} }),
      },
    });
  }

  async updateReport(id: string, data: UpdateReportInput, organizationId: string) {
    const existing = await this.getReportById(id, organizationId);
    const payload = (() => { try { return existing.payload ? JSON.parse(existing.payload) : {}; } catch { return {}; } })();
    const nextFarmId = (data as any).farmId ?? payload.farmId;
    if (nextFarmId) {
      const farm = await prisma.farm.findFirst({ where: { id: nextFarmId, organizationId }, select: { id: true } });
      if (!farm) throw new NotFoundException(`Farm with ID ${nextFarmId} not found for this organization`);
    }
    return prisma.syncQueue.update({ where: { id }, data: { operation: 'update', payload: JSON.stringify({ ...payload, ...data }) } });
  }

  async deleteReport(id: string, organizationId: string) {
    await this.getReportById(id, organizationId);
    return prisma.syncQueue.delete({ where: { id } });
  }
}
