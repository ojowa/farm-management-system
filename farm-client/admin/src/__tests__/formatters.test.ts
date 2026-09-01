import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatPercentage,
  formatFileSize,
  truncate,
  capitalize,
  pluralize,
} from '@/lib/formatters';

describe('formatCurrency', () => {
  it('formats USD by default', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats negative values', () => {
    expect(formatCurrency(-500)).toBe('-$500.00');
  });

  it('formats with different currency', () => {
    expect(formatCurrency(100, 'EUR')).toContain('100.00');
  });
});

describe('formatNumber', () => {
  it('formats integers', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('formats decimals when enabled', () => {
    expect(formatNumber(1234.5678, { decimals: true })).toBe('1,234.57');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

describe('formatDate', () => {
  it('formats ISO date', () => {
    expect(formatDate('2026-06-15', 'iso')).toBe('2026-06-15');
  });

  it('formats short date', () => {
    const result = formatDate('2026-06-15', 'short');
    expect(result).toContain('Jun');
    expect(result).toContain('15');
  });

  it('formats long date', () => {
    const result = formatDate('2026-06-15', 'long');
    expect(result).toContain('June');
    expect(result).toContain('15');
  });

  it('formats relative time', () => {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    expect(formatDate(fiveMinAgo, 'relative')).toBe('5m ago');
  });

  it('formats just now', () => {
    const now = new Date();
    expect(formatDate(now, 'relative')).toBe('Just now');
  });

  it('formats hours ago', () => {
    const now = new Date();
    const twoHrAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    expect(formatDate(twoHrAgo, 'relative')).toBe('2h ago');
  });

  it('formats days ago', () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(formatDate(threeDaysAgo, 'relative')).toBe('3d ago');
  });
});

describe('formatPercentage', () => {
  it('formats with default decimal', () => {
    expect(formatPercentage(75.5)).toBe('75.5%');
  });

  it('formats with custom decimal', () => {
    expect(formatPercentage(75.567, 2)).toBe('75.57%');
  });

  it('formats zero', () => {
    expect(formatPercentage(0)).toBe('0.0%');
  });
});

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
  });

  it('formats gigabytes', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });

  it('formats with decimals', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });
});

describe('truncate', () => {
  it('returns original string if shorter than limit', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates long strings', () => {
    expect(truncate('hello world', 5)).toBe('hello...');
  });

  it('handles exact length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });
});

describe('capitalize', () => {
  it('capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('handles empty string', () => {
    expect(capitalize('')).toBe('');
  });

  it('handles already capitalized', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });
});

describe('pluralize', () => {
  it('returns singular for count 1', () => {
    expect(pluralize(1, 'item')).toBe('item');
  });

  it('returns plural for count 0', () => {
    expect(pluralize(0, 'item')).toBe('items');
  });

  it('returns plural for count > 1', () => {
    expect(pluralize(5, 'item')).toBe('items');
  });

  it('uses custom plural', () => {
    expect(pluralize(2, 'child', 'children')).toBe('children');
  });
});
