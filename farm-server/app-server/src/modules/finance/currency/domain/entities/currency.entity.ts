export interface Currency {
  code: string;
  name: string;
  symbol: string | null;
  updatedAt: Date;
}

export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveAt: Date;
  source: string | null;
}

export interface ConvertedAmount {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  convertedAmount: number;
}
