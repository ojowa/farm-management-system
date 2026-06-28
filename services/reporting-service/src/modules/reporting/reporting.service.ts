import { prisma } from '@farm/database';

type CreateReportInput = {
  farmId: string;
  title: string;
  status?: string;
  parameters?: Record<string, any>;
};

type UpdateReportInput = Partial<CreateReportInput>;

// MVP approach:
// Since reporting-service/prisma/schema.prisma does NOT define a dedicated Report model,
// we implement CRUD over SyncQueue as a "report job/definition" artifact.
// entity='report', operation in ('create','update','delete','generate')
// payload stores JSON string.
export class ReportingService {
  private assertFarmExists = async (farmId: string) => {
    const farm = await prisma.farm.findUnique({ where: { id: farmId } });
    if (!farm) {
      const err: any = new Error(`Farm with ID ${farmId} not found`);
      err.statusCode = 404;
      throw err;
    }
    return farm;
  };

  private getOrganizationId(req: { user?: { organizationId?: string } } | undefined): string {
    const orgId = req?.user?.organizationId;
    if (!orgId) {
      const err: any = new Error('organizationId missing from request');
      err.statusCode = 401;
      throw err;
    }
    return orgId;
  }

  private assertFarmBelongsToOrganization = async (farmId: string, organizationId: string) => {
    const farm = await prisma.farm.findFirst({
      where: { id: farmId, organizationId },
      select: { id: true },
    });
    if (!farm) {
      const err: any = new Error(`Farm with ID ${farmId} not found for this organization`);
      err.statusCode = 404;
      throw err;
    }
    return farm;
  };

  async getAllReports(organizationId: string, filter: any = {}, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: any = { entity: 'report' };

    const reports = await prisma.syncQueue.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    const total = await prisma.syncQueue.count({ where });

    // syncQueue lacks organizationId in schema; enforce tenant isolation by filtering payload.farmId.
    const payloadByReportId = new Map<string, { farmId?: string }>();
    const distinctFarmIds = new Set<string>();

    for (const r of reports) {
      const payload = (() => {
        try {
          return r.payload ? JSON.parse(r.payload) : {};
        } catch {
          return {};
        }
      })();

      const farmId = payload?.farmId as string | undefined;
      if (farmId) {
        distinctFarmIds.add(farmId);
        payloadByReportId.set(r.id, { farmId });
      }
    }

    if (distinctFarmIds.size === 0) return { data: [], total: 0, page, totalPages: 0 };

    const allowedFarms = await prisma.farm.findMany({
      where: {
        id: { in: Array.from(distinctFarmIds) },
        organizationId,
      },
      select: { id: true },
    });

    const allowedFarmIdSet = new Set(allowedFarms.map((f) => f.id));

    const filtered = reports.filter((r) => {
      const p = payloadByReportId.get(r.id);
      const farmId = p?.farmId;
      return !!farmId && allowedFarmIdSet.has(farmId);
    });

    return { data: filtered, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getReportById(id: string, organizationId: string) {
    const report = await prisma.syncQueue.findUnique({ where: { id } });
    if (!report || report.entity !== 'report') {
      const err: any = new Error(`Report with ID ${id} not found`);
      err.statusCode = 404;
      throw err;
    }

    const payload = (() => {
      try {
        return report.payload ? JSON.parse(report.payload) : {};
      } catch {
        return {};
      }
    })();

    const farmId = payload?.farmId as string | undefined;
    if (!farmId) {
      const err: any = new Error(`Report ${id} is missing farmId`);
      err.statusCode = 400;
      throw err;
    }

    await this.assertFarmBelongsToOrganization(farmId, organizationId);
    return report;
  }

  async createReport(data: CreateReportInput, organizationId: string) {
    // minimal runtime validation (avoid new zod dependency)
    if (!data?.farmId || !data?.title) {
      const err: any = new Error('farmId and title are required');
      err.statusCode = 400;
      throw err;
    }

    await this.assertFarmBelongsToOrganization(data.farmId, organizationId);

    return prisma.syncQueue.create({
      data: {
        entity: 'report',
        entityId: undefined as any, // not used in MVP
        operation: 'create',
        payload: JSON.stringify({
          farmId: data.farmId,
          title: data.title,
          status: data.status ?? 'pending',
          parameters: data.parameters ?? {},
        }),
      },
    });
  }

  async updateReport(id: string, data: UpdateReportInput, organizationId: string) {
    if (!data || typeof data !== 'object') {
      const err: any = new Error('Invalid payload');
      err.statusCode = 400;
      throw err;
    }

    // optional title validation if provided
    if ((data as any).title !== undefined && String((data as any).title).length < 2) {
      const err: any = new Error('title must be at least 2 characters');
      err.statusCode = 400;
      throw err;
    }

    const existing = await this.getReportById(id, organizationId);

    const payload = (() => {
      try {
        return existing.payload ? JSON.parse(existing.payload) : {};
      } catch {
        return {};
      }
    })();

    const nextFarmId = (data as any).farmId ?? payload.farmId;
    if (nextFarmId) {
      await this.assertFarmBelongsToOrganization(nextFarmId, organizationId);
    }

    const merged = {
      ...payload,
      ...data,
    };

    return prisma.syncQueue.update({
      where: { id },
      data: {
        operation: 'update',
        payload: JSON.stringify(merged),
      },
    });
  }

  async deleteReport(id: string, organizationId: string) {
    await this.getReportById(id, organizationId);
    return prisma.syncQueue.delete({ where: { id } });
  }
}

