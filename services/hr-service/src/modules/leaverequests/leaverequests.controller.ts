import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';
import { scopedPrisma } from '@farm/database';
import { createNotification } from '../../lib/notificationClient';

function getOrgId(req: any): string {
  return String((req as any).user?.organizationId || (req as any)['x-organization-id'] || '');
}

function getUserId(req: any): string {
  return String((req as any).user?.sub || '');
}

function hasPermission(req: any, permission: string): boolean {
  return ((req as any).user?.permissions ?? []).includes(permission);
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('leave/requests')
export class LeaveRequestsController {
  @Permission('hr.read')
  @Get()
  async findAll(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('userId') filterUserId?: string,
  ) {
    const orgId = getOrgId(req);
    const userId = getUserId(req);

    const where: any = { organizationId: orgId };
    if (status) where.status = status;

    if (!hasPermission(req, 'hr.write')) {
      where.userId = userId;
    } else if (filterUserId) {
      where.userId = filterUserId;
    }

    return scopedPrisma.leaveRequest.findMany({
      where,
      include: {
        leaveType: { select: { name: true, isPaid: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Permission('hr.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: any,
    @Body() body: { leaveTypeId: string; startDate: string; endDate: string; reason?: string },
  ) {
    const orgId = getOrgId(req);
    const userId = getUserId(req);
    const { leaveTypeId, startDate, endDate, reason } = body;

    if (!leaveTypeId || !startDate || !endDate) {
      throw new BadRequestException('leaveTypeId, startDate, and endDate are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) throw new BadRequestException('endDate must be after startDate');

    let days = 0;
    const current = new Date(start);
    while (current <= end) {
      const dow = current.getDay();
      if (dow !== 0 && dow !== 6) days++;
      current.setDate(current.getDate() + 1);
    }
    if (days === 0) throw new BadRequestException('Leave must include at least one business day');

    const year = start.getFullYear();
    const balance = await scopedPrisma.leaveBalance.findUnique({
      where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
    });
    if (balance && (balance.usedDays + days) > balance.totalDays) {
      throw new BadRequestException(`Insufficient leave balance. Available: ${balance.totalDays - balance.usedDays} days`);
    }

    return scopedPrisma.leaveRequest.create({
      data: {
        organizationId: orgId,
        userId,
        leaveTypeId,
        startDate: start,
        endDate: end,
        days,
        reason: reason || null,
      },
      include: { leaveType: { select: { name: true } } },
    });
  }

  @Permission('hr.write')
  @Put(':id/approve')
  async approve(@Param('id') id: string, @Req() req: any) {
    if (!hasPermission(req, 'hr.write')) throw new ForbiddenException('Not authorized to approve leave');

    const existing = await scopedPrisma.leaveRequest.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Leave request not found');
    if (existing.status !== 'PENDING') throw new ConflictException('Request is not pending');

    const approverId = getUserId(req);

    const updated = await scopedPrisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: approverId,
        approvedAt: new Date(),
      },
      include: { leaveType: { select: { name: true } } },
    });

    const year = new Date(existing.startDate).getFullYear();
    await scopedPrisma.leaveBalance.upsert({
      where: { userId_leaveTypeId_year: { userId: existing.userId, leaveTypeId: existing.leaveTypeId, year } },
      create: {
        organizationId: existing.organizationId,
        userId: existing.userId,
        leaveTypeId: existing.leaveTypeId,
        year,
        totalDays: 0,
        usedDays: existing.days,
      },
      update: { usedDays: { increment: existing.days } },
    });

    try {
      const leaveType = await scopedPrisma.leaveType.findFirst({ where: { id: existing.leaveTypeId } });
      await createNotification({
        userId: existing.userId,
        title: 'Leave Approved',
        message: `Your ${leaveType?.name || 'leave'} request for ${existing.days} day(s) has been approved.`,
        type: 'SUCCESS',
        link: '/hr/leave',
        entityType: 'LeaveRequest',
        entityId: id,
      });
    } catch {}

    return updated;
  }

  @Permission('hr.write')
  @Put(':id/reject')
  async reject(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { rejectionReason?: string },
  ) {
    if (!hasPermission(req, 'hr.write')) throw new ForbiddenException('Not authorized to reject leave');

    const existing = await scopedPrisma.leaveRequest.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Leave request not found');
    if (existing.status !== 'PENDING') throw new ConflictException('Request is not pending');

    const { rejectionReason } = body;
    const updated = await scopedPrisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: getUserId(req),
        approvedAt: new Date(),
        rejectionReason: rejectionReason || null,
      },
      include: { leaveType: { select: { name: true } } },
    });

    try {
      const leaveType = await scopedPrisma.leaveType.findFirst({ where: { id: existing.leaveTypeId } });
      await createNotification({
        userId: existing.userId,
        title: 'Leave Rejected',
        message: `Your ${leaveType?.name || 'leave'} request for ${existing.days} day(s) has been rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
        type: 'ALERT',
        link: '/hr/leave',
        entityType: 'LeaveRequest',
        entityId: id,
      });
    } catch {}

    return updated;
  }

  @Permission('hr.write')
  @Put(':id/cancel')
  async cancel(@Param('id') id: string, @Req() req: any) {
    const userId = getUserId(req);
    const existing = await scopedPrisma.leaveRequest.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Leave request not found');
    if (existing.userId !== userId) throw new ForbiddenException('Cannot cancel requests from other users');
    if (existing.status !== 'PENDING') throw new ConflictException('Only pending requests can be cancelled');

    return scopedPrisma.leaveRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
