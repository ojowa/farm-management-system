// Placeholder for Crop types
export interface Crop {
  id: string;
  farmId: string;
  name: string;
  variety?: string;
  plantingDate: Date;
  expectedHarvestDate?: Date;
  status: 'PLANTED' | 'GROWING' | 'HARVESTED' | 'FAILED';
  createdAt: Date;
  updatedAt: Date;
}
