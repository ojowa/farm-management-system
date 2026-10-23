import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UsePipes,
  HttpCode,
  HttpStatus,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';
import { PoultryApplicationService } from '../../application/services/poultry.service';
import { ZodValidationPipe } from '@farm/utils';
import {
  createPoultryHouseSchema,
  updatePoultryHouseSchema,
  createPenSchema,
  updatePenSchema,
  createBreedSchema,
  updateBreedSchema,
  createFlockSchema,
  updateFlockSchema,
  createFeedingRecordSchema,
  updateFeedingRecordSchema,
  createVaccinationRecordSchema,
  updateVaccinationRecordSchema,
  createMortalityRecordSchema,
  updateMortalityRecordSchema,
  createMedicationSchema,
  updateMedicationSchema,
  createEggProductionSchema,
  updateEggProductionSchema,
  createPoultrySaleSchema,
  updatePoultrySaleSchema,
} from '@farm/validation-server';

/**
 * The organization always comes from the verified JWT (req.user), never from
 * the request body or headers — every handler threads it into the service so
 * reads, writes, and deletes are scoped to the caller's organization.
 */
function getOrgId(req: any): string {
  return String(req.user?.organizationId || '');
}

/**
 * S2: `parseInt('?page=abc')` produced NaN which reached Prisma as
 * `skip: NaN` and 500'd the request. Clamp page/limit, and only accept the
 * two real sort directions.
 */
function toPositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toSortOrder(value: string | undefined, fallback: 'asc' | 'desc'): 'asc' | 'desc' {
  return value === 'asc' ? 'asc' : value === 'desc' ? 'desc' : fallback;
}

