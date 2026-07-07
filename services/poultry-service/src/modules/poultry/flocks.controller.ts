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
import { PoultryService } from './poultry.service';
import { ZodValidationPipe } from '@farm/utils';
import { createFlockSchema, updateFlockSchema } from '@farm/validation';

@Controller('api/flocks')
export class FlocksController {
  constructor(private readonly poultryService: PoultryService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createFlockSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.poultryService.createFlock(data);
  }

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
    const filter: any = {};
    if (farmId) filter.farmId = farmId;
    if (penId) filter.penId = penId;
    if (breedId) filter.breedId = breedId;
    if (status) filter.status = status;
    if (search) filter.search = search;
    return this.poultryService.getAllFlocks(filter, sortBy || 'createdAt', sortOrder || 'desc', parseInt(page || '1'), parseInt(limit || '20'));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.poultryService.getFlockById(id);
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateFlockSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.poultryService.updateFlock(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.poultryService.deleteFlock(id);
  }
}
