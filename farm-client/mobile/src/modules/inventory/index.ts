/**
 * Inventory module — stock levels, low-stock alerts and equipment (assets).
 * Mirrors the admin portal's `inventory` plan-module (Sidebar: "Inventory",
 * "Equipment").
 */
export { inventoryAPI, equipmentAPI } from '../../services/api';
export type { Equipment, CreateEquipmentRequest } from '../../services/types';
