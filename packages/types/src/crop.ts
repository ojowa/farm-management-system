export interface Crop {
  id: string;
  name: string;
}

export interface CropCycle {
  id: string;
  fieldId: string;
  cropId: string;
  plantingDate: Date;
  harvestDate?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateCropRequest {
  name: string;
}

export interface UpdateCropRequest {
  name?: string;
}

export interface CreateCropCycleRequest {
  fieldId: string;
  cropId: string;
  plantingDate: Date | string;
  harvestDate?: Date | string | null;
}

export interface UpdateCropCycleRequest {
  fieldId?: string;
  cropId?: string;
  plantingDate?: Date | string;
  harvestDate?: Date | string | null;
}
