/**
 * Crop module — canonical home for crops, cycles, stages, irrigation,
 * pest/disease and yield. Mirrors the admin portal's `crop` plan-module.
 *
 * Single facade over the three data layers a screen might use:
 *   - online API   (`cropsAPI`, `cropStagesAPI`, `irrigationAPI`, …)
 *   - offline API  (`offlineCropsAPI`, queues writes when disconnected)
 *   - RTK Query   (`cropsApi` + its generated hooks)
 */
export { cropsAPI, cropStagesAPI, irrigationAPI, pestDiseaseAPI, yieldAPI } from '../../services/api';
export { offlineCropsAPI } from '../../services/offlineApi';
export {
  cropsApi,
  useListCropsQuery,
  useGetCropQuery,
  useCreateCropMutation,
  useUpdateCropMutation,
  useDeleteCropMutation,
} from '../../store/api';
export type {
  Crop,
  CreateCropRequest,
  CropCycle,
  CreateCropCycleRequest,
  CropStage,
  CropCycleStatus,
} from '../../services/types';
