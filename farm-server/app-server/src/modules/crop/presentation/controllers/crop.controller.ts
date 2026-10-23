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
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';
import { CropApplicationService } from '../../application/services/crop.service';
import { ZodValidationPipe } from '@farm/utils';
import {
  createCropSchema,
  updateCropSchema,
  createCropCycleSchema,
  updateCropCycleSchema,
  createCropStageSchema,
  updateCropStageSchema,
} from '@farm/validation-server';

function getOrgId(req: any): string {
  return String(req.user?.organizationId || '');
}

/**
 * S2: page/limit arrive as strings — `parseInt('abc')` produced NaN which
 * reached Prisma as `skip: NaN` and 500'd the request. Clamp everything.
 */
function toPositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseDateParam(value: string | undefined, field: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`"${field}" must be a valid date`);
  }
  return date;
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

    const result = await this.cropService.getAllCrops({
      sortBy,
      sortOrder,
      page: toPositiveInt(page, 1),
      limit: Math.min(toPositiveInt(limit, 50), 500),
      filter,
    });
    // `crops` is the legacy key; `data` is what the web clients read.
    const crops = (result as any)?.crops ?? (Array.isArray(result) ? result : []);
    return { ...(result as any), data: crops };
  }

  @Permission('crop.read')
  @Get(':id')
  async getCropById(@Param('id') id: string) {
    return this.cropService.getCropById(id);
  }

  /**
   * C1: Crop is a SHARED global name catalog (no organizationId column), but
   * every tenant could previously rename or delete entries — a cross-tenant
   * write. Org-scoped callers may still ADD names (POST) but rename/delete is
   * platform-only. The clients treat the catalog as read-only for org users.
   */
  private assertPlatformCatalogMutation(req: any): void {
    if (getOrgId(req)) {
      throw new ForbiddenException(
        'The crop catalog is shared across all farms. Only platform administrators can rename or remove entries.',
      );
    }
  }

  @Permission('crop.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateCropSchema))
  async updateCrop(@Param('id') id: string, @Req() req: any, @Body() data: { name: string }) {
    this.assertPlatformCatalogMutation(req);
    return this.cropService.updateCrop(id, data);
  }

  @Permission('crop.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCrop(@Param('id') id: string, @Req() req: any) {
    this.assertPlatformCatalogMutation(req);
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
  async createCropCycle(
    @Req() req: any,
    @Body() data: {
      fieldId: string;
      cropId: string;
      plantingDate: Date | string;
      harvestDate?: Date | string | null;
      health?: number;
      status?: string;
    },
  ) {
    return this.cropService.createCropCycle(getOrgId(req), data);
  }

  @Permission('crop.read')
  @Get()
  async getAllCropCycles(
    @Req() req: any,
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

    const result = await this.cropService.getAllCropCycles({
      organizationId: getOrgId(req),
      sortBy,
      sortOrder,
      page: toPositiveInt(page, 1),
      limit: Math.min(toPositiveInt(limit, 20), 500),
      filter,
    });
    // `cycles` is the legacy key; `data` is what the web clients read.
    return { ...(result as any), data: (result as any)?.cycles ?? [] };
  }

  @Permission('crop.read')
  @Get(':id')
  async getCropCycleById(@Param('id') id: string, @Req() req: any) {
    return this.cropService.getCropCycleById(getOrgId(req), id);
  }

  @Permission('crop.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateCropCycleSchema))
  async updateCropCycle(
    @Param('id') id: string,
    @Req() req: any,
    @Body() data: Partial<{
      fieldId: string;
      cropId: string;
      plantingDate: Date | string;
      harvestDate: Date | string | null;
      health: number;
      status: string;
    }>,
  ) {
    return this.cropService.updateCropCycle(getOrgId(req), id, data);
  }

  @Permission('crop.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCropCycle(@Param('id') id: string, @Req() req: any) {
    return this.cropService.deleteCropCycle(getOrgId(req), id);
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
    @Query('month') month?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    // C4: returns `{ data: CalendarStage[] }` derived from the org's crop
    // cycles (see CropApplicationService.getCalendarStages) — it used to
    // return the raw cycle page, which neither calendar screen could render.
    return this.cropService.getCalendarStages(getOrgId(req), {
      farmId,
      month,
      startDate: parseDateParam(startDate, 'startDate')?.toISOString(),
      endDate: parseDateParam(endDate, 'endDate')?.toISOString(),
      limit: toPositiveInt(limit, 500),
    });
  }

  @Permission('crop.read')
  @Get('crop-cycle/:cropCycleId/stages')
  async getStagesByCycle(@Param('cropCycleId') cropCycleId: string, @Req() req: any) {
    // 404s for a cycle outside the caller's organization, so its stages
    // can't be read either.
    await this.cropService.getCropCycleById(getOrgId(req), cropCycleId);
    const { prisma } = await import('@farm/database');
    const data = await prisma.cropStage.findMany({
      where: { cropCycleId, organizationId: getOrgId(req) },
      orderBy: { startDate: 'asc' },
    });
    return { data, total: data.length };
  }

  @Permission('crop.write')
  @Post('crop-cycle/:cropCycleId/stages')
  @UsePipes(new ZodValidationPipe(createCropStageSchema))
  @HttpCode(HttpStatus.CREATED)
  async createStage(
    @Param('cropCycleId') cropCycleId: string,
    @Req() req: any,
    @Body() body: { stage: string; startDate: Date | string; endDate?: Date | string | null; notes?: string },
  ) {
    // Reject stages attached to a cycle that isn't the caller's.
    await this.cropService.getCropCycleById(getOrgId(req), cropCycleId);
    const startDate = parseDateParam(body.startDate as any, 'startDate');
    if (!startDate) throw new BadRequestException('"startDate" is required');
    const endDate = parseDateParam(body.endDate as any, 'endDate') ?? null;
    if (endDate && endDate < startDate) throw new BadRequestException('"endDate" cannot precede "startDate"');
    const { prisma } = await import('@farm/database');
    return prisma.cropStage.create({
      data: {
        cropCycleId,
        organizationId: getOrgId(req),
        stage: body.stage,
        startDate,
        endDate,
        notes: body.notes || null,
        createdById: req.user?.sub || null,
        createdByName: req.user?.email || null,
      },
    });
  }

  @Permission('crop.write')
  @Put('stages/:id')
  @UsePipes(new ZodValidationPipe(updateCropStageSchema))
  async updateStage(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { stage?: string; startDate?: Date | string; endDate?: Date | string | null; notes?: string },
  ) {
    const { prisma } = await import('@farm/database');
    const existing = await prisma.cropStage.findFirst({ where: { id, organizationId: getOrgId(req) } });
    if (!existing) throw new NotFoundException(`Crop stage with ID ${id} not found`);
    const data: Record<string, unknown> = {};
    if (body.stage) data.stage = body.stage;
    if (body.startDate !== undefined) {
      const startDate = parseDateParam(body.startDate as any, 'startDate');
      if (!startDate) throw new BadRequestException('"startDate" is required');
      data.startDate = startDate;
    }
    if (body.endDate !== undefined) data.endDate = parseDateParam(body.endDate as any, 'endDate');
    if (data.startDate || data.endDate) {
      const effectiveStart = (data.startDate as Date) ?? existing.startDate;
      const effectiveEnd = (data.endDate as Date | null) ?? null;
      if (effectiveEnd && effectiveEnd < effectiveStart) {
        throw new BadRequestException('"endDate" cannot precede "startDate"');
      }
    }
    if (body.notes !== undefined) data.notes = body.notes;
    return prisma.cropStage.update({ where: { id }, data });
  }

  @Permission('crop.delete')
  @Delete('stages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStage(@Param('id') id: string, @Req() req: any) {
    const { prisma } = await import('@farm/database');
    const existing = await prisma.cropStage.findFirst({ where: { id, organizationId: getOrgId(req) } });
    if (!existing) throw new NotFoundException(`Crop stage with ID ${id} not found`);
    await prisma.cropStage.delete({ where: { id } });
    // 204 responses carry no body — returning { deleted: true } here made
    // clients try to parse an empty payload.
  }
}
