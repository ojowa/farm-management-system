import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';
import { scopedPrisma } from '@farm/database';

function getOrgId(req: any): string {
  return String(req.user?.organizationId || '');
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('irrigation')
export class IrrigationController {
  @Permission('crop.read')
  @Get('schedule')
  async getActiveSchedules(@Req() req: any, @Query('farmId') farmId?: string) {
    const where: any = { organizationId: getOrgId(req), isActive: true };
    if (farmId) where.farmId = farmId;
    return scopedPrisma.irrigationSchedule.findMany({ where, orderBy: { nextRun: 'asc' } });
  }

  @Permission('crop.write')
  @Post('schedule')
  @HttpCode(HttpStatus.CREATED)
  async createSchedule(@Req() req: any, @Body() body: any) {
    const { farmId, cropCycleId, name, frequency, waterAmount, unit, startDate, endDate } = body;
    return scopedPrisma.irrigationSchedule.create({
      data: {
        organizationId: getOrgId(req), farmId, cropCycleId: cropCycleId || null,
        name, frequency, waterAmount: Number(waterAmount), unit: unit || 'liters',
        startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : null,
        nextRun: new Date(startDate),
      },
    });
  }

  @Permission('crop.write')
  @Put('schedule/:id')
  async updateSchedule(@Param('id') id: string, @Body() body: any) {
    const updateData: any = {};
    for (const key of ['name', 'frequency', 'isActive']) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }
    if (body.waterAmount !== undefined) updateData.waterAmount = Number(body.waterAmount);
    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    return scopedPrisma.irrigationSchedule.update({ where: { id }, data: updateData });
  }

  @Permission('crop.delete')
  @Delete('schedule/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSchedule(@Param('id') id: string) {
    await scopedPrisma.irrigationSchedule.delete({ where: { id } });
  }

  @Permission('crop.write')
  @Post('log')
  @HttpCode(HttpStatus.CREATED)
  async recordLog(@Req() req: any, @Body() body: any) {
    const { scheduleId, farmId, date, duration, waterAmount, unit, notes } = body;
    const log = await scopedPrisma.irrigationLog.create({
      data: {
        organizationId: getOrgId(req), scheduleId, farmId,
        date: new Date(date), duration: duration || null,
        waterAmount: Number(waterAmount), unit: unit || 'liters',
        notes: notes?.trim() || null,
      },
    });
    await scopedPrisma.irrigationSchedule.update({ where: { id: scheduleId }, data: { lastRun: new Date(date) } });
    return log;
  }

  @Permission('crop.read')
  @Get('log')
  async getLogs(@Req() req: any, @Query('farmId') farmId?: string, @Query('scheduleId') scheduleId?: string) {
    const where: any = { organizationId: getOrgId(req) };
    if (farmId) where.farmId = farmId;
    if (scheduleId) where.scheduleId = scheduleId;
    return scopedPrisma.irrigationLog.findMany({ where, orderBy: { date: 'desc' } });
  }
}
