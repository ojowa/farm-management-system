import { Currency, ExchangeRate, ConvertedAmount } from '../entities/currency.entity';

export interface CurrencyRepository {
  findAll(): Promise<Currency[]>;
  findByCode(code: string): Promise<Currency | null>;
  create(data: { code: string; name: string; symbol?: string | null }): Promise<Currency>;
  update(code: string, data: { name?: string; symbol?: string | null }): Promise<Currency>;
  delete(code: string): Promise<void>;

  setRate(data: {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    effectiveAt?: Date | string;
    source?: string | null;
  }): Promise<ExchangeRate>;
  listRates(fromCurrency?: string, toCurrency?: string): Promise<ExchangeRate[]>;
  getLatestRate(fromCurrency: string, toCurrency: string): Promise<{ rate: number; effectiveAt: Date } | null>;
  getRateAt(fromCurrency: string, toCurrency: string, effectiveAt: Date | string): Promise<{ rate: number; effectiveAt: Date } | null>;
  convert(amount: number, fromCurrency: string, toCurrency: string): Promise<ConvertedAmount>;
  convertAt(amount: number, fromCurrency: string, toCurrency: string, effectiveAt: Date | string): Promise<ConvertedAmount>;
  convertToOrganizationBase(amount: number, fromCurrency: string, organizationId: string): Promise<ConvertedAmount>;
  convertToOrganizationBaseAt(amount: number, fromCurrency: string, organizationId: string, effectiveAt: Date | string): Promise<ConvertedAmount>;
}

export interface ConversionService {
  convert(amount: number, fromCurrency: string, toCurrency: string): Promise<ConvertedAmount>;
  convertAt(amount: number, fromCurrency: string, toCurrency: string, effectiveAt: Date | string): Promise<ConvertedAmount>;
  convertToOrganizationBase(amount: number, fromCurrency: string, organizationId: string): Promise<ConvertedAmount>;
  convertToOrganizationBaseAt(amount: number, fromCurrency: string, organizationId: string, effectiveAt: Date | string): Promise<ConvertedAmount>;
}
