import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, HttpCode, HttpStatus } from '@nestjs/common';
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

const EXPORTABLE_ENTITIES: Record<string, string> = {
  farms: 'farm',
  crops: 'crop',
  workers: 'worker',
};

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('farms')
export class FarmController {
  constructor(private readonly farmService: FarmApplicationService) {}

  @Permission('farm.write')
  @Post()
  create(@Req() req: any, @Body() body: any) {
    const organizationId = body?.organizationId || String(req.user?.organizationId || '');
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
  ) {
    const result = await this.farmService.getAllFarms({
      organizationId: String(req.user?.organizationId || ''),
      sortBy,
      sortOrder,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
    // `farms` is the legacy key; `data` is what the web clients read.
    const farms = (result as any)?.farms ?? (Array.isArray(result) ? result : []);
    return { ...(result as any), data: farms };
  }

  @Permission('farm.read')
  @Get('map/all')
  async findAllForMap(@Req() req: any) {
    const farms = await prisma.farm.findMany({
      where: { organizationId: String(req.user?.organizationId || '') },
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
    @Param('id') id: string,
    @Body() body: { latitude?: number; longitude?: number },
  ) {
    return prisma.farm.update({
      where: { id },
      data: {
        ...(body?.latitude !== undefined ? { latitude: Number(body.latitude) } : {}),
        ...(body?.longitude !== undefined ? { longitude: Number(body.longitude) } : {}),
      },
    });
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
      return { format: format || 'json', data: [] };
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
    const organizationId = String(req.user?.organizationId || '');
    const results = await Promise.all(
      rows.map((row) =>
        this.farmService.createFarm({
          organizationId,
          ...pickFarmWriteFields(row),
        } as any),
      ),
    );
    return { imported: results.length, data: results };
  }

  @Permission('farm.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.farmService.getFarmById(id);
  }

  @Permission('farm.write')
  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.farmService.updateFarm(id, pickFarmWriteFields(body) as any);
  }

  @Permission('farm.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.farmService.deleteFarm(id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('fields')
export class FieldController {
  constructor(private readonly farmService: FarmApplicationService) {}

  @Permission('farm.write')
  @Post()
  create(@Body() body: { farmId: string; name: string; size: number }) {
    return this.farmService.createField(body);
  }

  @Permission('farm.read')
  @Get()
  findAll(@Query('farmId') farmId: string) {
    return this.farmService.getAllFields(farmId);
  }

  @Permission('farm.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.farmService.getFieldById(id);
  }

  @Permission('farm.write')
  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<{ name: string; size: number }>) {
    return this.farmService.updateField(id, body);
  }

  @Permission('farm.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.farmService.deleteField(id);
  }
}
