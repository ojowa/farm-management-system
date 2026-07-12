import { AggregateRoot, Id } from '@farm/domain-core';
import { AuditLogCreated } from '../events/platform-events';

export interface AuditLogProps {
  userId: string;
  organizationId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
}

export class AuditLog extends AggregateRoot<AuditLogProps> {
  private constructor(id: Id, props: AuditLogProps) {
    super(id, props);
  }

  static create(
    id: Id,
    props: AuditLogProps
  ): AuditLog {
    if (!props.userId || props.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }
    if (!props.organizationId || props.organizationId.trim().length === 0) {
      throw new Error('Organization ID is required');
    }
    if (!props.action || props.action.trim().length === 0) {
      throw new Error('Action is required');
    }
    if (!props.entity || props.entity.trim().length === 0) {
      throw new Error('Entity is required');
    }
    if (!props.entityId || props.entityId.trim().length === 0) {
      throw new Error('Entity ID is required');
    }

    const auditLog = new AuditLog(id, {
      userId: props.userId,
      organizationId: props.organizationId,
      action: props.action.trim(),
      entity: props.entity.trim(),
      entityId: props.entityId,
      metadata: props.metadata ?? {},
      ipAddress: props.ipAddress ?? null,
      userAgent: props.userAgent ?? null,
    });

    auditLog.addDomainEvent(
      new AuditLogCreated(id.toString(), {
        userId: props.userId,
        organizationId: props.organizationId,
        action: props.action,
        entity: props.entity,
        entityId: props.entityId,
      })
    );

    return auditLog;
  }

  static reconstitute(id: Id, props: AuditLogProps): AuditLog {
    return new AuditLog(id, props);
  }

  get userId(): string {
    return this.props.userId;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get action(): string {
    return this.props.action;
  }

  get entity(): string {
    return this.props.entity;
  }

  get entityId(): string {
    return this.props.entityId;
  }

  get metadata(): Record<string, unknown> {
    return this.props.metadata;
  }

  get ipAddress(): string | null {
    return this.props.ipAddress;
  }

  get userAgent(): string | null {
    return this.props.userAgent;
  }
}
