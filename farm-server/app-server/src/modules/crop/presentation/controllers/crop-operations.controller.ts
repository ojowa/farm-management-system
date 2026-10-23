import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthorizationGuard, JwtAuthGuard, Permission } from '@farm/auth-server/nestjs';
import { prisma } from '@farm/database';

function organizationId(req: any): string {
  return String(req.user?.organizationId || '');
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException(`"${field}" is required`);
  }
  return value.trim();
}

function requiredNumber(value: unknown, field: string): number {
  const parsed = Number(value);
  if (value === undefined || value === null || value === '' || !Number.isFinite(parsed) || parsed < 0) {
    throw new BadRequestException(`"${field}" must be a non-negative number`);
  }
  return parsed;
}

function optionalDate(value: unknown, field: string): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new BadRequestException(`"${field}" must be a valid date`);
  return date;
}

async function assertFarm(farmId: string, orgId: string): Promise<void> {
  const farm = await prisma.farm.findFirst({ where: { id: farmId, organizationId: orgId } });
  if (!farm) throw new BadRequestException('Unknown farm');
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('irrigation')
export class IrrigationController {
  @Permission('crop.read')
  @Get('schedule')
  async listSchedules(@Req() req: any, @Query('farmId') farmId?: string, @Query('isActive') isActive?: string) {
    const where: Record<string, unknown> = { organizationId: organizationId(req), deletedAt: null };
    if (farmId) where.farmId = farmId;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    const data = await prisma.irrigationSchedule.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: { logs: { orderBy: { date: 'desc' }, take: 1 } },
    });
    return { data, total: data.length };
  }

  @Permission('crop.write')
  @Post('schedule')
  @HttpCode(HttpStatus.CREATED)
  async createSchedule(@Req() req: any, @Body() body: any) {
    const orgId = organizationId(req);
    const farmId = requiredString(body.farmId, 'farmId');
    await assertFarm(farmId, orgId);
    const startDate = optionalDate(body.startDate, 'startDate');
    if (!startDate) throw new BadRequestException('"startDate" is required');
    const endDate = optionalDate(body.endDate, 'endDate');
    if (endDate && endDate < startDate) throw new BadRequestException('"endDate" cannot precede "startDate"');
    return prisma.irrigationSchedule.create({
      data: {
        organizationId: orgId,
        farmId,
        name: requiredString(body.name, 'name'),
        frequency: requiredString(body.frequency, 'frequency'),
        waterAmount: requiredNumber(body.waterAmount, 'waterAmount'),
        unit: typeof body.unit === 'string' && body.unit.trim() ? body.unit.trim() : 'liters',
        startDate,
        endDate: endDate ?? null,
        isActive: body.isActive !== false,
        createdById: req.user?.sub || null,
      },
    });
  }

  @Permission('crop.write')
  @Put('schedule/:id')
  async updateSchedule(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const orgId = organizationId(req);
    const existing = await prisma.irrigationSchedule.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Irrigation schedule not found');
    if (body.farmId) await assertFarm(body.farmId, orgId);
    const startDate = optionalDate(body.startDate, 'startDate');
    const endDate = optionalDate(body.endDate, 'endDate');
    const effectiveStart = startDate ?? existing.startDate;
    const effectiveEnd = endDate === undefined ? existing.endDate : endDate;
    if (effectiveEnd && effectiveEnd < effectiveStart) {
      throw new BadRequestException('"endDate" cannot precede "startDate"');
    }
    const data: Record<string, unknown> = {};
    for (const field of ['farmId', 'name', 'frequency', 'unit'] as const) {
      if (body[field] !== undefined) data[field] = requiredString(body[field], field);
    }
    if (body.waterAmount !== undefined) data.waterAmount = requiredNumber(body.waterAmount, 'waterAmount');
    if (startDate !== undefined) data.startDate = startDate;
    if (endDate !== undefined) data.endDate = endDate;
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
    return prisma.irrigationSchedule.update({ where: { id }, data });
  }

  @Permission('crop.delete')
  @Delete('schedule/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSchedule(@Req() req: any, @Param('id') id: string) {
    const result = await prisma.irrigationSchedule.updateMany({
      where: { id, organizationId: organizationId(req), deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
    if (!result.count) throw new NotFoundException('Irrigation schedule not found');
  }

  @Permission('crop.read')
  @Get('log')
  async listLogs(@Req() req: any, @Query('farmId') farmId?: string, @Query('limit') limit?: string) {
    const take = Math.min(Math.max(Number.parseInt(limit || '50', 10) || 50, 1), 200);
    const where: Record<string, unknown> = { organizationId: organizationId(req), deletedAt: null };
    if (farmId) where.farmId = farmId;
    const data = await prisma.irrigationLog.findMany({
      where,
      orderBy: { date: 'desc' },
      take,
      include: { schedule: true },
    });
    return { data, total: data.length };
  }

  @Permission('crop.write')
  @Post('log')
  @HttpCode(HttpStatus.CREATED)
  async createLog(@Req() req: any, @Body() body: any) {
    const orgId = organizationId(req);
    const schedule = await prisma.irrigationSchedule.findFirst({
      where: { id: requiredString(body.scheduleId, 'scheduleId'), organizationId: orgId, deletedAt: null },
    });
    if (!schedule) throw new NotFoundException('Irrigation schedule not found');
    const date = optionalDate(body.date, 'date') ?? new Date();
    const result = await prisma.irrigationLog.create({
      data: {
        organizationId: orgId,
        scheduleId: schedule.id,
        farmId: schedule.farmId,
        date,
        duration: body.duration === undefined || body.duration === null ? null : requiredNumber(body.duration, 'duration'),
        waterAmount: requiredNumber(body.waterAmount, 'waterAmount'),
        unit: typeof body.unit === 'string' && body.unit.trim() ? body.unit.trim() : schedule.unit,
        notes: body.notes ? String(body.notes).trim() : null,
        recordedById: req.user?.sub || null,
        recordedByName: req.user?.email || null,
      },
    });
    await prisma.irrigationSchedule.update({
      where: { id: schedule.id },
      data: { lastRun: date },
    });
    return result;
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('pest-disease')
export class PestDiseaseController {
  @Permission('crop.read')
  @Get()
  async list(
    @Req() req: any,
    @Query('farmId') farmId?: string,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const where: Record<string, any> = { organizationId: organizationId(req), deletedAt: null };
    if (farmId) where.farmId = farmId;
    if (type) where.type = type;
    if (severity) where.severity = severity;
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (status?.toLowerCase() === 'active') where.treatedDate = null;
    if (status?.toLowerCase() === 'treated') where.treatedDate = { not: null };
    const data = await prisma.pestDiseaseRecord.findMany({ where, orderBy: { identifiedDate: 'desc' } });
    return { data, total: data.length };
  }

  @Permission('crop.read')
  @Get('active')
  async active(@Req() req: any) {
    return prisma.pestDiseaseRecord.findMany({
      where: { organizationId: organizationId(req), deletedAt: null, treatedDate: null },
      orderBy: { identifiedDate: 'desc' },
    });
  }

  @Permission('crop.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() body: any) {
    const orgId = organizationId(req);
    const farmId = requiredString(body.farmId, 'farmId');
    await assertFarm(farmId, orgId);
    if (body.cropCycleId) {
      const cycle = await prisma.cropCycle.findFirst({ where: { id: body.cropCycleId, organizationId: orgId } });
      if (!cycle) throw new BadRequestException('Unknown crop cycle');
    }
    const identifiedDate = optionalDate(body.identifiedDate, 'identifiedDate');
    if (!identifiedDate) throw new BadRequestException('"identifiedDate" is required');
    return prisma.pestDiseaseRecord.create({
      data: {
        organizationId: orgId,
        farmId,
        cropCycleId: body.cropCycleId || null,
        type: requiredString(body.type, 'type').toUpperCase(),
        name: requiredString(body.name, 'name'),
        severity: typeof body.severity === 'string' ? body.severity.toUpperCase() : 'LOW',
        identifiedDate,
        treatment: body.treatment ? String(body.treatment).trim() : null,
        treatedDate: optionalDate(body.treatedDate, 'treatedDate') ?? null,
        outcome: body.outcome ? String(body.outcome).trim() : null,
        notes: body.notes ? String(body.notes).trim() : null,
        createdById: req.user?.sub || null,
        createdByName: req.user?.email || null,
      },
    });
  }

  @Permission('crop.write')
  @Put(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const orgId = organizationId(req);
    const existing = await prisma.pestDiseaseRecord.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Pest or disease record not found');
    if (body.farmId) await assertFarm(body.farmId, orgId);
    const data: Record<string, unknown> = {};
    for (const field of ['farmId', 'name', 'treatment', 'outcome', 'notes'] as const) {
      if (body[field] !== undefined) data[field] = body[field] === null ? null : String(body[field]).trim();
    }
    if (body.type !== undefined) data.type = requiredString(body.type, 'type').toUpperCase();
    if (body.severity !== undefined) data.severity = requiredString(body.severity, 'severity').toUpperCase();
    for (const field of ['identifiedDate', 'treatedDate'] as const) {
      if (body[field] !== undefined) data[field] = optionalDate(body[field], field);
    }
    if (body.cropCycleId !== undefined) {
      if (body.cropCycleId) {
        const cycle = await prisma.cropCycle.findFirst({ where: { id: body.cropCycleId, organizationId: orgId } });
        if (!cycle) throw new BadRequestException('Unknown crop cycle');
      }
      data.cropCycleId = body.cropCycleId || null;
    }
    return prisma.pestDiseaseRecord.update({ where: { id }, data });
  }

  @Permission('crop.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Req() req: any, @Param('id') id: string) {
    const result = await prisma.pestDiseaseRecord.updateMany({
      where: { id, organizationId: organizationId(req), deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (!result.count) throw new NotFoundException('Pest or disease record not found');
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('yield')
export class YieldController {
  @Permission('crop.read')
  @Get('crop/:cropId')
  async listByCrop(@Req() req: any, @Param('cropId') cropId: string, @Query('cropCycleId') cropCycleId?: string) {
    const where: Record<string, unknown> = { organizationId: organizationId(req), cropId, deletedAt: null };
    if (cropCycleId) where.cropCycleId = cropCycleId;
    const data = await prisma.yieldRecord.findMany({ where, orderBy: { harvestedDate: 'desc' } });
    return { data, total: data.length };
  }

  @Permission('crop.write')
  @Post('crop/:cropId')
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Param('cropId') cropId: string, @Body() body: any) {
    const crop = await prisma.crop.findUnique({ where: { id: cropId } });
    if (!crop) throw new NotFoundException('Crop not found');
    const orgId = organizationId(req);
    if (body.cropCycleId) {
      const cycle = await prisma.cropCycle.findFirst({
        where: { id: body.cropCycleId, cropId, organizationId: orgId },
      });
      if (!cycle) throw new BadRequestException('Unknown crop cycle');
    }
    const harvestedDate = optionalDate(body.harvestedDate, 'harvestedDate');
    if (!harvestedDate) throw new BadRequestException('"harvestedDate" is required');
    return prisma.yieldRecord.create({
      data: {
        organizationId: orgId,
        cropId,
        cropCycleId: body.cropCycleId || null,
        quantity: requiredNumber(body.quantity, 'quantity'),
        unit: typeof body.unit === 'string' && body.unit.trim() ? body.unit.trim() : 'kg',
        quality: body.quality ? String(body.quality).trim() : null,
        harvestedDate,
        notes: body.notes ? String(body.notes).trim() : null,
        createdById: req.user?.sub || null,
        createdByName: req.user?.email || null,
      },
    });
  }

  @Permission('crop.read')
  @Get('crop/:cropId/summary')
  async summary(@Req() req: any, @Param('cropId') cropId: string) {
    const data = await prisma.yieldRecord.findMany({
      where: { organizationId: organizationId(req), cropId, deletedAt: null },
      select: { quantity: true, unit: true },
    });
    const totals = new Map<string, number>();
    for (const row of data) totals.set(row.unit, (totals.get(row.unit) || 0) + row.quantity);
    return { cropId, totalRecords: data.length, totals: Array.from(totals, ([unit, quantity]) => ({ unit, quantity })) };
  }
}
