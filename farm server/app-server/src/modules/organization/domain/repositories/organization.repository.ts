import { Organization } from '../entities/organization.entity';

export interface SubscriptionPlanInfo {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  price: number;
  currency: string;
  billingCycle: string;
  maxUsers: number;
  maxFarms: number;
  maxStorage: number;
  features: any;
  isActive: boolean;
  sortOrder: number;
}

export interface OrganizationRepository {
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  findAll(): Promise<Organization[]>;
  create(data: Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>): Promise<Organization>;
  update(id: string, data: Partial<Organization>): Promise<Organization>;
  delete(id: string): Promise<void>;
  findDefaultSubscriptionPlan(): Promise<SubscriptionPlanInfo | null>;
  findSubscriptionPlanByName(name: string): Promise<SubscriptionPlanInfo | null>;
  findActiveSubscriptionPlans(): Promise<SubscriptionPlanInfo[]>;
}
