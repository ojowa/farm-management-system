import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@farm/database';

@Injectable()
export class PlatformAuditService {
  async findAll(query: {
    page?: number;
    limit?: number;
    action?: string;
    entity?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query.entity) where.entity = query.entity;
    if (query.userId) where.userId = query.userId;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map((l) => ({
        id: l.id,
        userId: l.userId,
        userName: l.user ? `${l.user.firstName} ${l.user.lastName}` : 'System',
        userEmail: l.user?.email,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        createdAt: l.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
    });

    if (!log) {
      throw new NotFoundException('Audit log not found');
    }

    return {
      id: log.id,
      userId: log.userId,
      user: log.user,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      createdAt: log.createdAt,
    };
  }
}
