import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Shared env loader for farm-server.
 *
 * Reads `.env` files and populates `process.env` for any keys
 * not already set. Safe to call multiple times (idempotent) and from any
 * working directory.
 *
 * Resolution order (first file found wins):
 *   1. <farm-server-root>/.env          (the server's own .env)
 *   2. <repo-root>/.env                 (legacy monorepo root .env)
 *   3. <cwd>/.env                       (process.cwd fallback)
 */
let loaded = false;

export function loadEnv(): void {
  if (loaded) return;
  loaded = true;

  const candidates = [
    // farm-server/.env  (packages/server/env/src -> ../../..)
    join(__dirname, '..', '..', '..', '.env'),
    // FMS repo root .env  (packages/server/env/src -> ../../../..)
    join(__dirname, '..', '..', '..', '..', '.env'),
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
    let val = trimmed.slice(idx + 1).trim();
    // Strip surrounding single/double quotes (dotenv behavior).
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}
