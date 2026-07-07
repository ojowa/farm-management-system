import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { scopedPrisma } from '@farm/database';

function getOrgIdFromRequest(req: any): string {
  return String(req.headers['x-organization-id'] || req.user?.organizationId || '');
}

@Controller('weight')
export class WeightController {
  @Get('livestock/:livestockId')
  async getLivestockWeightHistory(@Param('livestockId') livestockId: string, req?: any) {
    return scopedPrisma.weightRecord.findMany({
      where: { livestockId, organizationId: getOrgIdFromRequest(req) },
      orderBy: { recordedDate: 'desc' },
    });
  }

  @Post('livestock/:livestockId')
  async recordLivestockWeight(@Param('livestockId') livestockId: string, @Body() body: any, req?: any) {
    const { weight, unit, recordedDate, notes } = body;
    return scopedPrisma.weightRecord.create({
      data: {
        organizationId: getOrgIdFromRequest(req),
        livestockId,
        weight: Number(weight),
        unit: unit || 'kg',
        recordedDate: new Date(recordedDate),
        notes: notes?.trim() || null,
        createdById: req?.user?.sub || null,
      },
    });
  }

  @Get('flock/:flockId')
  async getFlockWeightHistory(@Param('flockId') flockId: string, req?: any) {
    return scopedPrisma.weightRecord.findMany({
      where: { flockId, organizationId: getOrgIdFromRequest(req) },
      orderBy: { recordedDate: 'desc' },
    });
  }

  @Post('flock/:flockId')
  async recordFlockWeight(@Param('flockId') flockId: string, @Body() body: any, req?: any) {
    const { weight, unit, recordedDate, notes } = body;
    return scopedPrisma.weightRecord.create({
      data: {
        organizationId: getOrgIdFromRequest(req),
        flockId,
        weight: Number(weight),
        unit: unit || 'kg',
        recordedDate: new Date(recordedDate),
        notes: notes?.trim() || null,
        createdById: req?.user?.sub || null,
      },
    });
  }
}
