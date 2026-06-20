// Placeholder for Inventory types
export interface InventoryItem {
  id: string;
  farmId: string;
  name: string;
  category: 'SEED' | 'FERTILIZER' | 'PESTICIDE' | 'FEED' | 'EQUIPMENT' | 'OTHER';
  quantity: number;
  unit: string;
  minThreshold?: number;
  createdAt: Date;
  updatedAt: Date;
}
