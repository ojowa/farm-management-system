// Worker Type Definitions

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

export interface CreateWorkerRequest {
  farmId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  phone?: string;
  position: string;
  department?: string;
  hireDate?: string;
}

export interface UpdateWorkerRequest {
  farmId?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  hireDate?: string;
  status?: string;
}

