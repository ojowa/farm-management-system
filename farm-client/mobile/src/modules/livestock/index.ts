/**
 * Livestock module — canonical home for animals, health records, breeding
 * and weight tracking. Mirrors the admin portal's `livestock` plan-module.
 *
 * Single facade over the three data layers a screen might use:
 *   - online API   (`livestockAPI`, `livestockHealthAPI`, `breedingAPI`, `weightAPI`)
 *   - offline API  (`offlineLivestockAPI`, queues writes when disconnected)
 *   - RTK Query   (`livestockApi` + its generated hooks)
 */
export { livestockAPI, livestockHealthAPI, breedingAPI, weightAPI } from '../../services/api';
export { offlineLivestockAPI } from '../../services/offlineApi';
export {
  livestockApi,
  useListLivestockQuery,
  useGetLivestockQuery,
  useCreateLivestockMutation,
  useUpdateLivestockMutation,
  useDeleteLivestockMutation,
} from '../../store/api';
export type {
  Livestock,
  CreateLivestockRequest,
  UpdateLivestockRequest,
  LivestockStatus,
  Gender,
  HealthRecord,
  VaccinationSchedule,
  BreedingRecord,
  WeightRecord,
} from '../../services/types';
