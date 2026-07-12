import { BaseDomainEvent } from '@farm/domain-core';

export class FeatureFlagCreated extends BaseDomainEvent {
  readonly eventName = 'FeatureFlagCreated';

  constructor(
    aggregateId: string,
    data?: {
      key?: string;
      name?: string;
      category?: string;
    }
  ) {
    super(aggregateId, data);
  }
}

export class FeatureFlagToggled extends BaseDomainEvent {
  readonly eventName = 'FeatureFlagToggled';

  constructor(
    aggregateId: string,
    data?: {
      key?: string;
      isEnabled?: boolean;
    }
  ) {
    super(aggregateId, data);
  }
}

export class FeatureFlagUpdated extends BaseDomainEvent {
  readonly eventName = 'FeatureFlagUpdated';

  constructor(
    aggregateId: string,
    data?: {
      key?: string;
      changes?: Record<string, unknown>;
    }
  ) {
    super(aggregateId, data);
  }
}

export class FeatureFlagOverrideCreated extends BaseDomainEvent {
  readonly eventName = 'FeatureFlagOverrideCreated';

  constructor(
    aggregateId: string,
    data?: {
      featureFlagId?: string;
      organizationId?: string;
      isEnabled?: boolean;
    }
  ) {
    super(aggregateId, data);
  }
}

export class FeatureFlagOverrideUpdated extends BaseDomainEvent {
  readonly eventName = 'FeatureFlagOverrideUpdated';

  constructor(
    aggregateId: string,
    data?: {
      featureFlagId?: string;
      organizationId?: string;
      isEnabled?: boolean;
    }
  ) {
    super(aggregateId, data);
  }
}

export class SubscriptionPlanCreated extends BaseDomainEvent {
  readonly eventName = 'SubscriptionPlanCreated';

  constructor(
    aggregateId: string,
    data?: {
      name?: string;
      price?: number;
      currency?: string;
    }
  ) {
    super(aggregateId, data);
  }
}

export class SubscriptionPlanUpdated extends BaseDomainEvent {
  readonly eventName = 'SubscriptionPlanUpdated';

  constructor(
    aggregateId: string,
    data?: {
      name?: string;
      changes?: Record<string, unknown>;
    }
  ) {
    super(aggregateId, data);
  }
}

export class SubscriptionPlanDeactivated extends BaseDomainEvent {
  readonly eventName = 'SubscriptionPlanDeactivated';

  constructor(
    aggregateId: string,
    data?: {
      name?: string;
    }
  ) {
    super(aggregateId, data);
  }
}

export class AuditLogCreated extends BaseDomainEvent {
  readonly eventName = 'AuditLogCreated';

  constructor(
    aggregateId: string,
    data?: {
      userId?: string;
      organizationId?: string;
      action?: string;
      entity?: string;
      entityId?: string;
    }
  ) {
    super(aggregateId, data);
  }
}

export class SystemHealthCreated extends BaseDomainEvent {
  readonly eventName = 'SystemHealthCreated';

  constructor(
    aggregateId: string,
    data?: {
      serviceName?: string;
      status?: string;
    }
  ) {
    super(aggregateId, data);
  }
}

export class SystemHealthUpdated extends BaseDomainEvent {
  readonly eventName = 'SystemHealthUpdated';

  constructor(
    aggregateId: string,
    data?: {
      serviceName?: string;
      status?: string;
      uptime?: number;
    }
  ) {
    super(aggregateId, data);
  }
}

export class BroadcastCreated extends BaseDomainEvent {
  readonly eventName = 'BroadcastCreated';

  constructor(
    aggregateId: string,
    data?: {
      title?: string;
      type?: string;
      createdById?: string;
    }
  ) {
    super(aggregateId, data);
  }
}

export class BroadcastDeactivated extends BaseDomainEvent {
  readonly eventName = 'BroadcastDeactivated';

  constructor(
    aggregateId: string,
    data?: {
      title?: string;
    }
  ) {
    super(aggregateId, data);
  }
}

export class PlatformConfigCreated extends BaseDomainEvent {
  readonly eventName = 'PlatformConfigCreated';

  constructor(
    aggregateId: string,
    data?: {
      key?: string;
      category?: string;
    }
  ) {
    super(aggregateId, data);
  }
}

export class PlatformConfigUpdated extends BaseDomainEvent {
  readonly eventName = 'PlatformConfigUpdated';

  constructor(
    aggregateId: string,
    data?: {
      key?: string;
      previousValue?: string;
      newValue?: string;
    }
  ) {
    super(aggregateId, data);
  }
}
