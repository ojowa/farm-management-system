import { prisma } from '@farm/database';
import { Request } from 'express';

export interface AuditLogData {
  userId?: string;
  organizationId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown> | undefined;
  ipAddress?: string;
  userAgent?: string;
}

export async function auditLog(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId || null,
        organizationId: data.organizationId || null,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId || null,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  } catch (err) {
    console.error('[AuditLog] Failed to write audit log:', err);
  }
}

export function extractAuditContext(req: Request): { ipAddress: string; userAgent: string } {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket.remoteAddress ||
    'unknown';
  const ua = req.headers['user-agent'] || 'unknown';
  return { ipAddress: ip, userAgent: ua };
}

/** Convenience: log and return audit context from request */
export function auditFromReq(req: Request) {
  return extractAuditContext(req);
}
