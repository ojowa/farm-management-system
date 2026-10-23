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
import { AquacultureApplicationService } from '../../application/services/aquaculture.service';
import { ZodValidationPipe } from '@farm/utils';
import {
  createPondSchema,
  updatePondSchema,
  createStockingSchema,
  updateStockingSchema,
  createFeedingSchema,
  createWaterQualitySchema,
  createHarvestSchema,
} from '@farm/validation-server';

function getOrgIdFromRequest(req: any): string {
  return String(req.user?.organizationId || '');
}

function parsePagination(
  page?: string,
  limit?: string,
  sortBy?: string,
  sortOrder?: string,
): { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } {
  const parsedPage = page ? parseInt(page, 10) : undefined;
  const parsedLimit = limit ? parseInt(limit, 10) : undefined;
  return {
    page: parsedPage && parsedPage > 0 ? parsedPage : undefined,
    // Clamp so `?limit=999999999` can't ask Postgres for a billion rows.
    limit: parsedLimit && parsedLimit > 0 ? Math.min(parsedLimit, 500) : undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : undefined,
  };
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('aquaculture')
export class AquacultureController {
  constructor(private readonly aquacultureService: AquacultureApplicationService) {}

  // ── Ponds ────────────────────────────────────────────────────────────

  @Permission('aquaculture.read')
  @Get('ponds')
  async listPonds(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('farmId') farmId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const filter: { farmId?: string; status?: string; search?: string } = {};
    if (farmId) filter.farmId = farmId;
    if (status) filter.status = status;
    if (search) filter.search = search;

    return this.aquacultureService.getAllPonds(
      getOrgIdFromRequest(req),
      filter,
      parsePagination(page, limit, sortBy, sortOrder),
    );
  }

  @Permission('aquaculture.write')
  @Post('ponds')
  @UsePipes(new ZodValidationPipe(createPondSchema))
  @HttpCode(HttpStatus.CREATED)
  async createPond(@Req() req: any, @Body() data: any) {
    return this.aquacultureService.createPond(getOrgIdFromRequest(req), data);
  }

  @Permission('aquaculture.read')
  @Get('ponds/:id')
  async getPond(@Req() req: any, @Param('id') id: string) {
    return this.aquacultureService.getPondById(getOrgIdFromRequest(req), id);
  }

  @Permission('aquaculture.write')
  @Put('ponds/:id')
  @UsePipes(new ZodValidationPipe(updatePondSchema))
  async updatePond(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.aquacultureService.updatePond(getOrgIdFromRequest(req), id, data);
  }

  @Permission('aquaculture.delete')
  @Delete('ponds/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePond(@Req() req: any, @Param('id') id: string) {
    await this.aquacultureService.deletePond(getOrgIdFromRequest(req), id);
  }

  // ── Stockings ────────────────────────────────────────────────────────

  @Permission('aquaculture.read')
  @Get('ponds/:id/stockings')
  async listStockings(@Req() req: any, @Param('id') id: string) {
    return this.aquacultureService.listStockings(getOrgIdFromRequest(req), id);
  }

  @Permission('aquaculture.write')
  @Post('ponds/:id/stockings')
  @UsePipes(new ZodValidationPipe(createStockingSchema))
  @HttpCode(HttpStatus.CREATED)
  async createStocking(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.aquacultureService.createStocking(getOrgIdFromRequest(req), id, data);
  }

  @Permission('aquaculture.write')
  @Put('stockings/:id')
  @UsePipes(new ZodValidationPipe(updateStockingSchema))
  async updateStocking(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.aquacultureService.updateStocking(getOrgIdFromRequest(req), id, data);
  }

  @Permission('aquaculture.delete')
  @Delete('stockings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStocking(@Req() req: any, @Param('id') id: string) {
    await this.aquacultureService.deleteStocking(getOrgIdFromRequest(req), id);
  }

  // ── Feedings ─────────────────────────────────────────────────────────

  @Permission('aquaculture.read')
  @Get('ponds/:id/feedings')
  async listFeedings(@Req() req: any, @Param('id') id: string) {
    return this.aquacultureService.listFeedings(getOrgIdFromRequest(req), id);
  }

  @Permission('aquaculture.write')
  @Post('ponds/:id/feedings')
  @UsePipes(new ZodValidationPipe(createFeedingSchema))
  @HttpCode(HttpStatus.CREATED)
  async createFeeding(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.aquacultureService.createFeeding(getOrgIdFromRequest(req), id, data);
  }

  @Permission('aquaculture.delete')
  @Delete('feedings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFeeding(@Req() req: any, @Param('id') id: string) {
    await this.aquacultureService.deleteFeeding(getOrgIdFromRequest(req), id);
  }

  // ── Water quality ────────────────────────────────────────────────────

  @Permission('aquaculture.read')
  @Get('ponds/:id/water-quality')
  async listWaterQuality(@Req() req: any, @Param('id') id: string) {
    return this.aquacultureService.listWaterQuality(getOrgIdFromRequest(req), id);
  }

  @Permission('aquaculture.write')
  @Post('ponds/:id/water-quality')
  @UsePipes(new ZodValidationPipe(createWaterQualitySchema))
  @HttpCode(HttpStatus.CREATED)
  async createWaterQuality(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.aquacultureService.createWaterQuality(getOrgIdFromRequest(req), id, data);
  }

  @Permission('aquaculture.delete')
  @Delete('water-quality/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWaterQuality(@Req() req: any, @Param('id') id: string) {
    await this.aquacultureService.deleteWaterQuality(getOrgIdFromRequest(req), id);
  }

  // ── Harvests ─────────────────────────────────────────────────────────

  @Permission('aquaculture.read')
  @Get('ponds/:id/harvests')
  async listHarvests(@Req() req: any, @Param('id') id: string) {
    return this.aquacultureService.listHarvests(getOrgIdFromRequest(req), id);
  }

  @Permission('aquaculture.write')
  @Post('ponds/:id/harvests')
  @UsePipes(new ZodValidationPipe(createHarvestSchema))
  @HttpCode(HttpStatus.CREATED)
  async createHarvest(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.aquacultureService.createHarvest(getOrgIdFromRequest(req), id, data);
  }

  @Permission('aquaculture.delete')
  @Delete('harvests/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteHarvest(@Req() req: any, @Param('id') id: string) {
    await this.aquacultureService.deleteHarvest(getOrgIdFromRequest(req), id);
  }
}
