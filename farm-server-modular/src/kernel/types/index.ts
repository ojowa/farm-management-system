export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  adminEmail: string;
  subscriptionPlan?: string;
}
