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
import { LivestockApplicationService } from '../../application/services/livestock.service';
import { ZodValidationPipe } from '@farm/utils';
import { createLivestockSchema, updateLivestockSchema } from '@farm/validation-server';

function getOrgIdFromRequest(req: any): string {
  return String(req.user?.organizationId || '');
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('livestock')
export class LivestockController {
  constructor(private readonly livestockService: LivestockApplicationService) {}

  @Permission('livestock.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createLivestockSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.livestockService.createLivestock(data);
  }

  @Permission('livestock.read')
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('farmId') farmId?: string,
    @Query('species') species?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const filter: any = {};
    if (farmId) filter.farmId = farmId;
    if (species) filter.species = species;
    if (status) filter.status = status;
    if (search) filter.search = search;

    return this.livestockService.getAllLivestock(
      filter,
      sortBy || 'createdAt',
      sortOrder || 'desc',
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
  }

  @Permission('livestock.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.livestockService.getLivestockById(id);
  }

  @Permission('livestock.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateLivestockSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.livestockService.updateLivestock(id, data);
  }

  @Permission('livestock.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.livestockService.deleteLivestock(id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('health')
export class HealthController {
  constructor(private readonly livestockService: LivestockApplicationService) {}

  @Permission('livestock.read')
  @Get('livestock/:livestockId')
  async getHealthHistory(
    @Param('livestockId') livestockId: string,
    req?: any,
  ) {
    return this.livestockService.getHealthHistory(livestockId, getOrgIdFromRequest(req));
  }

  @Permission('livestock.write')
  @Post('livestock/:livestockId')
  @HttpCode(HttpStatus.CREATED)
  async addHealthRecord(
    @Param('livestockId') livestockId: string,
    @Body() body: any,
    req?: any,
  ) {
    return this.livestockService.addHealthRecord({
      ...body,
      livestockId,
      organizationId: getOrgIdFromRequest(req),
      createdById: req?.user?.sub || null,
      createdByName: req?.user?.email || null,
    });
  }

  @Permission('livestock.read')
  @Get('vaccinations/:livestockId')
  async getVaccinationSchedule(
    @Param('livestockId') livestockId: string,
    req?: any,
  ) {
    return this.livestockService.getVaccinationSchedule(livestockId, getOrgIdFromRequest(req));
  }

  @Permission('livestock.write')
  @Post('vaccinations/:livestockId')
  @HttpCode(HttpStatus.CREATED)
  async scheduleVaccination(
    @Param('livestockId') livestockId: string,
    @Body() body: any,
    req?: any,
  ) {
    return this.livestockService.scheduleVaccination({
      ...body,
      livestockId,
      organizationId: getOrgIdFromRequest(req),
      createdById: req?.user?.sub || null,
      createdByName: req?.user?.email || null,
    });
  }

  @Permission('livestock.write')
  @Put('vaccinations/:id/administer')
  async administerVaccination(@Param('id') id: string) {
    return this.livestockService.administerVaccination(id);
  }

  @Permission('livestock.read')
  @Get('overdue')
  async getOverdueVaccinations(req?: any) {
    return this.livestockService.getOverdueVaccinations(getOrgIdFromRequest(req));
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('breeding')
export class BreedingController {
  constructor(private readonly livestockService: LivestockApplicationService) {}

  @Permission('livestock.read')
  @Get()
  async findAll(@Query('status') status?: string, req?: any) {
    return this.livestockService.getBreedingRecords(getOrgIdFromRequest(req), status);
  }

  @Permission('livestock.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any, req?: any) {
    return this.livestockService.createBreedingRecord({
      ...body,
      organizationId: getOrgIdFromRequest(req),
      createdById: req?.user?.sub || null,
      createdByName: req?.user?.email || null,
    });
  }

  @Permission('livestock.write')
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.livestockService.updateBreedingRecord(id, body);
  }

  @Permission('livestock.read')
  @Get('upcoming')
  async findUpcoming(req?: any) {
    return this.livestockService.getUpcomingBreedingRecords(getOrgIdFromRequest(req));
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('weight')
export class WeightController {
  constructor(private readonly livestockService: LivestockApplicationService) {}

  @Permission('livestock.read')
  @Get('livestock/:livestockId')
  async getLivestockWeightHistory(
    @Param('livestockId') livestockId: string,
    req?: any,
  ) {
    return this.livestockService.getLivestockWeightHistory(livestockId, getOrgIdFromRequest(req));
  }

  @Permission('livestock.write')
  @Post('livestock/:livestockId')
  @HttpCode(HttpStatus.CREATED)
  async recordLivestockWeight(
    @Param('livestockId') livestockId: string,
    @Body() body: any,
    req?: any,
  ) {
    return this.livestockService.recordLivestockWeight({
      ...body,
      livestockId,
      organizationId: getOrgIdFromRequest(req),
      createdById: req?.user?.sub || null,
    });
  }

  @Permission('livestock.read')
  @Get('flock/:flockId')
  async getFlockWeightHistory(
    @Param('flockId') flockId: string,
    req?: any,
  ) {
    return this.livestockService.getFlockWeightHistory(flockId, getOrgIdFromRequest(req));
  }

  @Permission('livestock.write')
  @Post('flock/:flockId')
  @HttpCode(HttpStatus.CREATED)
  async recordFlockWeight(
    @Param('flockId') flockId: string,
    @Body() body: any,
    req?: any,
  ) {
    return this.livestockService.recordFlockWeight({
      ...body,
      flockId,
      organizationId: getOrgIdFromRequest(req),
      createdById: req?.user?.sub || null,
    });
  }
}
