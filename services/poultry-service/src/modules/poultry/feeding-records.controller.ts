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
import { createFeedingRecordSchema, updateFeedingRecordSchema } from '@farm/validation';

@Controller('api/feeding-records')
export class FeedingRecordsController {
  constructor(private readonly poultryService: PoultryService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createFeedingRecordSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.poultryService.createFeedingRecord(data);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('flockId') flockId?: string,
    @Query('feedType') feedType?: string,
  ) {
    const filter: any = {};
    if (flockId) filter.flockId = flockId;
    if (feedType) filter.feedType = feedType;
    return this.poultryService.getAllFeedingRecords(filter, sortBy || 'date', sortOrder || 'desc', parseInt(page || '1'), parseInt(limit || '20'));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.poultryService.getFeedingRecordById(id);
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateFeedingRecordSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.poultryService.updateFeedingRecord(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.poultryService.deleteFeedingRecord(id);
  }
}
