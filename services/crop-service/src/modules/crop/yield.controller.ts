import { Controller, Get, Post, Param, Body, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';
import { scopedPrisma } from '@farm/database';

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('yield')
export class YieldController {
  @Permission('crop.read')
  @Get('crop/:cropId')
  async getYieldHistory(@Param('cropId') cropId: string, @Query('organizationId') orgId: string) {
    return scopedPrisma.yieldRecord.findMany({
      where: { cropId, organizationId: orgId },
      orderBy: { harvestedDate: 'desc' },
    });
  }

  @Permission('crop.write')
  @Post('crop/:cropId')
  @HttpCode(HttpStatus.CREATED)
  async recordYield(@Param('cropId') cropId: string, @Body() body: any, @Query('organizationId') orgId: string) {
    const { cropCycleId, quantity, unit, quality, harvestedDate, notes } = body;
    return scopedPrisma.yieldRecord.create({
      data: {
        organizationId: orgId, cropId, cropCycleId: cropCycleId || null,
        quantity: Number(quantity), unit: unit || 'kg',
        quality: quality || null, harvestedDate: new Date(harvestedDate),
        notes: notes?.trim() || null,
      },
    });
  }

  @Permission('crop.read')
  @Get('crop/:cropId/summary')
  async getYieldSummary(@Param('cropId') cropId: string, @Query('organizationId') orgId: string) {
    const records = await scopedPrisma.yieldRecord.findMany({
      where: { cropId, organizationId: orgId },
      orderBy: { harvestedDate: 'asc' },
    });
    const totalYield = records.reduce((sum: number, r: any) => sum + r.quantity, 0);
    const avgYield = records.length > 0 ? Math.round((totalYield / records.length) * 100) / 100 : 0;
    const latestYield = records.length > 0 ? records[records.length - 1].quantity : 0;
    const previousYield = records.length > 1 ? records[records.length - 2].quantity : null;
    const trend = previousYield !== null ? (latestYield > previousYield ? 'up' : latestYield < previousYield ? 'down' : 'stable') : null;
    return { totalYield, avgYield, totalRecords: records.length, latestYield, trend, records };
  }
}
