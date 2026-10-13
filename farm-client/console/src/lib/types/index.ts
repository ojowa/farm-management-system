export * from './platform-admin';

export interface Farm {
  id: string;
  name: string;
  type: string;
  size?: number;
  unit?: string;
  latitude?: number;
  longitude?: number;
  organizationId: string;
  createdAt?: Date;
  updatedAt?: Date;
}
