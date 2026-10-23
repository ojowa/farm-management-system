export interface Crop {
  id: string;
  name: string;
  // The shared catalog has no organization column; present only when the
  // Prisma row happens to carry it (never for Crop).
  organizationId?: string;
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
  health?: number;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
