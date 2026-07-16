import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  Req,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth/nestjs';
import { scopedPrisma } from '@farm/database';

function getOrgId(req: any): string {
  return String((req as any).user?.organizationId || (req as any)['x-organization-id'] || '');
}

function getUserId(req: any): string {
  return String((req as any).user?.sub || '');
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('leave/balance')
export class LeaveBalanceController {
  @Permission('hr.read')
  @Get()
  async findAll(
    @Req() req: any,
    @Query('userId') queryUserId?: string,
    @Query('year') yearStr?: string,
  ) {
    const orgId = getOrgId(req);
    const userId = queryUserId || getUserId(req);
    const year = parseInt(yearStr || '') || new Date().getFullYear();

    const balances = await scopedPrisma.leaveBalance.findMany({
      where: { organizationId: orgId, userId, year },
      include: { leaveType: { select: { id: true, name: true, isPaid: true } } },
    });

    const types = await scopedPrisma.leaveType.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, name: true, daysPerYear: true, isPaid: true },
    });

    return types.map((t) => {
      const existing = balances.find((b) => b.leaveTypeId === t.id);
      return {
        leaveTypeId: t.id,
        leaveTypeName: t.name,
        isPaid: t.isPaid,
        totalDays: existing?.totalDays ?? t.daysPerYear,
        usedDays: existing?.usedDays ?? 0,
        remainingDays: (existing?.totalDays ?? t.daysPerYear) - (existing?.usedDays ?? 0),
      };
    });
  }

  @Permission('hr.write')
  @Put()
  async upsert(
    @Req() req: any,
    @Body() body: { userId: string; leaveTypeId: string; year: number; totalDays: number },
  ) {
    const orgId = getOrgId(req);
    const { userId, leaveTypeId, year, totalDays } = body;

    if (!userId || !leaveTypeId || !year || totalDays === undefined) {
      throw new BadRequestException('userId, leaveTypeId, year, and totalDays are required');
    }

    return scopedPrisma.leaveBalance.upsert({
      where: { userId_leaveTypeId_year: { userId, leaveTypeId, year } },
      create: { organizationId: orgId, userId, leaveTypeId, year, totalDays, usedDays: 0 },
      update: { totalDays },
    });
  }
}
