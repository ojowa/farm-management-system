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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';
import { CropApplicationService } from '../../application/services/crop.service';
import { ZodValidationPipe } from '@farm/utils';
import { createCropSchema, updateCropSchema, createCropCycleSchema, updateCropCycleSchema } from '@farm/validation-server';

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('crops')
export class CropController {
  constructor(private readonly cropService: CropApplicationService) {}

  @Permission('crop.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createCropSchema))
  @HttpCode(HttpStatus.CREATED)
  async createCrop(@Body() data: { name: string }) {
    return this.cropService.createCrop(data);
  }

  @Permission('crop.read')
  @Get()
  async getAllCrops(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('name') name?: string,
  ) {
    const filter: { name?: string } = {};
    if (name) filter.name = name;

    return this.cropService.getAllCrops({
      sortBy,
      sortOrder,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      filter,
    });
  }

  @Permission('crop.read')
  @Get(':id')
  async getCropById(@Param('id') id: string) {
    return this.cropService.getCropById(id);
  }

  @Permission('crop.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateCropSchema))
  async updateCrop(@Param('id') id: string, @Body() data: { name: string }) {
    return this.cropService.updateCrop(id, data);
  }

  @Permission('crop.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCrop(@Param('id') id: string) {
    return this.cropService.deleteCrop(id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('crop-cycles')
export class CropCycleController {
  constructor(private readonly cropService: CropApplicationService) {}

  @Permission('crop.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createCropCycleSchema))
  @HttpCode(HttpStatus.CREATED)
  async createCropCycle(@Body() data: {
    fieldId: string;
    cropId: string;
    plantingDate: Date | string;
    harvestDate?: Date | string | null;
    status?: string;
  }) {
    return this.cropService.createCropCycle(data);
  }

  @Permission('crop.read')
  @Get()
  async getAllCropCycles(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('fieldId') fieldId?: string,
    @Query('cropId') cropId?: string,
    @Query('status') status?: string,
  ) {
    const filter: { fieldId?: string; cropId?: string; status?: string } = {};
    if (fieldId) filter.fieldId = fieldId;
    if (cropId) filter.cropId = cropId;
    if (status) filter.status = status;

    return this.cropService.getAllCropCycles({
      sortBy,
      sortOrder,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      filter,
    });
  }

  @Permission('crop.read')
  @Get(':id')
  async getCropCycleById(@Param('id') id: string) {
    return this.cropService.getCropCycleById(id);
  }

  @Permission('crop.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateCropCycleSchema))
  async updateCropCycle(@Param('id') id: string, @Body() data: Partial<{
    fieldId: string;
    cropId: string;
    plantingDate: Date | string;
    harvestDate: Date | string | null;
    status: string;
  }>) {
    return this.cropService.updateCropCycle(id, data);
  }

  @Permission('crop.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCropCycle(@Param('id') id: string) {
    return this.cropService.deleteCropCycle(id);
  }
}
