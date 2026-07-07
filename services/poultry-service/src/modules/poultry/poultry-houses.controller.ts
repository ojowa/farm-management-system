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
import { createPoultryHouseSchema, updatePoultryHouseSchema } from '@farm/validation';

@Controller('api/poultry-houses')
export class PoultryHousesController {
  constructor(private readonly poultryService: PoultryService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createPoultryHouseSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.poultryService.createPoultryHouse(data);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('farmId') farmId?: string,
    @Query('name') name?: string,
  ) {
    const filter: any = {};
    if (farmId) filter.farmId = farmId;
    if (name) filter.name = name;
    return this.poultryService.getAllPoultryHouses(filter, sortBy || 'createdAt', sortOrder || 'desc', parseInt(page || '1'), parseInt(limit || '20'));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.poultryService.getPoultryHouseById(id);
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(updatePoultryHouseSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.poultryService.updatePoultryHouse(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.poultryService.deletePoultryHouse(id);
  }
}
