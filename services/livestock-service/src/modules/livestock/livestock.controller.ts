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
import { LivestockService } from './livestock.service';
import { ZodValidationPipe } from '@farm/utils';
import { createLivestockSchema, updateLivestockSchema } from '@farm/validation';

@Controller('livestock')
export class LivestockController {
  constructor(private readonly livestockService: LivestockService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createLivestockSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.livestockService.createLivestock(data);
  }

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

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.livestockService.getLivestockById(id);
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateLivestockSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.livestockService.updateLivestock(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.livestockService.deleteLivestock(id);
  }
}
