import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth/nestjs';
import { scopedPrisma } from '@farm/database';

function getOrgId(req: any): string {
  return String(req.user?.organizationId || '');
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('lifecycle')
export class LifecycleController {
  @Permission('crop.read')
  @Get('calendar')
  async getCalendar(
    @Req() req: any,
    @Query('farmId') farmId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const where: any = { organizationId: getOrgId(req) };
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

  @Permission('crop.read')
  @Get('crop-cycle/:cropCycleId/stages')
  async getStages(@Param('cropCycleId') cropCycleId: string) {
    return (scopedPrisma as any).cropStage.findMany({
      where: { cropCycleId },
      orderBy: { startDate: 'asc' },
    });
  }

  @Permission('crop.write')
  @Post('crop-cycle/:cropCycleId/stages')
  @HttpCode(HttpStatus.CREATED)
  async addStage(@Req() req: any, @Param('cropCycleId') cropCycleId: string, @Body() body: any) {
    const { stage, startDate, endDate, notes } = body;
    return (scopedPrisma as any).cropStage.create({
      data: {
        organizationId: getOrgId(req), cropCycleId, stage,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        notes: notes?.trim() || null,
      },
    });
  }

  @Permission('crop.write')
  @Put('stages/:id')
  async updateStage(@Param('id') id: string, @Body() body: any) {
    const updateData: any = {};
    if (body.stage !== undefined) updateData.stage = body.stage;
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    return (scopedPrisma as any).cropStage.update({ where: { id }, data: updateData });
  }

  @Permission('crop.delete')
  @Delete('stages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStage(@Param('id') id: string) {
    await (scopedPrisma as any).cropStage.delete({ where: { id } });
  }
}
