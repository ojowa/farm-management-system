// Inventory Type Definitions

export type InventoryCategory = 'SEED' | 'FERTILIZER' | 'PESTICIDE' | 'FEED' | 'EQUIPMENT' | 'OTHER';

export interface InventoryItem {
  id: string;
  farmId: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInventoryItemRequest {
  farmId: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: string;
}

export interface UpdateInventoryItemRequest {
  farmId?: string;
  name?: string;
  category?: InventoryCategory;
  quantity?: number;
  unit?: string;
}

