export interface Crop {
  id: string;
  name: string;
  // Owning organization — every crop belongs to exactly one org (per-tenant
  // vocabulary, backfilled from the old global catalog in the migration).
  organizationId: string;
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
  // Denormalized names populated by the repository for the clients (calendar
  // and list/detail screens render crop/field/farm names directly).
  cropName?: string | null;
  fieldName?: string | null;
  farmName?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}
