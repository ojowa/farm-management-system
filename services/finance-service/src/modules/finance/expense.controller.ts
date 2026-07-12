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
import { createExpenseSchema, updateExpenseSchema } from '@farm/validation';

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('expenses')
export class ExpenseController {
  constructor(private readonly financeService: FinanceService) {}

  @Permission('finance.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createExpenseSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any, @Query('organizationId') organizationId?: string) {
    return this.financeService.createExpense(data, organizationId || '');
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
    return this.financeService.getAllExpenses(filter, sortBy || 'date', sortOrder || 'desc', parseInt(page || '1'), parseInt(limit || '20'));
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
