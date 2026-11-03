export interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  currency: string;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
