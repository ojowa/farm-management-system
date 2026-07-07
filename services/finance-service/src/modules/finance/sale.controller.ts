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
import { FinanceService } from './finance.service';
import { ZodValidationPipe } from '@farm/utils';
import { createSaleSchema, updateSaleSchema } from '@farm/validation';

@Controller('sales')
export class SaleController {
  constructor(private readonly financeService: FinanceService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createSaleSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any, @Query('organizationId') organizationId?: string) {
    return this.financeService.createSale(data, organizationId || '');
  }

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

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.financeService.getSaleById(id);
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateSaleSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.financeService.updateSale(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.financeService.deleteSale(id);
  }
}
