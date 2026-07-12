import { AggregateRoot, Id } from '@farm/domain-core';
import { ReportTemplate } from '../value-objects/report-template.value-object';
import { ReportFrequency } from '../value-objects/report-frequency.value-object';
import { ReportScheduled, ReportSent } from '../events/reporting-events';

export interface ScheduledReportProps {
  organizationId: string;
  name: string;
  template: ReportTemplate;
  recipients: string[];
  frequency: ReportFrequency;
  lastSent?: Date;
  nextSend?: Date;
  isActive: boolean;
  createdById?: string;
  createdByName?: string;
}

export class ScheduledReport extends AggregateRoot<ScheduledReportProps> {
  private constructor(id: Id, props: ScheduledReportProps) {
    super(id, props);
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get name(): string {
    return this.props.name;
  }

  get template(): ReportTemplate {
    return this.props.template;
  }

  get recipients(): string[] {
    return this.props.recipients;
  }

  get frequency(): ReportFrequency {
    return this.props.frequency;
  }

  get lastSent(): Date | undefined {
    return this.props.lastSent;
  }

  get nextSend(): Date | undefined {
    return this.props.nextSend;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  static create(id: Id, props: ScheduledReportProps): ScheduledReport {
    const report = new ScheduledReport(id, props);
    report.addDomainEvent(new ReportScheduled(id.toString(), { name: props.name }));
    return report;
  }

  update(props: Partial<ScheduledReportProps>): void {
    Object.assign(this.props, props);
  }

  deactivate(): void {
    this.props.isActive = false;
  }

  recordSent(): void {
    this.props.lastSent = new Date();
    this.props.isActive = true;
    this.addDomainEvent(new ReportSent(this.id.toString(), { name: this.props.name }));
  }
}
