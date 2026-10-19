/**
 * Aquaculture module — ponds plus the full pond lifecycle (stocking,
 * feeding, water quality, harvest). Mirrors the admin portal's `aquaculture`
 * plan-module. Previously had no owning module (screens imported the raw
 * service directly); this barrel makes it a first-class module.
 */
export { aquacultureAPI } from '../../services/api';
export type {
  Pond,
  CreatePondRequest,
  UpdatePondRequest,
  PondType,
  PondStatus,
  PondStockingStatus,
  PondStocking,
  CreatePondStockingRequest,
  UpdatePondStockingRequest,
  PondFeeding,
  CreatePondFeedingRequest,
  PondWaterQuality,
  CreatePondWaterQualityRequest,
  PondHarvest,
  CreatePondHarvestRequest,
} from '../../services/types';
