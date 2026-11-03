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
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';
import { PermissionAny, PermissionAnyGuard } from '../../../../../shared/auth/permission-any.guard';
import { CurrencyApplicationService } from '../../application/services/currency.service';
import { ZodValidationPipe } from '@farm/utils';
import { z } from 'zod';

const currencyCode = z.string().length(3).toUpperCase();

const createCurrencySchema = z.object({
  code: currencyCode,
  name: z.string().min(1),
  symbol: z.string().max(5).optional().nullable(),
});

const updateCurrencySchema = z.object({
  name: z.string().min(1).optional(),
  symbol: z.string().max(5).optional().nullable(),
});

const setRateSchema = z.object({
  fromCurrency: currencyCode,
  toCurrency: currencyCode,
  rate: z.number().positive(),
  effectiveAt: z.string().datetime().or(z.date()).optional(),
  source: z.string().max(100).optional().nullable(),
});

const convertSchema = z.object({
  amount: z.number().positive(),
  fromCurrency: currencyCode,
  toCurrency: currencyCode,
});

const convertOrgBaseSchema = z.object({
  amount: z.number().positive(),
  fromCurrency: currencyCode,
  organizationId: z.string().uuid(),
});

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('currencies')
export class CurrencyController {
  constructor(
    private readonly currencyService: CurrencyApplicationService,
  ) {}

  @PermissionAny('currency.read', 'finance.read')
  @UseGuards(PermissionAnyGuard)
  @Get()
  async listCurrencies() {
    return this.currencyService.listCurrencies();
  }

  @Permission('currency.write')
  @Post()
  @UsePipes(new ZodValidationPipe(createCurrencySchema))
  @HttpCode(HttpStatus.CREATED)
  async createCurrency(@Body() data: z.infer<typeof createCurrencySchema>) {
    return this.currencyService.createCurrency(data);
  }

  @PermissionAny('currency.read', 'finance.read')
  @UseGuards(PermissionAnyGuard)
  @Get(':code')
  async getCurrency(@Param('code') code: string) {
    return this.currencyService.getCurrency(code);
  }

  @Permission('currency.write')
  @Put(':code')
  @UsePipes(new ZodValidationPipe(updateCurrencySchema))
  async updateCurrency(
    @Param('code') code: string,
    @Body() data: z.infer<typeof updateCurrencySchema>,
  ) {
    return this.currencyService.updateCurrency(code, data);
  }

  @Permission('currency.delete')
  @Delete(':code')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCurrency(@Param('code') code: string) {
    await this.currencyService.deleteCurrency(code);
    return { deleted: true };
  }

  @Permission('currency.write')
  @Post('rates')
  @UsePipes(new ZodValidationPipe(setRateSchema))
  @HttpCode(HttpStatus.CREATED)
  async setRate(@Body() data: z.infer<typeof setRateSchema>) {
    return this.currencyService.setRate(data);
  }

  @PermissionAny('currency.read', 'finance.read')
  @UseGuards(PermissionAnyGuard)
  @Get('rates')
  async listRates(
    @Query('fromCurrency') fromCurrency?: string,
    @Query('toCurrency') toCurrency?: string,
  ) {
    return this.currencyService.listRates(fromCurrency, toCurrency);
  }

  @PermissionAny('currency.read', 'finance.read')
  @UseGuards(PermissionAnyGuard)
  @Post('convert')
  @UsePipes(new ZodValidationPipe(convertSchema))
  async convert(@Body() data: z.infer<typeof convertSchema>) {
    return this.currencyService.convert(
      data.amount,
      data.fromCurrency,
      data.toCurrency,
    );
  }

  @PermissionAny('currency.read', 'finance.read')
  @UseGuards(PermissionAnyGuard)
  @Post('convert/organization-base')
  @UsePipes(new ZodValidationPipe(convertOrgBaseSchema))
  async convertToOrganizationBase(@Body() data: z.infer<typeof convertOrgBaseSchema>) {
    return this.currencyService.convertToOrganizationBase(
      data.amount,
      data.fromCurrency,
      data.organizationId,
    );
  }
}
