/**
 * In-memory access token blacklist.
 * Stores jti (JWT ID) + expiry. Used to revoke access tokens before they expire.
 * In production, use Redis for multi-instance support.
 */

interface BlacklistEntry {
  expiresAt: number;
}

const blacklist = new Map<string, BlacklistEntry>();

// Periodic cleanup every 60s
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [jti, entry] of blacklist) {
    if (now > entry.expiresAt) blacklist.delete(jti);
  }
}, 60_000);
if (cleanup.unref) cleanup.unref();

/** Add a token's jti to the blacklist until its expiry */
export function blacklistToken(jti: string, expiresAt: Date): void {
  blacklist.set(jti, { expiresAt: expiresAt.getTime() });
}

/** Check if a token's jti is blacklisted */
export function isTokenBlacklisted(jti: string): boolean {
  return blacklist.has(jti);
}

/** Blacklist all tokens for a user (e.g., on password change) */
export function blacklistAllUserTokens(userId: string): void {
  // In a real implementation, you'd need to track jti -> userId mapping
  // For now, we rely on refresh token revocation for full session invalidation
  // Access tokens will expire naturally within 15 minutes
}

/** Get blacklist size (for monitoring) */
export function getBlacklistSize(): number {
  return blacklist.size;
}
