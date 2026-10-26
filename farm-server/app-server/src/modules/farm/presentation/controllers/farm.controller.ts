import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, HttpCode, HttpStatus, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';
import { prisma } from '@farm/database';
import { FarmApplicationService } from '../../application/services/farm.service';

/** Farm columns the API accepts on write — keeps unknown fields (e.g. an
 *  unsupported `description`) from reaching Prisma. */
const FARM_WRITE_FIELDS = ['name', 'farmType', 'location', 'latitude', 'longitude', 'size', 'status'] as const;

function pickFarmWriteFields(body: any): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of FARM_WRITE_FIELDS) {
    if (body?.[key] !== undefined) data[key] = body[key];
  }
  return data;
}

// `crops` is deliberately absent: Crop has no organizationId, so a scoped
// export is impossible — the old entry only produced a 500.
const EXPORTABLE_ENTITIES: Record<string, string> = {
  farms: 'farm',
  workers: 'worker',
};

/** Columns clients may sort the farm list by — anything else used to crash Prisma. */
const FARM_SORT_COLUMNS = new Set(['name', 'farmType', 'size', 'status', 'createdAt', 'updatedAt']);

/** Clamp pagination params — `parseInt('?page=abc')` is NaN and 500'd in Prisma. */
function toPositiveInt(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('farms')
export class FarmController {
  constructor(private readonly farmService: FarmApplicationService) {}

  @Permission('farm.write')
  @Post()
  create(@Req() req: any, @Body() body: any) {
    // Scope comes from the caller's JWT only — honouring a body-supplied
    // organizationId would let any farm.write holder create farms in another
    // tenant.
    const organizationId = String(req.user?.organizationId || '');
    if (!organizationId) throw new ForbiddenException('No organization associated with caller');
    return this.farmService.createFarm({
      organizationId,
      ...pickFarmWriteFields(body),
    } as any);
  }

  @Permission('farm.read')
  @Get()
  async findAll(
    @Req() req: any,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('farmType') farmType?: string,
  ) {
    const result = await this.farmService.getAllFarms(String(req.user?.organizationId || ''), {
      sortBy: sortBy && FARM_SORT_COLUMNS.has(sortBy) ? sortBy : 'createdAt',
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
      page: toPositiveInt(page, 1, 100_000),
      limit: toPositiveInt(limit, 10, 100),
      search: typeof search === 'string' && search.trim() ? search.trim().slice(0, 200) : undefined,
      status: typeof status === 'string' && status ? status : undefined,
      farmType: typeof farmType === 'string' && farmType ? farmType : undefined,
    });
    // `farms` is the legacy key; `data` is what the web clients read.
    const farms = (result as any)?.farms ?? (Array.isArray(result) ? result : []);
    return { ...(result as any), data: farms };
  }

  @Permission('farm.read')
  @Get('map/all')
  async findAllForMap(@Req() req: any) {
    const organizationId = String(req.user?.organizationId || '');
    if (!organizationId) return { data: [] };
    const farms = await prisma.farm.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        farmType: true,
        location: true,
        latitude: true,
        longitude: true,
        size: true,
        status: true,
      },
    });
    return { data: farms };
  }

  @Permission('farm.write')
  @Put('map/:id/location')
  async updateLocation(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { latitude?: number; longitude?: number },
  ) {
    const organizationId = String(req.user?.organizationId || '');
    const farm = await prisma.farm.findFirst({ where: { id, organizationId } });
    if (!farm) throw new NotFoundException('Farm not found');
    const data: Record<string, number> = {};
    if (body?.latitude !== undefined) {
      const latitude = Number(body.latitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        throw new BadRequestException('latitude must be a number between -90 and 90');
      }
      data.latitude = latitude;
    }
    if (body?.longitude !== undefined) {
      const longitude = Number(body.longitude);
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        throw new BadRequestException('longitude must be a number between -180 and 180');
      }
      data.longitude = longitude;
    }
    return prisma.farm.update({ where: { id }, data });
  }

  @Permission('farm.read')
  @Get('export/:entity')
  async exportEntities(
    @Req() req: any,
    @Param('entity') entity: string,
    @Query('format') format?: string,
  ) {
    const model = EXPORTABLE_ENTITIES[entity];
    if (!model) {
      throw new NotFoundException(`Cannot export "${entity}"`);
    }
    const data = await (prisma as any)[model].findMany({
      where: { organizationId: String(req.user?.organizationId || '') },
      orderBy: { createdAt: 'desc' },
    });
    return { format: format || 'json', entity, data };
  }

  @Permission('farm.write')
  @Post('import/farms')
  @HttpCode(HttpStatus.CREATED)
  async importFarms(@Req() req: any, @Body() body: { data?: any[] }) {
    const rows = Array.isArray(body?.data) ? body.data : [];
    // Rows are validated up front (a 400 names the offending row) and created
    // in one transaction, so a bad row can no longer half-import the batch.
    const farms = await this.farmService.importFarms(rows, String(req.user?.organizationId || ''));
    return { imported: farms.length, data: farms };
  }

  @Permission('farm.read')
  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.farmService.getFarmById(id, String(req.user?.organizationId || ''));
  }

  @Permission('farm.write')
  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.farmService.updateFarm(id, String(req.user?.organizationId || ''), pickFarmWriteFields(body) as any);
  }

  @Permission('farm.delete')
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.farmService.deleteFarm(id, String(req.user?.organizationId || ''));
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('fields')
export class FieldController {
  constructor(private readonly farmService: FarmApplicationService) {}

  @Permission('farm.write')
  @Post()
  create(@Req() req: any, @Body() body: { farmId: string; name: string; size: number }) {
    return this.farmService.createField(body, String(req.user?.organizationId || ''));
  }

  @Permission('farm.read')
  @Get()
  // `farmId` is optional: with it the list is one farm's parcels, without it
  // every parcel of the caller's organization (the task-link picker's load).
  findAll(@Req() req: any, @Query('farmId') farmId?: string) {
    return this.farmService.getAllFields(farmId, String(req.user?.organizationId || ''));
  }

  @Permission('farm.read')
  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.farmService.getFieldById(id, String(req.user?.organizationId || ''));
  }

  @Permission('farm.write')
  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: Partial<{ name: string; size: number }>) {
    return this.farmService.updateField(id, String(req.user?.organizationId || ''), body);
  }

  @Permission('farm.delete')
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.farmService.deleteField(id, String(req.user?.organizationId || ''));
  }
}
