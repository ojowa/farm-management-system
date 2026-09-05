import { formatCurrency, formatCurrencyFixed, formatCurrencyValue, getCurrencySymbol, loadCurrencySymbol, setCurrencySymbol } from './currency';

// Reset cache between tests
beforeEach(() => {
  // Access internal cache via loadCurrencySymbol
  jest.resetModules();
});

describe('currency utilities', () => {
  it('getCurrencySymbol returns $ by default', () => {
    expect(getCurrencySymbol()).toBe('$');
  });

  it('formatCurrency formats large numbers with M suffix', () => {
    expect(formatCurrency(1500000)).toBe('$1.5M');
  });

  it('formatCurrency formats thousands with K suffix', () => {
    expect(formatCurrency(2500)).toBe('$2.5K');
  });

  it('formatCurrency formats small numbers directly', () => {
    expect(formatCurrency(500)).toBe('$500');
  });

  it('formatCurrencyValue shows full value', () => {
    expect(formatCurrencyValue(1234)).toBe('$1,234');
  });

  it('formatCurrencyFixed shows fixed decimals', () => {
    expect(formatCurrencyFixed(1234.567, 2)).toBe('$1234.57');
  });

  it('formatCurrencyFixed handles negative values with abs', () => {
    expect(formatCurrencyFixed(-500)).toBe('$500');
  });

  it('setCurrencySymbol updates the symbol', async () => {
    await setCurrencySymbol('€');
    expect(getCurrencySymbol()).toBe('€');
    // Reset
    await setCurrencySymbol('$');
  });
});
