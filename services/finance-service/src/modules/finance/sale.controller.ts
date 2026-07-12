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
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';
import { FinanceService } from './finance.service';
import { ZodValidationPipe } from '@farm/utils';
import { createSaleSchema, updateSaleSchema } from '@farm/validation';

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('sales')
export class SaleController {
  constructor(private readonly financeService: FinanceService) {}

  @Permission('finance.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createSaleSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any, @Query('organizationId') organizationId?: string) {
    return this.financeService.createSale(data, organizationId || '');
  }

  @Permission('finance.read')
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('farmId') farmId?: string,
    @Query('search') search?: string,
  ) {
    const filter: any = {};
    if (farmId) filter.farmId = farmId;
    if (search) filter.search = search;
    return this.financeService.getAllSales(filter, sortBy || 'date', sortOrder || 'desc', parseInt(page || '1'), parseInt(limit || '20'));
  }

  @Permission('finance.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.financeService.getSaleById(id);
  }

  @Permission('finance.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateSaleSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.financeService.updateSale(id, data);
  }

  @Permission('finance.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.financeService.deleteSale(id);
  }
}
