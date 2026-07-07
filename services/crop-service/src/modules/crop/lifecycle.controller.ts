import { Injectable, Get, Post, Put, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { scopedPrisma } from '@farm/database';

function getOrgId(req: any): string {
  return String(req['x-organization-id'] || req.user?.organizationId || '');
}

@Injectable()
export class LifecycleController {
  @Get('calendar')
  async getCalendar(
    @Query('organizationId') orgId: string,
    @Query('farmId') farmId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const where: any = { organizationId: orgId };
    if (farmId) where.farmId = farmId;
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
    return (scopedPrisma as any).cropStage.findMany({
      where: {
        ...where,
        OR: [
          { startDate: { gte: startDate, lte: endDate } },
          { endDate: { gte: startDate, lte: endDate } },
          { startDate: { lte: startDate }, endDate: { gte: endDate } },
        ],
      },
      include: { cropCycle: { include: { crop: true, field: { include: { farm: true } } } } },
      orderBy: { startDate: 'asc' },
    });
  }

  @Get('crop-cycle/:cropCycleId/stages')
  async getStages(@Param('cropCycleId') cropCycleId: string) {
    return (scopedPrisma as any).cropStage.findMany({
      where: { cropCycleId },
      orderBy: { startDate: 'asc' },
    });
  }

  @Post('crop-cycle/:cropCycleId/stages')
  @HttpCode(HttpStatus.CREATED)
  async addStage(@Param('cropCycleId') cropCycleId: string, @Body() body: any, @Query('organizationId') orgId: string) {
    const { stage, startDate, endDate, notes } = body;
    return (scopedPrisma as any).cropStage.create({
      data: {
        organizationId: orgId, cropCycleId, stage,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        notes: notes?.trim() || null,
      },
    });
  }

  @Put('stages/:id')
  async updateStage(@Param('id') id: string, @Body() body: any) {
    const updateData: any = {};
    if (body.stage !== undefined) updateData.stage = body.stage;
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    return (scopedPrisma as any).cropStage.update({ where: { id }, data: updateData });
  }

  @Delete('stages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStage(@Param('id') id: string) {
    await (scopedPrisma as any).cropStage.delete({ where: { id } });
  }
}
