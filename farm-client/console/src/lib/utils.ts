import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Currency-aware money label — Intl picks each code's own symbol (₦, $, R, KSh…).
 * `amount` may arrive as a Prisma Decimal (JSON-serialized as a string).
 */
export function formatMoney(amount: string | number, currency: string): string {
  const value = Number(amount);
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value} ${currency}`;
  }
}
