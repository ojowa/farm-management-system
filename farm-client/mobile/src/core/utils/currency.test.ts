import { formatCurrency, formatCurrencyFixed, formatCurrencyValue, formatCurrencyWithCode, formatCurrencyValueWithCode, formatCurrencyFixedWithCode, getCurrencySymbol, loadCurrencySymbol, setCurrencySymbol, loadCurrencies, getCurrencySymbolFromCode } from './currency';

// Mock the DB-backed currency API
jest.mock('@/services/api', () => ({
  currencyAPI: {
    list: jest.fn(() => Promise.resolve({ data: [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
    ] })),
  },
}));

describe('currency utilities (DB-backed)', () => {
  beforeEach(async () => {
    await loadCurrencies();
    jest.clearAllMocks();
  });

  it('getCurrencySymbolFromCode returns DB symbol after loadCurrencies', () => {
    expect(getCurrencySymbolFromCode('USD')).toBe('$');
    expect(getCurrencySymbolFromCode('EUR')).toBe('€');
    expect(getCurrencySymbolFromCode('GBP')).toBe('£');
    // Unknown code renders as its own ISO code
    expect(getCurrencySymbolFromCode('XYZ')).toBe('XYZ');
  });

  it('formatCurrencyWithCode uses DB symbol', () => {
    expect(formatCurrencyWithCode(1500000, 'USD')).toBe('$1.5M');
    expect(formatCurrencyWithCode(2500, 'EUR')).toBe('€2.5K');
    expect(formatCurrencyWithCode(500, 'GBP')).toBe('£500');
  });

  it('formatCurrencyValueWithCode uses DB symbol', () => {
    expect(formatCurrencyValueWithCode(1234, 'USD')).toBe('$1,234');
  });

  it('formatCurrencyFixedWithCode uses DB symbol', () => {
    expect(formatCurrencyFixedWithCode(1234.567, 'USD', 2)).toBe('$1234.57');
    expect(formatCurrencyFixedWithCode(-500, 'EUR')).toBe('€500');
  });

  it('formatCurrency uses USD symbol from DB', () => {
    expect(formatCurrency(1500000, 'USD')).toBe('$1.5M');
    expect(formatCurrency(2500, 'USD')).toBe('$2.5K');
    expect(formatCurrency(500, 'USD')).toBe('$500');
  });

  it('setCurrencySymbol updates the per-user override', async () => {
    await setCurrencySymbol('€');
    expect(getCurrencySymbol()).toBe('€');
    // Reset
    await setCurrencySymbol('$');
  });
});
