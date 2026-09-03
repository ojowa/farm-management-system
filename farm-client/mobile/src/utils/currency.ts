import { Platform } from 'react-native';

const CURRENCY_KEY = 'currency_symbol';

let cachedSymbol: string | null = null;

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

export function getCurrencySymbol(): string {
  return cachedSymbol ?? '$';
}

export async function loadCurrencySymbol(): Promise<string> {
  const stored = await getItem(CURRENCY_KEY);
  cachedSymbol = stored ?? '$';
  return cachedSymbol;
}

export async function setCurrencySymbol(symbol: string): Promise<void> {
  await setItem(CURRENCY_KEY, symbol);
  cachedSymbol = symbol;
}

export function formatCurrency(amount: number): string {
  const symbol = getCurrencySymbol();
  if (amount >= 1000000) return `${symbol}${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`;
  return `${symbol}${amount.toLocaleString()}`;
}

export function formatCurrencyValue(amount: number): string {
  return `${getCurrencySymbol()}${amount.toLocaleString()}`;
}

export function formatCurrencyFixed(amount: number, decimals = 0): string {
  return `${getCurrencySymbol()}${Math.abs(amount).toFixed(decimals)}`;
}
