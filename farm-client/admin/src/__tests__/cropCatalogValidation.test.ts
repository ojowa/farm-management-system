import { describe, expect, it } from 'vitest';
import { cropCatalogFormSchema } from '@/lib/validation';

// A crop is just a name — the server's createCropSchema trims nothing, but the
// form does, so "  Maize  " and "Maize" are the same crop (and the server's
// unique constraint on (organizationId, name) treats them as one).
describe('cropCatalogFormSchema', () => {
  it('accepts a real crop name', () => {
    expect(cropCatalogFormSchema.safeParse({ name: 'Maize' }).success).toBe(true);
  });

  it('trims surrounding whitespace', () => {
    const result = cropCatalogFormSchema.safeParse({ name: '  Soybean  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe('Soybean');
  });

  const invalidNames = ['', ' ', 'a', '  a  ', 'M'];

  it.each(invalidNames)('rejects %j', (name) => {
    expect(cropCatalogFormSchema.safeParse({ name }).success).toBe(false);
  });
});