function validateDateRange(startDate?: string, endDate?: string): void {
  const start = startDate ? new Date(startDate) : undefined;
  const end = endDate ? new Date(endDate) : undefined;

  if (start && Number.isNaN(start.getTime())) {
    throw new BadRequestException('"startDate" must be a valid date');
  }
  if (end && Number.isNaN(end.getTime())) {
    throw new BadRequestException('"endDate" must be a valid date');
  }
  if (start && end && end < start) {
    throw new BadRequestException('"endDate" cannot precede "startDate"');
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('poultry-houses')
export class PoultryHousesController {
  constructor(private readonly poultryService: PoultryApplicationService) {}

  @Permission('poultry.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createPoultryHouseSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() data: any) {
    return this.poultryService.createPoultryHouse(getOrgId(req), data);
  }

  @Permission('poultry.read')
  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('farmId') farmId?: string,
    @Query('name') name?: string,
  ) {
    const filter: Record<string, unknown> = {};
    if (farmId) filter.farmId = farmId;
    if (name) filter.name = name;
    return this.poultryService.getAllPoultryHouses(getOrgId(req), filter, {
      page: toPositiveInt(page, 1),
      limit: Math.min(toPositiveInt(limit, 20), 500),
      sortBy: sortBy || 'createdAt',
      sortOrder: toSortOrder(sortOrder, 'desc'),
    });
  }

  @Permission('poultry.read')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.poultryService.getPoultryHouseById(getOrgId(req), id);
  }

  @Permission('poultry.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updatePoultryHouseSchema))
  async update(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    return this.poultryService.updatePoultryHouse(getOrgId(req), id, data);
  }

  @Permission('poultry.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.poultryService.deletePoultryHouse(getOrgId(req), id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('pens')
export class PensController {
  constructor(private readonly poultryService: PoultryApplicationService) {}

  @Permission('poultry.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createPenSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() data: any) {
    return this.poultryService.createPen(getOrgId(req), data);
  }

  @Permission('poultry.read')
  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('poultryHouseId') poultryHouseId?: string,
    @Query('name') name?: string,
  ) {
    const filter: Record<string, unknown> = {};
    if (poultryHouseId) filter.poultryHouseId = poultryHouseId;
    if (name) filter.name = name;
    return this.poultryService.getAllPens(getOrgId(req), filter, {
      page: toPositiveInt(page, 1),
      limit: Math.min(toPositiveInt(limit, 20), 500),
      sortBy: sortBy || 'createdAt',
      sortOrder: toSortOrder(sortOrder, 'desc'),
    });
  }

  @Permission('poultry.read')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.poultryService.getPenById(getOrgId(req), id);
  }

  @Permission('poultry.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updatePenSchema))
  async update(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    return this.poultryService.updatePen(getOrgId(req), id, data);
  }

  @Permission('poultry.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.poultryService.deletePen(getOrgId(req), id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('breeds')
export class BreedsController {
  constructor(private readonly poultryService: PoultryApplicationService) {}

  /**
   * P5: Breed is a SHARED global catalog (no organizationId column), but any
   * tenant could previously rename or delete entries — a cross-tenant write.
   * Org-scoped callers may still ADD breeds (POST) but rename/delete is
   * platform-only, mirroring the crop catalog rule.
   */
  private assertPlatformCatalogMutation(req: any): void {
    if (getOrgId(req)) {
      throw new ForbiddenException(
        'The breed catalog is shared across all farms. Only platform administrators can rename or remove entries.',
      );
    }
  }

  @Permission('poultry.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createBreedSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.poultryService.createBreed(data);
  }

  @Permission('poultry.read')
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('name') name?: string,
    @Query('birdType') birdType?: string,
  ) {
    const filter: Record<string, unknown> = {};
    if (name) filter.name = name;
    if (birdType) filter.birdType = birdType;
    return this.poultryService.getAllBreeds(filter, {
      page: toPositiveInt(page, 1),
      limit: Math.min(toPositiveInt(limit, 20), 500),
      sortBy: sortBy || 'name',
      sortOrder: toSortOrder(sortOrder, 'asc'),
    });
  }

  @Permission('poultry.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.poultryService.getBreedById(id);
  }

  @Permission('poultry.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateBreedSchema))
  async update(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    this.assertPlatformCatalogMutation(req);
    return this.poultryService.updateBreed(id, data);
  }

  @Permission('poultry.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: any) {
    this.assertPlatformCatalogMutation(req);
    await this.poultryService.deleteBreed(id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('flocks')
export class FlocksController {
  constructor(private readonly poultryService: PoultryApplicationService) {}

  @Permission('poultry.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createFlockSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() data: any) {
    return this.poultryService.createFlock(getOrgId(req), data);
  }

  @Permission('poultry.read')
  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('farmId') farmId?: string,
    @Query('houseId') houseId?: string,
    @Query('penId') penId?: string,
    @Query('breedId') breedId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const filter: Record<string, unknown> = {};
    if (farmId) filter.farmId = farmId;
    if (houseId) filter.poultryHouseId = houseId;
    if (penId) filter.penId = penId;
    if (breedId) filter.breedId = breedId;
    if (status) filter.status = status;
    if (search) filter.search = search;
    return this.poultryService.getAllFlocks(getOrgId(req), filter, {
      page: toPositiveInt(page, 1),
      limit: Math.min(toPositiveInt(limit, 20), 500),
      sortBy: sortBy || 'createdAt',
      sortOrder: toSortOrder(sortOrder, 'desc'),
    });
  }

  @Permission('poultry.read')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.poultryService.getFlockById(getOrgId(req), id);
  }

  @Permission('poultry.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateFlockSchema))
  async update(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    return this.poultryService.updateFlock(getOrgId(req), id, data);
  }

  @Permission('poultry.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.poultryService.deleteFlock(getOrgId(req), id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('feeding-records')
export class FeedingRecordsController {
  constructor(private readonly poultryService: PoultryApplicationService) {}

  @Permission('poultry.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createFeedingRecordSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() data: any) {
    return this.poultryService.createFeedingRecord(getOrgId(req), data);
  }

  @Permission('poultry.read')
  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('flockId') flockId?: string,
    @Query('houseId') houseId?: string,
    @Query('feedType') feedType?: string,
  ) {
    const filter: Record<string, unknown> = {};
    if (flockId) filter.flockId = flockId;
    if (houseId) filter.poultryHouseId = houseId;
    if (feedType) filter.feedType = feedType;
    return this.poultryService.getAllFeedingRecords(getOrgId(req), filter, {
      page: toPositiveInt(page, 1),
      limit: Math.min(toPositiveInt(limit, 20), 500),
      sortBy: sortBy || 'date',
      sortOrder: toSortOrder(sortOrder, 'desc'),
    });
  }

  @Permission('poultry.read')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.poultryService.getFeedingRecordById(getOrgId(req), id);
  }

  @Permission('poultry.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateFeedingRecordSchema))
  async update(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    return this.poultryService.updateFeedingRecord(getOrgId(req), id, data);
  }

  @Permission('poultry.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.poultryService.deleteFeedingRecord(getOrgId(req), id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('vaccination-records')
export class VaccinationRecordsController {
  constructor(private readonly poultryService: PoultryApplicationService) {}

  @Permission('poultry.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createVaccinationRecordSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() data: any) {
    return this.poultryService.createVaccinationRecord(getOrgId(req), data);
  }

  @Permission('poultry.read')
  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('flockId') flockId?: string,
    @Query('vaccine') vaccine?: string,
  ) {
    const filter: Record<string, unknown> = {};
    if (flockId) filter.flockId = flockId;
    if (vaccine) filter.vaccine = vaccine;
    return this.poultryService.getAllVaccinationRecords(getOrgId(req), filter, {
      page: toPositiveInt(page, 1),
      limit: Math.min(toPositiveInt(limit, 20), 500),
      sortBy: sortBy || 'date',
      sortOrder: toSortOrder(sortOrder, 'desc'),
    });
  }

  @Permission('poultry.read')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.poultryService.getVaccinationRecordById(getOrgId(req), id);
  }

  @Permission('poultry.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateVaccinationRecordSchema))
  async update(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    return this.poultryService.updateVaccinationRecord(getOrgId(req), id, data);
  }

  @Permission('poultry.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.poultryService.deleteVaccinationRecord(getOrgId(req), id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('mortality-records')
export class MortalityRecordsController {
  constructor(private readonly poultryService: PoultryApplicationService) {}

  @Permission('poultry.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createMortalityRecordSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() data: any) {
    return this.poultryService.createMortalityRecord(getOrgId(req), data);
  }

  @Permission('poultry.read')
  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('flockId') flockId?: string,
  ) {
    const filter: Record<string, unknown> = {};
    if (flockId) filter.flockId = flockId;
    return this.poultryService.getAllMortalityRecords(getOrgId(req), filter, {
      page: toPositiveInt(page, 1),
      limit: Math.min(toPositiveInt(limit, 20), 500),
      sortBy: sortBy || 'date',
      sortOrder: toSortOrder(sortOrder, 'desc'),
    });
  }

  @Permission('poultry.read')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.poultryService.getMortalityRecordById(getOrgId(req), id);
  }

  @Permission('poultry.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateMortalityRecordSchema))
  async update(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    return this.poultryService.updateMortalityRecord(getOrgId(req), id, data);
  }

  @Permission('poultry.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.poultryService.deleteMortalityRecord(getOrgId(req), id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('medications')
export class MedicationsController {
  constructor(private readonly poultryService: PoultryApplicationService) {}

  @Permission('poultry.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createMedicationSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() data: any) {
    return this.poultryService.createMedication(getOrgId(req), data);
  }

  @Permission('poultry.read')
  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('flockId') flockId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const filter: Record<string, unknown> = {};
    if (flockId) filter.flockId = flockId;
    if (status) filter.status = status;
    if (search) filter.search = search;
    return this.poultryService.getAllMedications(getOrgId(req), filter, {
      page: toPositiveInt(page, 1),
      limit: Math.min(toPositiveInt(limit, 20), 500),
      sortBy: sortBy || 'createdAt',
      sortOrder: toSortOrder(sortOrder, 'desc'),
    });
  }

  @Permission('poultry.read')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.poultryService.getMedicationById(getOrgId(req), id);
  }

  @Permission('poultry.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateMedicationSchema))
  async update(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    return this.poultryService.updateMedication(getOrgId(req), id, data);
  }

  @Permission('poultry.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.poultryService.deleteMedication(getOrgId(req), id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('egg-production')
export class EggProductionController {
  constructor(private readonly poultryService: PoultryApplicationService) {}

  @Permission('poultry.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createEggProductionSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() data: any) {
    return this.poultryService.createEggProduction(getOrgId(req), {
      ...data,
      createdById: req.user?.sub || null,
      createdByName: req.user?.email || null,
    });
  }

  @Permission('poultry.read')
  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('flockId') flockId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    validateDateRange(startDate, endDate);
    const filter: Record<string, unknown> = {};
    if (flockId) filter.flockId = flockId;
    if (startDate) filter.startDate = startDate;
    if (endDate) filter.endDate = endDate;
    return this.poultryService.getAllEggProductions(getOrgId(req), filter, {
      page: toPositiveInt(page, 1),
      limit: Math.min(toPositiveInt(limit, 20), 500),
      sortBy: sortBy || 'date',
      sortOrder: toSortOrder(sortOrder, 'desc'),
    });
  }

  @Permission('poultry.read')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.poultryService.getEggProductionById(getOrgId(req), id);
  }

  @Permission('poultry.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateEggProductionSchema))
  async update(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    return this.poultryService.updateEggProduction(getOrgId(req), id, data);
  }

  @Permission('poultry.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.poultryService.deleteEggProduction(getOrgId(req), id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('poultry-sales')
export class PoultrySalesController {
  constructor(private readonly poultryService: PoultryApplicationService) {}

  @Permission('poultry.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createPoultrySaleSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() data: any) {
    return this.poultryService.createPoultrySale(getOrgId(req), data);
  }

  @Permission('poultry.read')
  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('farmId') farmId?: string,
    @Query('flockId') flockId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    validateDateRange(startDate, endDate);
    const filter: Record<string, unknown> = {};
    if (farmId) filter.farmId = farmId;
    if (flockId) filter.flockId = flockId;
    if (startDate) filter.startDate = startDate;
    if (endDate) filter.endDate = endDate;
    return this.poultryService.getAllPoultrySales(getOrgId(req), filter, {
      page: toPositiveInt(page, 1),
      limit: Math.min(toPositiveInt(limit, 20), 500),
      sortBy: sortBy || 'date',
      sortOrder: toSortOrder(sortOrder, 'desc'),
    });
  }

  @Permission('poultry.read')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.poultryService.getPoultrySaleById(getOrgId(req), id);
  }

  @Permission('poultry.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updatePoultrySaleSchema))
  async update(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    return this.poultryService.updatePoultrySale(getOrgId(req), id, data);
  }

  @Permission('poultry.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: any) {
    await this.poultryService.deletePoultrySale(getOrgId(req), id);
  }
}
