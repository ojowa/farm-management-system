export interface Worker {
  id: string;
  organizationId?: string;
  farmId: string;
  userId?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  position: string;
  department?: string | null;
  hireDate?: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
