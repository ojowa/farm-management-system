import { createFarmManagementClient, FarmManagementClient } from '@farm/api-client';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

const client = createFarmManagementClient({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

// ── Token refresh setup for web (cookie-based) ───────────────────
// For cookie-based auth, the server handles token rotation via Set-Cookie
// headers. The client just needs to call /auth/refresh on 401 and the
// server will issue new cookies.
{
  let isRefreshing = false;
  let failedQueue: Array<{ resolve: (v?: unknown) => void; reject: (e?: unknown) => void }> = [];

  const processQueue = (error: unknown) => {
    failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
    failedQueue = [];
  };

  client.client.interceptors.response.use(
    (res) => res,
    async (error) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry) {
        // Don't try to refresh if we're already on login or if this IS the refresh endpoint
        const isRefreshCall = originalRequest.url?.includes('/auth/refresh');
        const isLoginPath = typeof window !== 'undefined' &&
          ['/login', '/register'].includes(window.location.pathname);

        if (isRefreshCall || isLoginPath) {
          return Promise.reject(error);
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(() => client.client(originalRequest))
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;
        try {
          // Call refresh — the server will set new httpOnly cookies
          await axios.post('/auth/refresh', {}, { withCredentials: true });
          processQueue(null);
          return client.client(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError);
          // Redirect to login on refresh failure
          if (typeof window !== 'undefined' && !['/login', '/register'].includes(window.location.pathname)) {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
      return Promise.reject(error);
    }
  );
}

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
export const pensAPI = {
  list: (params?: any) => apiClient.get('/poultry/pens', { params }),
  get: (id: string) => apiClient.get(`/poultry/pens/${id}`),
  create: (data: any) => apiClient.post('/poultry/pens', data),
  update: (id: string, data: any) => apiClient.put(`/poultry/pens/${id}`, data),
  delete: (id: string) => apiClient.delete(`/poultry/pens/${id}`),
};
export const breedsAPI = {
  list: (params?: any) => apiClient.get('/poultry/breeds', { params }),
  get: (id: string) => apiClient.get(`/poultry/breeds/${id}`),
  create: (data: any) => apiClient.post('/poultry/breeds', data),
  update: (id: string, data: any) => apiClient.put(`/poultry/breeds/${id}`, data),
  delete: (id: string) => apiClient.delete(`/poultry/breeds/${id}`),
};
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
