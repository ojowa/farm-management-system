import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';
import { FinanceService } from './finance.service';

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('budgets')
export class BudgetController {
  constructor(private readonly financeService: FinanceService) {}

  @Permission('finance.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any, @Query('organizationId') organizationId?: string) {
    return this.financeService.createBudget(data, organizationId || '');
  }

  @Permission('finance.read')
  @Get()
  async findAll(
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: string,
    @Query('farmId') farmId?: string,
  ) {
    return this.financeService.getAllBudgets(organizationId || '', { status, farmId });
  }

  @Permission('finance.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.financeService.getBudgetById(id);
  }

  @Permission('finance.write')
  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.financeService.updateBudget(id, data);
  }

  @Permission('finance.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.financeService.deleteBudget(id);
  }

  @Permission('finance.write')
  @Post(':id/categories')
  @HttpCode(HttpStatus.CREATED)
  async addCategory(@Param('id') budgetId: string, @Body() data: { name: string; budgetAmount: number }) {
    return this.financeService.addCategory(budgetId, data);
  }

  @Permission('finance.write')
  @Put('categories/:categoryId')
  async updateCategory(@Param('categoryId') categoryId: string, @Body() data: { name?: string; budgetAmount?: number }) {
    return this.financeService.updateCategory(categoryId, data);
  }

  @Permission('finance.delete')
  @Delete('categories/:categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@Param('categoryId') categoryId: string) {
    return this.financeService.deleteCategory(categoryId);
  }

  @Permission('finance.write')
  @Post(':id/refresh')
  async refreshSpent(@Param('id') budgetId: string, @Query('organizationId') organizationId?: string) {
    return this.financeService.refreshSpentAmounts(budgetId, organizationId || '');
  }
}
