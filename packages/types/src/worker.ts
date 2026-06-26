// Worker Type Definitions

export interface Worker {
  id: string;
  farmId: string;
  name: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkerRequest {
  farmId: string;
  name: string;
  role: string;
}

export interface UpdateWorkerRequest {
  farmId?: string;
  name?: string;
  role?: string;
}

