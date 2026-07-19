import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Single shared env loader for the whole monorepo.
 *
 * Reads the root `.env` (repo root) and populates `process.env` for any keys
 * not already set. Safe to call multiple times (idempotent) and from any
 * working directory — it resolves the path relative to this file, which always
 * lives at `packages/env/dist/index.js` (or `src/index.ts` under ts-node),
 * i.e. three levels up from `packages/env`.
 */
let loaded = false;

export function loadEnv(): void {
  if (loaded) return;
  loaded = true;

  const candidates = [
    join(__dirname, '..', '..', '..', '.env'),
    join(process.cwd(), '.env'),
  ];

  let content: string | null = null;
  for (const p of candidates) {
    try {
      content = readFileSync(p, 'utf-8');
      break;
    } catch {
      continue;
    }
  }
  if (!content) return;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}
