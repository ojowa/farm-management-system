// Placeholder for Livestock types
export interface Livestock {
  id: string;
  farmId: string;
  species: string;
  breed?: string;
  gender: 'MALE' | 'FEMALE';
  birthDate: Date;
  status: 'HEALTHY' | 'SICK' | 'SOLD' | 'DECEASED';
  createdAt: Date;
  updatedAt: Date;
}
