export interface Crop {
  id: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CropCycle {
  id: string;
  organizationId?: string;
  fieldId: string;
  cropId: string;
  plantingDate: Date;
  harvestDate: Date | null;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
