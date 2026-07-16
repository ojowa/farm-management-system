import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth/nestjs';
import { scopedPrisma } from '@farm/database';

function getOrgId(req: any): string {
  return String(req.user?.organizationId || '');
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('pest-disease')
export class PestDiseaseController {
  @Permission('crop.read')
  @Get()
  async findAll(@Req() req: any, @Query('type') type?: string, @Query('severity') severity?: string, @Query('farmId') farmId?: string) {
    const where: any = { organizationId: getOrgId(req) };
    if (type) where.type = type;
    if (severity) where.severity = severity;
    if (farmId) where.farmId = farmId;
    return scopedPrisma.pestDiseaseRecord.findMany({ where, orderBy: { identifiedDate: 'desc' } });
  }

  @Permission('crop.read')
  @Get('active')
  async findActive(@Req() req: any) {
    return scopedPrisma.pestDiseaseRecord.findMany({
      where: { organizationId: getOrgId(req), outcome: null },
      orderBy: { severity: 'desc' },
    });
  }

  @Permission('crop.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() body: any) {
    const { cropCycleId, farmId, type, name, severity, identifiedDate, treatment, notes } = body;
    return scopedPrisma.pestDiseaseRecord.create({
      data: {
        organizationId: getOrgId(req), cropCycleId: cropCycleId || null, farmId,
        type, name, severity: severity || 'LOW',
        identifiedDate: new Date(identifiedDate),
        treatment: treatment?.trim() || null, notes: notes?.trim() || null,
      },
    });
  }

  @Permission('crop.write')
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

  @Permission('crop.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await scopedPrisma.pestDiseaseRecord.delete({ where: { id } });
  }
}
