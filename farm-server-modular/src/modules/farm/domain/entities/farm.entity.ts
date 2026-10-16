export interface Farm {
  id: string;
  organizationId: string;
  name: string;
  farmType: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  size: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Field {
  id: string;
  farmId: string;
  name: string;
  size: number;
}
