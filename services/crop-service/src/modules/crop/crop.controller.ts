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
import { CropService } from './crop.service';
import { ZodValidationPipe } from '@farm/utils';
import { createCropSchema, updateCropSchema, createCropCycleSchema, updateCropCycleSchema } from '@farm/validation';

@Controller('crops')
export class CropController {
  constructor(private readonly cropService: CropService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createCropSchema))
  @HttpCode(HttpStatus.CREATED)
  async createCrop(@Body() data: any) {
    return this.cropService.createCrop(data);
  }

  @Get()
  async getAllCrops(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('name') name?: string,
  ) {
    const filter: any = {};
    if (name) filter.name = name;
    return this.cropService.getAllCrops(filter, sortBy || 'createdAt', sortOrder || 'desc', parseInt(page || '1'), parseInt(limit || '20'));
  }

  @Get(':id')
  async getCropById(@Param('id') id: string) {
    return this.cropService.getCropById(id);
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateCropSchema))
  async updateCrop(@Param('id') id: string, @Body() data: any) {
    return this.cropService.updateCrop(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCrop(@Param('id') id: string) {
    return this.cropService.deleteCrop(id);
  }

  @Post('cycles')
  @UsePipes(new ZodValidationPipe(createCropCycleSchema))
  @HttpCode(HttpStatus.CREATED)
  async createCropCycle(@Body() data: any) {
    return this.cropService.createCropCycle(data);
  }

  @Get('cycles')
  async getAllCropCycles(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('fieldId') fieldId?: string,
    @Query('cropId') cropId?: string,
    @Query('status') status?: string,
  ) {
    const filter: any = {};
    if (fieldId) filter.fieldId = fieldId;
    if (cropId) filter.cropId = cropId;
    if (status) filter.status = status;
    return this.cropService.getAllCropCycles(filter, sortBy || 'createdAt', sortOrder || 'desc', parseInt(page || '1'), parseInt(limit || '20'));
  }

  @Get('cycles/:id')
  async getCropCycleById(@Param('id') id: string) {
    return this.cropService.getCropCycleById(id);
  }

  @Put('cycles/:id')
  @UsePipes(new ZodValidationPipe(updateCropCycleSchema))
  async updateCropCycle(@Param('id') id: string, @Body() data: any) {
    return this.cropService.updateCropCycle(id, data);
  }

  @Delete('cycles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCropCycle(@Param('id') id: string) {
    return this.cropService.deleteCropCycle(id);
  }
}
