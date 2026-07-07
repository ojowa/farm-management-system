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
import { createPenSchema, updatePenSchema } from '@farm/validation';

@Controller('api/pens')
export class PensController {
  constructor(private readonly poultryService: PoultryService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createPenSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.poultryService.createPen(data);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('poultryHouseId') poultryHouseId?: string,
    @Query('name') name?: string,
  ) {
    const filter: any = {};
    if (poultryHouseId) filter.poultryHouseId = poultryHouseId;
    if (name) filter.name = name;
    return this.poultryService.getAllPens(filter, sortBy || 'createdAt', sortOrder || 'desc', parseInt(page || '1'), parseInt(limit || '20'));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.poultryService.getPenById(id);
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(updatePenSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.poultryService.updatePen(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.poultryService.deletePen(id);
  }
}
