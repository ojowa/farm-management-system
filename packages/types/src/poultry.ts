// Placeholder for Poultry types
export interface PoultryBatch {
  id: string;
  farmId: string;
  type: 'BROILER' | 'LAYER';
  quantity: number;
  arrivalDate: Date;
  status: 'ACTIVE' | 'SOLD' | 'DECEASED';
  createdAt: Date;
  updatedAt: Date;
}
