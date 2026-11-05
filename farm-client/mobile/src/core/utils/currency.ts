import { Platform } from 'react-native';
import { currencyAPI } from '@/services/api';

const CURRENCY_KEY = 'currency_symbol';

// Currency symbols come exclusively from the server (the Currency registry table).
// Before loadCurrencies() resolves, the cache is empty and unknown codes render
// as their own ISO code. No symbol is ever hardcoded on the client.
let currencySymbols: Record<string, string> = {};
let cachedUserSymbol: string | null = null;
let currenciesLoaded = false;

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  const SecureStore = require('expo-secure-store');
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
    return;
  }
  const SecureStore = require('expo-secure-store');
  await SecureStore.setItemAsync(key, value);
}

/**
 * Fetch currency records from the DB-backed Currency registry and populate the
 * local symbol cache. Safe to call multiple times; each call overwrites with
 * the latest DB values.
 */
export async function loadCurrencies(): Promise<void> {
  try {
    const res = await currencyAPI.list();
    const currencies = res?.data ?? res ?? [];
    const symbols: Record<string, string> = {};
    for (const c of currencies ?? []) {
      if (!c || !c.code) continue;
      const code = String(c.code).toUpperCase();
      symbols[code] = c.symbol ? String(c.symbol) : code;
    }
    currencySymbols = symbols;
    currenciesLoaded = true;
  } catch {
    currenciesLoaded = false;
  }
}

export function isCurrenciesLoaded(): boolean {
  return currenciesLoaded;
}

export function getCurrencySymbolFromCode(code: string): string {
  return currencySymbols[code.toUpperCase()] ?? code;
}

export function getCurrencySymbol(): string {
  // Per-org base-currency symbol from the DB (set via loadOrganizationCurrency
  // in authSlice). Falls back to the ISO code 'USD' only when nothing is loaded yet.
  return cachedUserSymbol ?? 'USD';
}

export async function loadCurrencySymbol(): Promise<string> {
  const stored = await getItem(CURRENCY_KEY);
  cachedUserSymbol = stored ?? null;
  return stored ?? 'USD';
}

export async function setCurrencySymbol(symbol: string): Promise<void> {
  await setItem(CURRENCY_KEY, symbol);
  cachedUserSymbol = symbol;
}

// All currency formatting functions require an explicit currency code. No
// currency is ever hardcoded on the client.
export function formatCurrencyWithCode(amount: number, code: string): string {
  const symbol = getCurrencySymbolFromCode(code);
  if (amount >= 1000000) return `${symbol}${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`;
  return `${symbol}${amount.toLocaleString()}`;
}

export function formatCurrencyValueWithCode(amount: number, code: string): string {
  const symbol = getCurrencySymbolFromCode(code);
  return `${symbol}${amount.toLocaleString()}`;
}

export function formatCurrencyFixedWithCode(amount: number, code: string, decimals = 0): string {
  const symbol = getCurrencySymbolFromCode(code);
  return `${symbol}${Math.abs(amount).toFixed(decimals)}`;
}

export function formatCurrency(amount: number, code: string): string {
  return formatCurrencyWithCode(amount, code);
}

export function formatCurrencyValue(amount: number, code: string): string {
  return formatCurrencyValueWithCode(amount, code);
}

export function formatCurrencyFixed(amount: number, code: string, decimals = 0): string {
  return formatCurrencyFixedWithCode(amount, code, decimals);
}
