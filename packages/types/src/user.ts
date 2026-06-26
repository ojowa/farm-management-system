export type UserRole =
  | 'SUPER_ADMIN'
  | 'SUPPORT_ADMIN'
  | 'ORGANIZATION_OWNER'
  | 'FARM_MANAGER'
  | 'ACCOUNTANT'
  | 'SUPERVISOR'
  | 'VETERINARIAN'
  | 'WORKER';

export interface User {
  id: string;
  email: string;
  fullName?: string | null;
  firstName?: string;
  lastName?: string;
  organizationId: string;
  role: UserRole | string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
