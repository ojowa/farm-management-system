import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { scopedPrisma } from '@farm/database';

function getOrgIdFromRequest(req: any): string {
  return String(req.headers['x-organization-id'] || req.user?.organizationId || '');
}

@Controller('health')
export class HealthController {
  @Get('livestock/:livestockId')
  async getHealthHistory(@Param('livestockId') livestockId: string, @Body() _body: any, req?: any) {
    return scopedPrisma.healthRecord.findMany({
      where: { livestockId, organizationId: getOrgIdFromRequest(req) },
      orderBy: { date: 'desc' },
    });
  }

  @Post('livestock/:livestockId')
  async addHealthRecord(@Param('livestockId') livestockId: string, @Body() body: any, req?: any) {
    const { type, date, description, veterinarian, medications, cost, nextCheckupDate } = body;
    return scopedPrisma.healthRecord.create({
      data: {
        organizationId: getOrgIdFromRequest(req),
        livestockId,
        type,
        date: new Date(date),
        description,
        veterinarian: veterinarian || null,
        medications: medications || null,
        cost: cost || null,
        nextCheckupDate: nextCheckupDate ? new Date(nextCheckupDate) : null,
        createdById: req?.user?.sub || null,
        createdByName: req?.user?.email || null,
      },
    });
  }

  @Get('vaccinations/:livestockId')
  async getVaccinationSchedule(@Param('livestockId') livestockId: string, req?: any) {
    return scopedPrisma.vaccinationSchedule.findMany({
      where: { livestockId, organizationId: getOrgIdFromRequest(req) },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  @Post('vaccinations/:livestockId')
  async scheduleVaccination(@Param('livestockId') livestockId: string, @Body() body: any, req?: any) {
    const { vaccineName, scheduledDate, notes } = body;
    return scopedPrisma.vaccinationSchedule.create({
      data: {
        organizationId: getOrgIdFromRequest(req),
        livestockId,
        vaccineName,
        scheduledDate: new Date(scheduledDate),
        notes: notes?.trim() || null,
        createdById: req?.user?.sub || null,
        createdByName: req?.user?.email || null,
      },
    });
  }

  @Put('vaccinations/:id/administer')
  async administerVaccination(@Param('id') id: string) {
    return scopedPrisma.vaccinationSchedule.update({
      where: { id },
      data: { status: 'ADMINISTERD', administeredDate: new Date() },
    });
  }

  @Get('overdue')
  async getOverdueVaccinations(req?: any) {
    return scopedPrisma.vaccinationSchedule.findMany({
      where: {
        organizationId: getOrgIdFromRequest(req),
        status: 'SCHEDULED',
        scheduledDate: { lt: new Date() },
      },
      orderBy: { scheduledDate: 'asc' },
    });
  }
}
