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
import { FinanceApplicationService } from '../../application/services/finance.service';
import { ZodValidationPipe } from '@farm/utils';
import {
  createExpenseSchema,
  updateExpenseSchema,
  createSaleSchema,
  updateSaleSchema,
} from '@farm/validation-server';

function getOrgId(req: any): string {
  return String(req.user?.organizationId || '');
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('expenses')
export class ExpenseController {
  constructor(private readonly financeService: FinanceApplicationService) {}

  @Permission('finance.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createExpenseSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() data: any) {
    return this.financeService.createExpense(data, getOrgId(req));
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
    return this.financeService.getAllExpenses(
      filter,
      sortBy || 'date',
      sortOrder || 'desc',
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
  }

  @Permission('finance.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.financeService.getExpenseById(id);
  }

  @Permission('finance.write')
  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateExpenseSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.financeService.updateExpense(id, data);
  }

  @Permission('finance.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.financeService.deleteExpense(id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('sales')
export class SaleController {
  constructor(private readonly financeService: FinanceApplicationService) {}

  @Permission('finance.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createSaleSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() data: any) {
    return this.financeService.createSale(data, getOrgId(req));
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
    return this.financeService.getAllSales(
      filter,
      sortBy || 'date',
      sortOrder || 'desc',
      parseInt(page || '1'),
      parseInt(limit || '20'),
    );
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

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('contracts')
export class ContractController {
  constructor(private readonly financeService: FinanceApplicationService) {}

  @Permission('finance.read')
  @Get()
  async findAll(
    @Req() req: any,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.financeService.getAllContracts({ organizationId: getOrgId(req), type, status });
  }

  @Permission('finance.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() body: any) {
    return this.financeService.createContract(body, getOrgId(req));
  }

  @Permission('finance.write')
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.financeService.updateContract(id, body);
  }

  @Permission('finance.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.financeService.deleteContract(id);
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly financeService: FinanceApplicationService) {}

  @Permission('finance.read')
  @Get('buyers')
  async findBuyers(@Req() req: any) {
    return this.financeService.getAllBuyers(getOrgId(req));
  }

  @Permission('finance.write')
  @Post('buyers')
  @HttpCode(HttpStatus.CREATED)
  async createBuyer(@Req() req: any, @Body() body: any) {
    return this.financeService.createBuyer(body, getOrgId(req));
  }

  @Permission('finance.write')
  @Put('buyers/:id')
  async updateBuyer(@Param('id') id: string, @Body() body: any) {
    return this.financeService.updateBuyer(id, body);
  }

  @Permission('finance.delete')
  @Delete('buyers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBuyer(@Param('id') id: string) {
    return this.financeService.deleteBuyer(id);
  }

  @Permission('finance.read')
  @Get('listings')
  async findListings(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.financeService.getAllMarketListings({ organizationId: getOrgId(req), status, entityType });
  }

  @Permission('finance.write')
  @Post('listings')
  @HttpCode(HttpStatus.CREATED)
  async createListing(@Req() req: any, @Body() body: any) {
    return this.financeService.createMarketListing(body, getOrgId(req));
  }

  @Permission('finance.write')
  @Put('listings/:id')
  async updateListing(@Param('id') id: string, @Body() body: any) {
    return this.financeService.updateMarketListing(id, body);
  }

  @Permission('finance.delete')
  @Delete('listings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteListing(@Param('id') id: string) {
    return this.financeService.deleteMarketListing(id);
  }
}
