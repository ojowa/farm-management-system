import path from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * Prisma config for the modular monolith — the schema, migrations and seed
 * all live in `prisma/` (previously a separate @farm/database workspace).
 */
export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  seed: 'npx tsx prisma/seed.ts',
});