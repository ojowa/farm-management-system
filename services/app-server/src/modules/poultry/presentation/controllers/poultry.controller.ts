import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UsePipes,
  HttpCode,
  HttpStatus,
  UseGuards,
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
} from '@farm/validation-server';

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('api/poultry-houses')
export class PoultryHousesController {
  constructor(private readonly poultryService: PoultryApplicationService) {}

  @Permission('poultry.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createPoultryHouseSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.poultryService.createPoultryHouse(data);
  }

  @Permission('poultry.read')
  @Get()
  async findAll(
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
    return this.poultryService.getAllPoultryHouses(filter, {
      page: parseInt(page || '1'),
      limit: parseInt(limit || '20'),
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    });
  }

  @Permission('poultry.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.poultryService.getPoultryHouseById(id);
  }

  @Permission('poultry.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updatePoultryHouseSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.poultryService.updatePoultryHouse(id, data);
  }

  @Permission('poultry.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.poultryService.deletePoultryHouse(id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('api/pens')
export class PensController {
  constructor(private readonly poultryService: PoultryApplicationService) {}

  @Permission('poultry.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createPenSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.poultryService.createPen(data);
  }

  @Permission('poultry.read')
  @Get()
  async findAll(
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
    return this.poultryService.getAllPens(filter, {
      page: parseInt(page || '1'),
      limit: parseInt(limit || '20'),
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    });
  }

  @Permission('poultry.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.poultryService.getPenById(id);
  }

  @Permission('poultry.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updatePenSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.poultryService.updatePen(id, data);
  }

  @Permission('poultry.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.poultryService.deletePen(id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('api/breeds')
export class BreedsController {
  constructor(private readonly poultryService: PoultryApplicationService) {}

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
      page: parseInt(page || '1'),
      limit: parseInt(limit || '20'),
      sortBy: sortBy || 'name',
      sortOrder: sortOrder || 'asc',
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
  async update(@Param('id') id: string, @Body() data: any) {
    return this.poultryService.updateBreed(id, data);
  }

  @Permission('poultry.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.poultryService.deleteBreed(id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('api/flocks')
export class FlocksController {
  constructor(private readonly poultryService: PoultryApplicationService) {}

  @Permission('poultry.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createFlockSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.poultryService.createFlock(data);
  }

  @Permission('poultry.read')
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('farmId') farmId?: string,
    @Query('penId') penId?: string,
    @Query('breedId') breedId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const filter: Record<string, unknown> = {};
    if (farmId) filter.farmId = farmId;
    if (penId) filter.penId = penId;
    if (breedId) filter.breedId = breedId;
    if (status) filter.status = status;
    if (search) filter.search = search;
    return this.poultryService.getAllFlocks(filter, {
      page: parseInt(page || '1'),
      limit: parseInt(limit || '20'),
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    });
  }

  @Permission('poultry.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.poultryService.getFlockById(id);
  }

  @Permission('poultry.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateFlockSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.poultryService.updateFlock(id, data);
  }

  @Permission('poultry.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.poultryService.deleteFlock(id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('api/feeding-records')
export class FeedingRecordsController {
  constructor(private readonly poultryService: PoultryApplicationService) {}

  @Permission('poultry.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createFeedingRecordSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.poultryService.createFeedingRecord(data);
  }

  @Permission('poultry.read')
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('flockId') flockId?: string,
    @Query('feedType') feedType?: string,
  ) {
    const filter: Record<string, unknown> = {};
    if (flockId) filter.flockId = flockId;
    if (feedType) filter.feedType = feedType;
    return this.poultryService.getAllFeedingRecords(filter, {
      page: parseInt(page || '1'),
      limit: parseInt(limit || '20'),
      sortBy: sortBy || 'date',
      sortOrder: sortOrder || 'desc',
    });
  }

  @Permission('poultry.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.poultryService.getFeedingRecordById(id);
  }

  @Permission('poultry.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateFeedingRecordSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.poultryService.updateFeedingRecord(id, data);
  }

  @Permission('poultry.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.poultryService.deleteFeedingRecord(id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('api/vaccination-records')
export class VaccinationRecordsController {
  constructor(private readonly poultryService: PoultryApplicationService) {}

  @Permission('poultry.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createVaccinationRecordSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.poultryService.createVaccinationRecord(data);
  }

  @Permission('poultry.read')
  @Get()
  async findAll(
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
    return this.poultryService.getAllVaccinationRecords(filter, {
      page: parseInt(page || '1'),
      limit: parseInt(limit || '20'),
      sortBy: sortBy || 'date',
      sortOrder: sortOrder || 'desc',
    });
  }

  @Permission('poultry.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.poultryService.getVaccinationRecordById(id);
  }

  @Permission('poultry.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateVaccinationRecordSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.poultryService.updateVaccinationRecord(id, data);
  }

  @Permission('poultry.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.poultryService.deleteVaccinationRecord(id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('api/mortality-records')
export class MortalityRecordsController {
  constructor(private readonly poultryService: PoultryApplicationService) {}

  @Permission('poultry.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createMortalityRecordSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.poultryService.createMortalityRecord(data);
  }

  @Permission('poultry.read')
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('flockId') flockId?: string,
  ) {
    const filter: Record<string, unknown> = {};
    if (flockId) filter.flockId = flockId;
    return this.poultryService.getAllMortalityRecords(filter, {
      page: parseInt(page || '1'),
      limit: parseInt(limit || '20'),
      sortBy: sortBy || 'date',
      sortOrder: sortOrder || 'desc',
    });
  }

  @Permission('poultry.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.poultryService.getMortalityRecordById(id);
  }

  @Permission('poultry.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateMortalityRecordSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.poultryService.updateMortalityRecord(id, data);
  }

  @Permission('poultry.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.poultryService.deleteMortalityRecord(id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('api/medications')
export class MedicationsController {
  constructor(private readonly poultryService: PoultryApplicationService) {}

  @Permission('poultry.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createMedicationSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.poultryService.createMedication(data);
  }

  @Permission('poultry.read')
  @Get()
  async findAll(
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
    return this.poultryService.getAllMedications(filter, {
      page: parseInt(page || '1'),
      limit: parseInt(limit || '20'),
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    });
  }

  @Permission('poultry.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.poultryService.getMedicationById(id);
  }

  @Permission('poultry.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateMedicationSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.poultryService.updateMedication(id, data);
  }

  @Permission('poultry.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.poultryService.deleteMedication(id);
  }
}
