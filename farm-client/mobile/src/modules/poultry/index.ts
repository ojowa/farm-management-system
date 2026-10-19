/**
 * Poultry module — flocks, houses, pens, breeds and the daily record types
 * (feeding, vaccination, mortality, medication, egg production).
 * Mirrors the admin portal's `poultry` plan-module.
 *
 * Single facade over the data layers a screen might use:
 *   - online API   (`poultryAPI`, `poultryHousesAPI`, `pensAPI`, …)
 *   - offline API  (`offlinePoultryAPI`, queues writes when disconnected)
 */
export {
  poultryAPI,
  poultryHousesAPI,
  pensAPI,
  breedsAPI,
  feedingRecordsAPI,
  vaccinationRecordsAPI,
  mortalityRecordsAPI,
  medicationAPI,
  eggProductionAPI,
} from '../../services/api';
export { offlinePoultryAPI } from '../../services/offlineApi';
export type {
  Flock,
  CreateFlockRequest,
  FlockStatus,
  PoultryHouse,
  Pen,
  Breed,
  FeedingRecord,
  VaccinationRecord,
  MortalityRecord,
  Medication,
} from '../../services/types';
