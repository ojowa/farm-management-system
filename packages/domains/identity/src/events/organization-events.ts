import { BaseDomainEvent } from '@farm/domain-core';

export class OrganizationCreated extends BaseDomainEvent {
  readonly eventName = 'OrganizationCreated';

  constructor(
    aggregateId: string,
    data?: {
      name?: string;
      slug?: string;
      ownerId?: string;
    }
  ) {
    super(aggregateId, data);
  }
}

export class OrganizationSubscriptionChanged extends BaseDomainEvent {
  readonly eventName = 'OrganizationSubscriptionChanged';

  constructor(
    aggregateId: string,
    data?: {
      previousPlan?: string;
      newPlan?: string;
      previousStatus?: string;
      newStatus?: string;
    }
  ) {
    super(aggregateId, data);
  }
}
