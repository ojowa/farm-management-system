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
import { createVaccinationRecordSchema, updateVaccinationRecordSchema } from '@farm/validation';

@Controller('api/vaccination-records')
export class VaccinationRecordsController {
  constructor(private readonly poultryService: PoultryService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createVaccinationRecordSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.poultryService.createVaccinationRecord(data);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('flockId') flockId?: string,
    @Query('vaccine') vaccine?: string,
  ) {
    const filter: any = {};
    if (flockId) filter.flockId = flockId;
    if (vaccine) filter.vaccine = vaccine;
    return this.poultryService.getAllVaccinationRecords(filter, sortBy || 'date', sortOrder || 'desc', parseInt(page || '1'), parseInt(limit || '20'));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.poultryService.getVaccinationRecordById(id);
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateVaccinationRecordSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.poultryService.updateVaccinationRecord(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.poultryService.deleteVaccinationRecord(id);
  }
}
