export const FARM_TYPES = ['CROP', 'LIVESTOCK', 'POULTRY', 'DAIRY', 'AQUACULTURE'] as const;
export type FarmType = typeof FARM_TYPES[number];

export interface Farm {
  id: string;
  organizationId: string;
  name: string;
  farmType: FarmType;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFarmRequest {
  organizationId: string;
  name: string;
  farmType: FarmType;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface UpdateFarmRequest {
  organizationId?: string;
  name?: string;
  farmType?: FarmType;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Field {
  id: string;
  farmId: string;
  name: string;
  size: number;
}

export interface CreateFieldRequest {
  farmId: string;
  name: string;
  size: number;
}

export interface UpdateFieldRequest {
  farmId?: string;
  name?: string;
  size?: number;
}
