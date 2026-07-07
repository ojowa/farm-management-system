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
} from '@nestjs/common';
import { FarmService } from './farm.service';
import { ZodValidationPipe } from '@farm/utils';
import { createFarmSchema, updateFarmSchema } from '@farm/validation';

@Controller('farms')
export class FarmController {
  constructor(private readonly farmService: FarmService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createFarmSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.farmService.createFarm(data);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('organizationId') organizationId?: string,
    @Query('farmType') farmType?: string,
    @Query('name') name?: string,
    @Query('location') location?: string,
  ) {
    const filter: any = {};
    if (organizationId) filter.organizationId = organizationId;
    if (farmType) filter.farmType = farmType;
    if (name) filter.name = name;
    if (location) filter.location = location;

    return this.farmService.getAllFarms(
      filter,
      sortBy || 'createdAt',
      sortOrder || 'desc',
      parseInt(page || '1'),
      parseInt(limit || '10'),
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.farmService.getFarmById(id);
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateFarmSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.farmService.updateFarm(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.farmService.deleteFarm(id);
  }
}
