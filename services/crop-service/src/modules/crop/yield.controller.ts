import { Controller, Get, Post, Param, Body, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';
import { scopedPrisma } from '@farm/database';

function getOrgId(req: any): string {
  return String(req.user?.organizationId || '');
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('yield')
export class YieldController {
  @Permission('crop.read')
  @Get('crop/:cropId')
  async getYieldHistory(@Req() req: any, @Param('cropId') cropId: string) {
    return scopedPrisma.yieldRecord.findMany({
      where: { cropId, organizationId: getOrgId(req) },
      orderBy: { harvestedDate: 'desc' },
    });
  }

  @Permission('crop.write')
  @Post('crop/:cropId')
  @HttpCode(HttpStatus.CREATED)
  async recordYield(@Req() req: any, @Param('cropId') cropId: string, @Body() body: any) {
    const { cropCycleId, quantity, unit, quality, harvestedDate, notes } = body;
    return scopedPrisma.yieldRecord.create({
      data: {
        organizationId: getOrgId(req), cropId, cropCycleId: cropCycleId || null,
        quantity: Number(quantity), unit: unit || 'kg',
        quality: quality || null, harvestedDate: new Date(harvestedDate),
        notes: notes?.trim() || null,
      },
    });
  }

  @Permission('crop.read')
  @Get('crop/:cropId/summary')
  async getYieldSummary(@Req() req: any, @Param('cropId') cropId: string) {
    const records = await scopedPrisma.yieldRecord.findMany({
      where: { cropId, organizationId: getOrgId(req) },
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
