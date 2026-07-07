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
import { createFieldSchema, updateFieldSchema } from '@farm/validation';

@Controller('fields')
export class FieldController {
  constructor(private readonly farmService: FarmService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createFieldSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.farmService.createField(data);
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

    return this.farmService.getAllFields(
      filter,
      sortBy || 'name',
      sortOrder || 'asc',
      parseInt(page || '1'),
      parseInt(limit || '10'),
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.farmService.getFieldById(id);
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateFieldSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.farmService.updateField(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.farmService.deleteField(id);
  }
}
