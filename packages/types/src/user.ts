// Placeholder for User types
export interface User {
  id: string;
  email: string;
  fullName: string;
  organizationId: string;
  role: 'ADMIN' | 'MANAGER' | 'WORKER';
  createdAt: Date;
  updatedAt: Date;
}
