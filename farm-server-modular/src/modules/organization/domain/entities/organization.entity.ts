export interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
