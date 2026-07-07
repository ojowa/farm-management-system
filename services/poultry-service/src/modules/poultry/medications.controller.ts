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
import { MedicationService } from './medication.service';
import { ZodValidationPipe } from '@farm/utils';
import { createMedicationSchema, updateMedicationSchema } from '@farm/validation';

@Controller('api/medications')
export class MedicationsController {
  constructor(private readonly medicationService: MedicationService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createMedicationSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.medicationService.create(data);
  }

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
    return this.medicationService.getAll({
      page: parseInt(page || '1'),
      limit: parseInt(limit || '20'),
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
      flockId,
      status,
      search,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.medicationService.getById(id);
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateMedicationSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.medicationService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.medicationService.delete(id);
  }
}
