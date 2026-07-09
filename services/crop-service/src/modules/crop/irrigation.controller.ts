import { Controller, Get, Post, Put, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { scopedPrisma } from '@farm/database';

@Controller('irrigation')
export class IrrigationController {
  @Get('schedule')
  async getActiveSchedules(@Query('organizationId') orgId: string, @Query('farmId') farmId?: string) {
    const where: any = { organizationId: orgId, isActive: true };
    if (farmId) where.farmId = farmId;
    return scopedPrisma.irrigationSchedule.findMany({ where, orderBy: { nextRun: 'asc' } });
  }

  @Post('schedule')
  @HttpCode(HttpStatus.CREATED)
  async createSchedule(@Body() body: any, @Query('organizationId') orgId: string) {
    const { farmId, cropCycleId, name, frequency, waterAmount, unit, startDate, endDate } = body;
    return scopedPrisma.irrigationSchedule.create({
      data: {
        organizationId: orgId, farmId, cropCycleId: cropCycleId || null,
        name, frequency, waterAmount: Number(waterAmount), unit: unit || 'liters',
        startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : null,
        nextRun: new Date(startDate),
      },
    });
  }

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

  @Delete('schedule/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSchedule(@Param('id') id: string) {
    await scopedPrisma.irrigationSchedule.delete({ where: { id } });
  }

  @Post('log')
  @HttpCode(HttpStatus.CREATED)
  async recordLog(@Body() body: any, @Query('organizationId') orgId: string) {
    const { scheduleId, farmId, date, duration, waterAmount, unit, notes } = body;
    const log = await scopedPrisma.irrigationLog.create({
      data: {
        organizationId: orgId, scheduleId, farmId,
        date: new Date(date), duration: duration || null,
        waterAmount: Number(waterAmount), unit: unit || 'liters',
        notes: notes?.trim() || null,
      },
    });
    await scopedPrisma.irrigationSchedule.update({ where: { id: scheduleId }, data: { lastRun: new Date(date) } });
    return log;
  }

  @Get('log')
  async getLogs(@Query('organizationId') orgId: string, @Query('farmId') farmId?: string, @Query('scheduleId') scheduleId?: string) {
    const where: any = { organizationId: orgId };
    if (farmId) where.farmId = farmId;
    if (scheduleId) where.scheduleId = scheduleId;
    return scopedPrisma.irrigationLog.findMany({ where, orderBy: { date: 'desc' } });
  }
}
