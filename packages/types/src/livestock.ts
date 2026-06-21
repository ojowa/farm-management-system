export interface Livestock {
  id: string;
  farmId: string;
  species: string;
  breed?: string | null;
  gender: 'MALE' | 'FEMALE';
  birthDate: Date;
  status: 'HEALTHY' | 'SICK' | 'SOLD' | 'DECEASED';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLivestockRequest {
  farmId: string;
  species: string;
  breed?: string | null;
  gender: 'MALE' | 'FEMALE';
  birthDate: Date | string;
  status: 'HEALTHY' | 'SICK' | 'SOLD' | 'DECEASED';
}

export interface UpdateLivestockRequest {
  farmId?: string;
  species?: string;
  breed?: string | null;
  gender?: 'MALE' | 'FEMALE';
  birthDate?: Date | string;
  status?: 'HEALTHY' | 'SICK' | 'SOLD' | 'DECEASED';
}
