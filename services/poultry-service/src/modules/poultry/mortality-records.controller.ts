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
import { createMortalityRecordSchema, updateMortalityRecordSchema } from '@farm/validation';

@Controller('api/mortality-records')
export class MortalityRecordsController {
  constructor(private readonly poultryService: PoultryService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createMortalityRecordSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.poultryService.createMortalityRecord(data);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('flockId') flockId?: string,
  ) {
    const filter: any = {};
    if (flockId) filter.flockId = flockId;
    return this.poultryService.getAllMortalityRecords(filter, sortBy || 'date', sortOrder || 'desc', parseInt(page || '1'), parseInt(limit || '20'));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.poultryService.getMortalityRecordById(id);
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateMortalityRecordSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.poultryService.updateMortalityRecord(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.poultryService.deleteMortalityRecord(id);
  }
}
