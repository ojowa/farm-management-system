import { AggregateRoot, Id } from '@farm/domain-core';
import { HealthStatus } from '../value-objects/health-status.value-object';
import { SystemHealthCreated, SystemHealthUpdated } from '../events/platform-events';

export interface SystemHealthProps {
  serviceName: string;
  status: HealthStatus;
  uptime: number;
  memoryUsage: number | null;
  lastCheck: Date;
  metadata: Record<string, unknown>;
}

export class SystemHealth extends AggregateRoot<SystemHealthProps> {
  private constructor(id: Id, props: SystemHealthProps) {
    super(id, props);
  }

  static create(
    id: Id,
    props: Omit<SystemHealthProps, 'lastCheck'> & { lastCheck?: Date }
  ): SystemHealth {
    if (!props.serviceName || props.serviceName.trim().length === 0) {
      throw new Error('Service name is required');
    }
    if (!Object.values(HealthStatus).includes(props.status)) {
      throw new Error('Invalid health status');
    }

    const systemHealth = new SystemHealth(id, {
      serviceName: props.serviceName.trim(),
      status: props.status,
      uptime: props.uptime,
      memoryUsage: props.memoryUsage ?? null,
      lastCheck: props.lastCheck ?? new Date(),
      metadata: props.metadata ?? {},
    });

    systemHealth.addDomainEvent(
      new SystemHealthCreated(id.toString(), {
        serviceName: props.serviceName,
        status: props.status,
      })
    );

    return systemHealth;
  }

  static reconstitute(id: Id, props: SystemHealthProps): SystemHealth {
    return new SystemHealth(id, props);
  }

  get serviceName(): string {
    return this.props.serviceName;
  }

  get status(): HealthStatus {
    return this.props.status;
  }

  get uptime(): number {
    return this.props.uptime;
  }

  get memoryUsage(): number | null {
    return this.props.memoryUsage;
  }

  get lastCheck(): Date {
    return this.props.lastCheck;
  }

  get metadata(): Record<string, unknown> {
    return this.props.metadata;
  }

  update(data: {
    status?: HealthStatus;
    uptime?: number;
    memoryUsage?: number | null;
    metadata?: Record<string, unknown>;
  }): void {
    if (data.status !== undefined) {
      if (!Object.values(HealthStatus).includes(data.status)) {
        throw new Error('Invalid health status');
      }
      this.props.status = data.status;
    }
    if (data.uptime !== undefined) {
      this.props.uptime = data.uptime;
    }
    if (data.memoryUsage !== undefined) {
      this.props.memoryUsage = data.memoryUsage;
    }
    if (data.metadata !== undefined) {
      this.props.metadata = data.metadata;
    }
    this.props.lastCheck = new Date();

    this.addDomainEvent(
      new SystemHealthUpdated(this.id.toString(), {
        serviceName: this.props.serviceName,
        status: this.props.status,
        uptime: this.props.uptime,
      })
    );
  }
}
