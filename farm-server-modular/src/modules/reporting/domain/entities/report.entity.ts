export interface Report {
  id: string;
  organizationId: string;
  farmId: string;
  title: string;
  status: string;
  parameters: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledReport {
  id: string;
  organizationId: string;
  name: string;
  template: string;
  recipients: string[];
  frequency: string;
  nextSend: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
