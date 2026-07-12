import { BaseDomainEvent } from '@farm/domain-core';

export class ReportGenerated extends BaseDomainEvent {
  readonly eventName = 'ReportGenerated';
}

export class ReportScheduled extends BaseDomainEvent {
  readonly eventName = 'ReportScheduled';
}

export class ReportSent extends BaseDomainEvent {
  readonly eventName = 'ReportSent';
}
