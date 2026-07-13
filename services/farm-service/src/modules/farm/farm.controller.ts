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
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';
import { FarmService } from './farm.service';
import { ZodValidationPipe } from '@farm/utils';
import { createFarmSchema, updateFarmSchema } from '@farm/validation';

function getOrgId(req: any): string {
  return String(req.user?.organizationId || '');
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('farms')
export class FarmController {
  constructor(private readonly farmService: FarmService) {}

  @Permission('farm.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createFarmSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.farmService.createFarm(data);
  }

  @Permission('farm.read')
  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('farmType') farmType?: string,
    @Query('name') name?: string,
    @Query('location') location?: string,
  ) {
    const filter: any = { organizationId: getOrgId(req) };
    if (farmType) filter.farmType = farmType;
    if (name) filter.name = name;
    if (location) filter.location = location;

    return this.farmService.getAllFarms(
      filter,
      sortBy || 'createdAt',
      sortOrder || 'desc',
      parseInt(page || '1'),
      parseInt(limit || '10'),
    );
  }

  @Permission('farm.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.farmService.getFarmById(id);
  }

  @Permission('farm.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateFarmSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.farmService.updateFarm(id, data);
  }

  @Permission('farm.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.farmService.deleteFarm(id);
  }
}
