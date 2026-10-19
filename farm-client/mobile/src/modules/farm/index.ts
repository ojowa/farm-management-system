/**
 * Farm module — canonical home for everything farm/field related.
 * Mirrors the admin portal's `farm` plan-module (Sidebar: "Farms").
 *
 * Single facade over the three data layers a screen might use:
 *   - online API   (`farmsAPI`, `fieldsAPI`)
 *   - offline API  (`offlineFarmsAPI`, queues writes when disconnected)
 *   - RTK Query   (`farmsApi` + its generated hooks)
 */
export { farmsAPI, fieldsAPI } from '../../services/api';
export { offlineFarmsAPI } from '../../services/offlineApi';
export {
  farmsApi,
  useListFarmsQuery,
  useGetFarmQuery,
  useCreateFarmMutation,
  useUpdateFarmMutation,
  useDeleteFarmMutation,
} from '../../store/api';
export type {
  Farm,
  CreateFarmRequest,
  UpdateFarmRequest,
  Field,
  CreateFieldRequest,
  FarmType,
} from '../../services/types';
