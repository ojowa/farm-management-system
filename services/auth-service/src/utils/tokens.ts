import crypto from 'crypto';

const ALGORITHM = 'sha256';

/** Hash a refresh token for secure storage (never store plaintext) */
export function hashToken(token: string): string {
  return crypto.createHash(ALGORITHM).update(token).digest('hex');
}

/** Generate a cryptographically secure random token */
export function generateSecureToken(bytes: number = 40): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/** Generate a JWT ID (jti) */
export function generateJTI(): string {
  return crypto.randomUUID();
}

/** Generate a verification token for email/password reset */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
