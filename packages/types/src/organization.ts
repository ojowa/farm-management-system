export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  website?: string;
  industry?: string;
  subscriptionPlan: 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
  subscriptionStatus: 'ACTIVE' | 'INACTIVE' | 'TRIAL' | 'PAST_DUE';
  settings: OrganizationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationSettings {
  currency: string;
  timezone: string;
  language: string;
  measurementUnit: 'METRIC' | 'IMPERIAL';
  dateFormat: string;
}

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  adminEmail: string;
  subscriptionPlan?: string;
}
