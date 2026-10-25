import { describe, expect, it } from 'vitest';
import { penFormSchema } from '@/lib/validation';

// Pens are filed under a house, so the form always carries the house id — the
// house detail page stamps it from the route, the houses page collects it.
const validPenForm = {
  poultryHouseId: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Pen A',
  capacity: '1000',
};

describe('penFormSchema', () => {
  it('accepts a complete pen form', () => {
    expect(penFormSchema.safeParse(validPenForm).success).toBe(true);
  });

  const invalidValues: Array<[keyof typeof validPenForm, string]> = [
    ['poultryHouseId', ''],
    ['name', ''],
    ['capacity', ''],
    ['capacity', '0'],
    ['capacity', '-5'],
    ['capacity', '1.5'],
  ];

  it.each(invalidValues)('rejects invalid %s', (field, value) => {
    expect(penFormSchema.safeParse({ ...validPenForm, [field]: value }).success).toBe(false);
  });
});
