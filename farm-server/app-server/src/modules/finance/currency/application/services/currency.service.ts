import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CurrencyRepository } from '../../domain/repositories/currency.repository';
import { Currency } from '../../domain/entities/currency.entity';

@Injectable()
export class CurrencyApplicationService {
  constructor(
    private readonly currencyRepo: CurrencyRepository,
  ) {}

  async listCurrencies(): Promise<Currency[]> {
    return this.currencyRepo.findAll();
  }

  async getCurrency(code: string): Promise<Currency> {
    const currency = await this.currencyRepo.findByCode(code);
    if (!currency) {
      throw new NotFoundException(`Currency with code ${code} not found`);
    }
    return currency;
  }

  async createCurrency(data: {
    code: string;
    name: string;
    symbol?: string | null;
  }): Promise<Currency> {
    const existing = await this.currencyRepo.findByCode(data.code);
    if (existing) {
      throw new BadRequestException(`Currency ${data.code} already exists`);
    }
    return this.currencyRepo.create(data);
  }

  async updateCurrency(
    code: string,
    data: { name?: string; symbol?: string | null },
  ): Promise<Currency> {
    await this.getCurrency(code);
    return this.currencyRepo.update(code, data);
  }

  async deleteCurrency(code: string): Promise<void> {
    await this.getCurrency(code);
    await this.currencyRepo.delete(code);
  }

  async setRate(data: {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    effectiveAt?: Date | string;
    source?: string | null;
  }) {
    if (data.rate <= 0) {
      throw new BadRequestException('Exchange rate must be positive');
    }
    return this.currencyRepo.setRate(data);
  }

  async listRates(fromCurrency?: string, toCurrency?: string) {
    return this.currencyRepo.listRates(fromCurrency, toCurrency);
  }

  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ) {
    return this.currencyRepo.convert(amount, fromCurrency, toCurrency);
  }

  async convertToOrganizationBase(
    amount: number,
    fromCurrency: string,
    organizationId: string,
  ) {
    return this.currencyRepo.convertToOrganizationBase(
      amount,
      fromCurrency,
      organizationId,
    );
  }
}
