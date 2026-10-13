import { AxiosInstance } from 'axios';
import { createAPIClient, setupTokenRefresh, APIClientConfig } from './core';

// ── Identity & Access Context ─────────────────────────────────────
import { createAuthAPI, createRolesAPI, createOrgAdminAPI, createAdminAPI, AuthAPI, RolesAPI, OrgAdminAPI, AdminAPI } from './contexts/identity';

// ── Farm Management Context ──────────────────────────────────────
import { createFarmsAPI, FarmsAPI } from './contexts/farm';

// ── Crop Management Context ──────────────────────────────────────
import { createCropsAPI, createCropStagesAPI, createYieldAPI, createIrrigationAPI, createPestDiseaseAPI, CropsAPI, CropStagesAPI, YieldAPI, IrrigationAPI, PestDiseaseAPI } from './contexts/crop';

// ── Livestock Management Context ─────────────────────────────────
import { createLivestockAPI, createLivestockHealthAPI, createBreedingAPI, createWeightAPI, LivestockAPI, LivestockHealthAPI, BreedingAPI, WeightAPI } from './contexts/livestock';

// ── Poultry Management Context ───────────────────────────────────
import { createPoultryAPI, createPoultryHousesAPI, createFeedingRecordsAPI, createVaccinationRecordsAPI, createMortalityRecordsAPI, createEggProductionAPI, createMedicationAPI, createPoultrySalesAPI, PoultryAPI, PoultryHousesAPI, FeedingRecordsAPI, VaccinationRecordsAPI, MortalityRecordsAPI, EggProductionAPI, MedicationAPI, PoultrySalesAPI } from './contexts/poultry';

// ── Finance Context ──────────────────────────────────────────────
import { createFinanceAPI, createProfitabilityAPI, createContractsAPI, createMarketplaceAPI, FinanceAPI, ProfitabilityAPI, ContractsAPI, MarketplaceAPI } from './contexts/finance';

// ── HR & Workforce Context ───────────────────────────────────────
import { createWorkersAPI, createTasksAPI, createAttendanceAPI, createRosterAPI, createMessagesAPI, createCorrespondenceAPI, createLeaveAPI, WorkersAPI, TasksAPI, AttendanceAPI, RosterAPI, MessagesAPI, CorrespondenceAPI, LeaveAPI } from './contexts/hr';

// ── Inventory Context ────────────────────────────────────────────
import { createInventoryAPI, createLowStockAPI, createEquipmentAPI, InventoryAPI, LowStockAPI, EquipmentAPI } from './contexts/inventory';

// ── Reporting Context ────────────────────────────────────────────
import { createReportsAPI, createScheduledReportsAPI, ReportsAPI, ScheduledReportsAPI } from './contexts/reporting';

// ── Platform Context ─────────────────────────────────────────────
import { createWeatherAPI, createDocumentsAPI, WeatherAPI, DocumentsAPI } from './contexts/platform';

export type {
  AuthAPI, RolesAPI, OrgAdminAPI, AdminAPI,
  FarmsAPI,
  CropsAPI, CropStagesAPI, YieldAPI, IrrigationAPI, PestDiseaseAPI,
  LivestockAPI, LivestockHealthAPI, BreedingAPI, WeightAPI,
  PoultryAPI, PoultryHousesAPI, FeedingRecordsAPI, VaccinationRecordsAPI, MortalityRecordsAPI, EggProductionAPI, MedicationAPI, PoultrySalesAPI,
  FinanceAPI, ProfitabilityAPI, ContractsAPI, MarketplaceAPI,
  WorkersAPI, TasksAPI, AttendanceAPI, RosterAPI, MessagesAPI, CorrespondenceAPI, LeaveAPI,
  InventoryAPI, LowStockAPI, EquipmentAPI,
  ReportsAPI, ScheduledReportsAPI,
  WeatherAPI, DocumentsAPI,
  APIClientConfig,
};

export interface FarmManagementClient {
  client: AxiosInstance;
  auth: AuthAPI;
  roles: RolesAPI;
  orgAdmin: OrgAdminAPI;
  admin: AdminAPI;
  farms: FarmsAPI;
  crops: CropsAPI;
  cropStages: CropStagesAPI;
  yield: YieldAPI;
  irrigation: IrrigationAPI;
  pestDisease: PestDiseaseAPI;
  livestock: LivestockAPI;
  livestockHealth: LivestockHealthAPI;
  breeding: BreedingAPI;
  weight: WeightAPI;
  poultry: PoultryAPI;
  poultryHouses: PoultryHousesAPI;
  feedingRecords: FeedingRecordsAPI;
  vaccinationRecords: VaccinationRecordsAPI;
  mortalityRecords: MortalityRecordsAPI;
  eggProduction: EggProductionAPI;
  medication: MedicationAPI;
  poultrySales: PoultrySalesAPI;
  finance: FinanceAPI;
  profitability: ProfitabilityAPI;
  contracts: ContractsAPI;
  marketplace: MarketplaceAPI;
  workers: WorkersAPI;
  tasks: TasksAPI;
  attendance: AttendanceAPI;
  roster: RosterAPI;
  messages: MessagesAPI;
  correspondence: CorrespondenceAPI;
  leave: LeaveAPI;
  inventory: InventoryAPI;
  lowStock: LowStockAPI;
  equipment: EquipmentAPI;
  reports: ReportsAPI;
  scheduledReports: ScheduledReportsAPI;
  weather: WeatherAPI;
  documents: DocumentsAPI;
}

export function createFarmManagementClient(config: APIClientConfig = {}): FarmManagementClient {
  const client = createAPIClient(config);

  return {
    client,
    auth: createAuthAPI(client),
    roles: createRolesAPI(client),
    orgAdmin: createOrgAdminAPI(client),
    admin: createAdminAPI(client),
    farms: createFarmsAPI(client),
    crops: createCropsAPI(client),
    cropStages: createCropStagesAPI(client),
    yield: createYieldAPI(client),
    irrigation: createIrrigationAPI(client),
    pestDisease: createPestDiseaseAPI(client),
    livestock: createLivestockAPI(client),
    livestockHealth: createLivestockHealthAPI(client),
    breeding: createBreedingAPI(client),
    weight: createWeightAPI(client),
    poultry: createPoultryAPI(client),
    poultryHouses: createPoultryHousesAPI(client),
    feedingRecords: createFeedingRecordsAPI(client),
    vaccinationRecords: createVaccinationRecordsAPI(client),
    mortalityRecords: createMortalityRecordsAPI(client),
    eggProduction: createEggProductionAPI(client),
    medication: createMedicationAPI(client),
    poultrySales: createPoultrySalesAPI(client),
    finance: createFinanceAPI(client),
    profitability: createProfitabilityAPI(client),
    contracts: createContractsAPI(client),
    marketplace: createMarketplaceAPI(client),
    workers: createWorkersAPI(client),
    tasks: createTasksAPI(client),
    attendance: createAttendanceAPI(client),
    roster: createRosterAPI(client),
    messages: createMessagesAPI(client),
    correspondence: createCorrespondenceAPI(client),
    leave: createLeaveAPI(client),
    inventory: createInventoryAPI(client),
    lowStock: createLowStockAPI(client),
    equipment: createEquipmentAPI(client),
    reports: createReportsAPI(client),
    scheduledReports: createScheduledReportsAPI(client),
    weather: createWeatherAPI(client),
    documents: createDocumentsAPI(client),
  };
}

export { createAPIClient, setupTokenRefresh };
