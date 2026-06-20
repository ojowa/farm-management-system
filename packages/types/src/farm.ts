// Placeholder for Farm types
export interface Farm {
  id: string;
  organizationId: string;
  name: string;
  location: string;
  size: number;
  sizeUnit: 'ACRE' | 'HECTARE';
  type: 'CROP' | 'LIVESTOCK' | 'POULTRY' | 'MIXED';
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}
