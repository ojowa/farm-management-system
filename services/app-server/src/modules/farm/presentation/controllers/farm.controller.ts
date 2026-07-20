import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';
import { FarmApplicationService } from '../../application/services/farm.service';

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('farms')
export class FarmController {
  constructor(private readonly farmService: FarmApplicationService) {}

  @Permission('farm.write')
  @Post()
  create(@Body() body: {
    organizationId: string;
    name: string;
    farmType: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    size?: number;
  }) {
    return this.farmService.createFarm(body);
  }

  @Permission('farm.read')
  @Get()
  findAll(
    @Req() req: any,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.farmService.getAllFarms({
      organizationId: String(req.user?.organizationId || ''),
      sortBy,
      sortOrder,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Permission('farm.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.farmService.getFarmById(id);
  }

  @Permission('farm.write')
  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<{
    name: string;
    farmType: string;
    location: string;
    latitude: number;
    longitude: number;
    size: number;
    status: string;
  }>) {
    return this.farmService.updateFarm(id, body);
  }

  @Permission('farm.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.farmService.deleteFarm(id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('fields')
export class FieldController {
  constructor(private readonly farmService: FarmApplicationService) {}

  @Permission('farm.write')
  @Post()
  create(@Body() body: { farmId: string; name: string; size: number }) {
    return this.farmService.createField(body);
  }

  @Permission('farm.read')
  @Get()
  findAll(@Query('farmId') farmId: string) {
    return this.farmService.getAllFields(farmId);
  }

  @Permission('farm.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.farmService.getFieldById(id);
  }

  @Permission('farm.write')
  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<{ name: string; size: number }>) {
    return this.farmService.updateField(id, body);
  }

  @Permission('farm.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.farmService.deleteField(id);
  }
}
