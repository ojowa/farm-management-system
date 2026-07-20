export interface RefreshTokenRepository {
  create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    deviceInfo?: string;
  }): Promise<void>;
  findValidByHash(tokenHash: string): Promise<{ id: string; userId: string; revoked: boolean } | null>;
  revoke(id: string, replacedByTokenHash?: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  deleteAllForUser(userId: string): Promise<void>;
  findActiveByUser(userId: string): Promise<Array<{
    id: string;
    deviceInfo: string | null;
    ipAddress: string | null;
    createdAt: Date;
    expiresAt: Date;
  }>>;
}
