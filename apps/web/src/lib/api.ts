import { createFarmManagementClient, setupTokenRefresh, FarmManagementClient } from '@farm/api-client';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const client = createFarmManagementClient({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

// ── Token refresh setup for web (cookie-based) ───────────────────
setupTokenRefresh(
  client.client,
  () => null,
  () => {},
  () => {},
  () => {
    const publicPaths = ['/', '/login', '/register'];
    if (typeof window !== 'undefined' && !publicPaths.includes(window.location.pathname)) {
      window.location.href = '/login';
    }
  },
);

export const apiClient = client.client;

// ── Export domain APIs ───────────────────────────────────────────
export const authAPI = client.auth;
export const rolesAPI = client.roles;
export const orgAdminAPI = client.orgAdmin;
export const adminAPI = client.admin;

export const farmsAPI = client.farms;
export const cropsAPI = client.crops;
export const cropStagesAPI = client.cropStages;
export const yieldAPI = client.yield;
export const irrigationAPI = client.irrigation;
export const pestDiseaseAPI = client.pestDisease;

export const livestockAPI = client.livestock;
export const livestockHealthAPI = client.livestockHealth;
export const breedingAPI = client.breeding;
export const weightAPI = client.weight;

export const poultryAPI = client.poultry;
export const poultryHousesAPI = client.poultryHouses;
export const pensAPI = { list: client.poultry.listPens, get: async () => ({ data: {} }), create: async () => ({ data: {} }), update: async () => ({ data: {} }), delete: async () => ({}) };
export const breedsAPI = { list: client.poultry.listBreeds, get: async () => ({ data: {} }), create: async () => ({ data: {} }), update: async () => ({ data: {} }), delete: async () => ({}) };
export const flocksAPI = client.poultry;
export const feedingRecordsAPI = client.feedingRecords;
export const vaccinationRecordsAPI = client.vaccinationRecords;
export const mortalityRecordsAPI = client.mortalityRecords;
export const eggProductionAPI = client.eggProduction;
export const medicationAPI = client.medication;
export const poultrySalesAPI = client.poultrySales;

export const financeAPI = client.finance;
export const profitabilityAPI = client.profitability;
export const contractsAPI = client.contracts;
export const marketplaceAPI = client.marketplace;

export const workersAPI = client.workers;
export const tasksAPI = client.tasks;
export const attendanceAPI = client.attendance;
export const rosterAPI = client.roster;
export const messagesAPI = client.messages;
export const correspondenceAPI = client.correspondence;

export const inventoryAPI = client.inventory;
export const lowStockAPI = client.lowStock;
export const equipmentAPI = client.equipment;

export const reportsAPI = client.reports;
export const scheduledReportsAPI = client.scheduledReports;

export const weatherAPI = client.weather;
export const documentsAPI = client.documents;

// ── Settings (backward compatibility) ────────────────────────────
export const settingsAPI = authAPI;
