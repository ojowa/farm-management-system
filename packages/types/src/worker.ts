// Placeholder for Worker types
export interface Worker {
  id: string;
  farmId: string;
  fullName: string;
  position: string;
  status: 'ACTIVE' | 'INACTIVE';
  hireDate: Date;
  createdAt: Date;
  updatedAt: Date;
}
