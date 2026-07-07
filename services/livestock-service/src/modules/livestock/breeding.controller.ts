import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { scopedPrisma } from '@farm/database';

function getOrgIdFromRequest(req: any): string {
  return String(req.headers['x-organization-id'] || req.user?.organizationId || '');
}

@Controller('breeding')
export class BreedingController {
  @Get()
  async findAll(@Query('status') status?: string, req?: any) {
    const where: any = { organizationId: getOrgIdFromRequest(req) };
    if (status) where.status = String(status);
    return scopedPrisma.breedingRecord.findMany({ where, orderBy: { breedingDate: 'desc' } });
  }

  @Post()
  async create(@Body() body: any, req?: any) {
    const { sireId, sireName, damId, damName, breedingDate, expectedDueDate, notes } = body;
    return scopedPrisma.breedingRecord.create({
      data: {
        organizationId: getOrgIdFromRequest(req),
        sireId,
        sireName: sireName || null,
        damId,
        damName: damName || null,
        breedingDate: new Date(breedingDate),
        expectedDueDate: expectedDueDate ? new Date(expectedDueDate) : null,
        notes: notes?.trim() || null,
        createdById: req?.user?.sub || null,
        createdByName: req?.user?.email || null,
      },
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const updateData: any = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.actualBirthDate !== undefined) updateData.actualBirthDate = body.actualBirthDate ? new Date(body.actualBirthDate) : null;
    if (body.offspringCount !== undefined) updateData.offspringCount = body.offspringCount;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    return scopedPrisma.breedingRecord.update({ where: { id }, data: updateData });
  }

  @Get('upcoming')
  async findUpcoming(req?: any) {
    return scopedPrisma.breedingRecord.findMany({
      where: {
        organizationId: getOrgIdFromRequest(req),
        status: { in: ['BRED', 'CONFIRMED'] },
        expectedDueDate: { gte: new Date() },
      },
      orderBy: { expectedDueDate: 'asc' },
    });
  }
}
