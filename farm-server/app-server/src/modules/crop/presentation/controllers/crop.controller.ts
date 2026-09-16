import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UsePipes,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';
import { CropApplicationService } from '../../application/services/crop.service';
import { ZodValidationPipe } from '@farm/utils';
import { createCropSchema, updateCropSchema, createCropCycleSchema, updateCropCycleSchema } from '@farm/validation-server';

function getOrgId(req: any): string {
  return String(req.user?.organizationId || '');
}

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

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('crops/lifecycle')
export class CropLifecycleController {
  constructor(private readonly cropService: CropApplicationService) {}

  @Permission('crop.read')
  @Get('calendar')
  async getCalendar(
    @Req() req: any,
    @Query('farmId') farmId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filter: Record<string, unknown> = {};
    if (farmId) filter.farmId = farmId;
    if (startDate) filter.startDate = startDate;
    if (endDate) filter.endDate = endDate;
    return this.cropService.getAllCropCycles({ filter: filter as any });
  }

  @Permission('crop.read')
  @Get('crop-cycle/:cropCycleId/stages')
  async getStagesByCycle(@Param('cropCycleId') cropCycleId: string) {
    const { prisma } = await import('@farm/database');
    return prisma.cropStage.findMany({
      where: { cropCycleId },
      orderBy: { startDate: 'asc' },
    });
  }

  @Permission('crop.write')
  @Post('crop-cycle/:cropCycleId/stages')
  @HttpCode(HttpStatus.CREATED)
  async createStage(
    @Param('cropCycleId') cropCycleId: string,
    @Req() req: any,
    @Body() body: { stage: string; startDate: Date | string; endDate?: Date | string | null; notes?: string },
  ) {
    const { prisma } = await import('@farm/database');
    return prisma.cropStage.create({
      data: {
        cropCycleId,
        organizationId: getOrgId(req),
        stage: body.stage,
        startDate: typeof body.startDate === 'string' ? new Date(body.startDate) : body.startDate,
        endDate: body.endDate ? (typeof body.endDate === 'string' ? new Date(body.endDate) : body.endDate) : null,
        notes: body.notes || null,
        createdById: req.user?.sub || null,
        createdByName: req.user?.email || null,
      },
    });
  }

  @Permission('crop.write')
  @Put('stages/:id')
  async updateStage(
    @Param('id') id: string,
    @Body() body: { stage?: string; startDate?: Date | string; endDate?: Date | string | null; notes?: string },
  ) {
    const { prisma } = await import('@farm/database');
    const data: Record<string, unknown> = {};
    if (body.stage) data.stage = body.stage;
    if (body.startDate) data.startDate = typeof body.startDate === 'string' ? new Date(body.startDate) : body.startDate;
    if (body.endDate !== undefined) data.endDate = body.endDate ? (typeof body.endDate === 'string' ? new Date(body.endDate) : body.endDate) : null;
    if (body.notes !== undefined) data.notes = body.notes;
    return prisma.cropStage.update({ where: { id }, data });
  }

  @Permission('crop.delete')
  @Delete('stages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStage(@Param('id') id: string) {
    const { prisma } = await import('@farm/database');
    await prisma.cropStage.delete({ where: { id } });
    return { deleted: true };
  }
}
