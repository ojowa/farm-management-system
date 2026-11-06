import { Injectable } from '@nestjs/common';
import { scopedPrisma } from '@farm/database';
import {
  CurrencyRepository,
  ConversionService,
} from '../../domain/repositories/currency.repository';
import { Currency, ExchangeRate, ConvertedAmount } from '../../domain/entities/currency.entity';

@Injectable()
export class PrismaCurrencyRepository
  implements CurrencyRepository, ConversionService {
  async findAll(): Promise<Currency[]> {
    return scopedPrisma.currency.findMany({ orderBy: { code: 'asc' } });
  }

  async findByCode(code: string): Promise<Currency | null> {
    return scopedPrisma.currency.findUnique({ where: { code } });
  }

  async create(data: {
    code: string;
    name: string;
    symbol?: string | null;
  }): Promise<Currency> {
    return scopedPrisma.currency.create({
      data: { code: data.code, name: data.name, symbol: data.symbol ?? null },
    });
  }

  async update(
    code: string,
    data: { name?: string; symbol?: string | null },
  ): Promise<Currency> {
    return scopedPrisma.currency.update({
      where: { code },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.symbol !== undefined ? { symbol: data.symbol } : {}),
      },
    });
  }

  async delete(code: string): Promise<void> {
    await scopedPrisma.currency.delete({ where: { code } });
  }

  async setRate(data: {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    effectiveAt?: Date | string;
    source?: string | null;
  }): Promise<ExchangeRate> {
    return scopedPrisma.exchangeRate.create({
      data: {
        fromCurrency: data.fromCurrency,
        toCurrency: data.toCurrency,
        rate: data.rate,
        effectiveAt: data.effectiveAt
          ? new Date(data.effectiveAt)
          : new Date(),
        source: data.source ?? null,
      },
    });
  }

  async listRates(
    fromCurrency?: string,
    toCurrency?: string,
  ): Promise<ExchangeRate[]> {
    const where: any = {};
    if (fromCurrency) where.fromCurrency = fromCurrency;
    if (toCurrency) where.toCurrency = toCurrency;
    return scopedPrisma.exchangeRate.findMany({
      where,
      orderBy: [{ fromCurrency: 'asc' }, { toCurrency: 'asc' }, { effectiveAt: 'desc' }],
    });
  }

  async getLatestRate(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<{ rate: number; effectiveAt: Date } | null> {
    const rate = await scopedPrisma.exchangeRate.findFirst({
      where: { fromCurrency, toCurrency },
      orderBy: { effectiveAt: 'desc' },
    });
    if (!rate) return null;
    return { rate: rate.rate, effectiveAt: rate.effectiveAt };
  }

  async getRateAt(
    fromCurrency: string,
    toCurrency: string,
    effectiveAt: Date | string,
  ): Promise<{ rate: number; effectiveAt: Date } | null> {
    const at = typeof effectiveAt === 'string' ? new Date(effectiveAt) : effectiveAt;
    const rate = await scopedPrisma.exchangeRate.findFirst({
      where: {
        fromCurrency,
        toCurrency,
        effectiveAt: { lte: at },
      },
      orderBy: { effectiveAt: 'desc' },
    });
    if (!rate) return null;
    return { rate: rate.rate, effectiveAt: rate.effectiveAt };
  }

  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ConvertedAmount> {
    return this.convertAt(amount, fromCurrency, toCurrency, new Date());
  }

  async convertAt(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    effectiveAt: Date | string,
  ): Promise<ConvertedAmount> {
    if (fromCurrency === toCurrency) {
      return {
        amount,
        fromCurrency,
        toCurrency,
        rate: 1,
        convertedAmount: amount,
      };
    }
    const rate = await this.getRateAt(fromCurrency, toCurrency, effectiveAt);
    if (!rate) {
      throw new Error(
        `No exchange rate set for ${fromCurrency} → ${toCurrency} on or before ${typeof effectiveAt === 'string' ? effectiveAt : effectiveAt.toISOString()}`,
      );
    }
    const convertedAmount = Number((amount * rate.rate).toFixed(4));
    return {
      amount,
      fromCurrency,
      toCurrency,
      rate: rate.rate,
      convertedAmount,
    };
  }

  async convertToOrganizationBase(
    amount: number,
    fromCurrency: string,
    organizationId: string,
  ): Promise<ConvertedAmount> {
    return this.convertToOrganizationBaseAt(amount, fromCurrency, organizationId, new Date());
  }

  async convertToOrganizationBaseAt(
    amount: number,
    fromCurrency: string,
    organizationId: string,
    effectiveAt: Date | string,
  ): Promise<ConvertedAmount> {
    const { prisma } = await import('@farm/database');
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { currency: true },
    });
    const toCurrency = organization?.currency ?? 'USD';
    return this.convertAt(amount, fromCurrency, toCurrency, effectiveAt);
  }
}
