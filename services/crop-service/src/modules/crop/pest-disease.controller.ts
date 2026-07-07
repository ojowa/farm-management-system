import { Injectable, Get, Post, Put, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { scopedPrisma } from '@farm/database';

function getOrgId(req: any): string {
  return String(req['x-organization-id'] || req.user?.organizationId || '');
}

@Injectable()
export class PestDiseaseController {
  @Get()
  async findAll(@Query('organizationId') orgId: string, @Query('type') type?: string, @Query('severity') severity?: string, @Query('farmId') farmId?: string) {
    const where: any = { organizationId: orgId };
    if (type) where.type = type;
    if (severity) where.severity = severity;
    if (farmId) where.farmId = farmId;
    return scopedPrisma.pestDiseaseRecord.findMany({ where, orderBy: { identifiedDate: 'desc' } });
  }

  @Get('active')
  async findActive(@Query('organizationId') orgId: string) {
    return scopedPrisma.pestDiseaseRecord.findMany({
      where: { organizationId: orgId, outcome: null },
      orderBy: { severity: 'desc' },
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any, @Query('organizationId') orgId: string) {
    const { cropCycleId, farmId, type, name, severity, identifiedDate, treatment, notes } = body;
    return scopedPrisma.pestDiseaseRecord.create({
      data: {
        organizationId: orgId, cropCycleId: cropCycleId || null, farmId,
        type, name, severity: severity || 'LOW',
        identifiedDate: new Date(identifiedDate),
        treatment: treatment?.trim() || null, notes: notes?.trim() || null,
      },
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const updateData: any = {};
    if (body.treatment !== undefined) updateData.treatment = body.treatment?.trim() || null;
    if (body.treatedDate !== undefined) updateData.treatedDate = body.treatedDate ? new Date(body.treatedDate) : null;
    if (body.outcome !== undefined) updateData.outcome = body.outcome?.trim() || null;
    if (body.severity !== undefined) updateData.severity = body.severity;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;
    return scopedPrisma.pestDiseaseRecord.update({ where: { id }, data: updateData });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await scopedPrisma.pestDiseaseRecord.delete({ where: { id } });
  }
}
