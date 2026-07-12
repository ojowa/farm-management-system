import { BaseDomainEvent } from '@farm/domain-core';

export class UserRegistered extends BaseDomainEvent {
  readonly eventName = 'UserRegistered';

  constructor(
    aggregateId: string,
    data?: {
      email?: string;
      organizationId?: string;
      role?: string;
    }
  ) {
    super(aggregateId, data);
  }
}

export class UserLogin extends BaseDomainEvent {
  readonly eventName = 'UserLogin';

  constructor(
    aggregateId: string,
    data?: {
      organizationId?: string;
      ipAddress?: string;
    }
  ) {
    super(aggregateId, data);
  }
}

export class UserLogout extends BaseDomainEvent {
  readonly eventName = 'UserLogout';

  constructor(
    aggregateId: string,
    data?: {
      organizationId?: string;
    }
  ) {
    super(aggregateId, data);
  }
}

export class UserRoleChanged extends BaseDomainEvent {
  readonly eventName = 'UserRoleChanged';

  constructor(
    aggregateId: string,
    data?: {
      previousRole?: string;
      newRole?: string;
      changedBy?: string;
    }
  ) {
    super(aggregateId, data);
  }
}

export class UserOrgSwitched extends BaseDomainEvent {
  readonly eventName = 'UserOrgSwitched';

  constructor(
    aggregateId: string,
    data?: {
      previousOrganizationId?: string;
      newOrganizationId?: string;
    }
  ) {
    super(aggregateId, data);
  }
}

export class User2faEnabled extends BaseDomainEvent {
  readonly eventName = 'User2faEnabled';

  constructor(
    aggregateId: string,
    data?: {
      method?: string;
    }
  ) {
    super(aggregateId, data);
  }
}

export class User2faDisabled extends BaseDomainEvent {
  readonly eventName = 'User2faDisabled';

  constructor(
    aggregateId: string,
    data?: {
      reason?: string;
    }
  ) {
    super(aggregateId, data);
  }
}
