import { describe, expect, it } from 'vitest';
import { flockFormSchema } from '@/lib/validation';

const validFlockForm = {
  batchCode: 'BATCH-001',
  farmId: '550e8400-e29b-41d4-a716-446655440000',
  penId: '550e8400-e29b-41d4-a716-446655440001',
  breedId: '550e8400-e29b-41d4-a716-446655440002',
  birdCount: '500',
  arrivalDate: '2025-04-01',
};

describe('flockFormSchema', () => {
  it('accepts the required flock creation fields', () => {
    expect(flockFormSchema.safeParse(validFlockForm).success).toBe(true);
  });

  const invalidValues: Array<[keyof typeof validFlockForm, string]> = [
    ['farmId', ''],
    ['penId', ''],
    ['breedId', ''],
    ['birdCount', '0'],
    ['birdCount', '1.5'],
    ['arrivalDate', 'not-a-date'],
  ];

  it.each(invalidValues)('rejects invalid %s', (field, value) => {
    expect(
      flockFormSchema.safeParse({ ...validFlockForm, [field]: value }).success
    ).toBe(false);
  });
});
