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
import { createExpenseSchema, updateExpenseSchema } from '@farm/validation';

@Controller('expenses')
export class ExpenseController {
  constructor(private readonly financeService: FinanceService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createExpenseSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any, @Query('organizationId') organizationId?: string) {
    return this.financeService.createExpense(data, organizationId || '');
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
    return this.financeService.getAllExpenses(filter, sortBy || 'date', sortOrder || 'desc', parseInt(page || '1'), parseInt(limit || '20'));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.financeService.getExpenseById(id);
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateExpenseSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.financeService.updateExpense(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.financeService.deleteExpense(id);
  }
}
