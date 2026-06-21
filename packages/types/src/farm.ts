export interface Farm {
  id: string;
  organizationId: string;
  name: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFarmRequest {
  organizationId: string;
  name: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface UpdateFarmRequest {
  organizationId?: string;
  name?: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}
