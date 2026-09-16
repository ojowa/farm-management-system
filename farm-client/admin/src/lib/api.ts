import { createFarmManagementClient, FarmManagementClient, APIClientConfig } from '@farm/api-client';
import axios from 'axios';

const config: APIClientConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_URL!,
  timeout: 15000,
  withCredentials: true,
};

const client: FarmManagementClient = createFarmManagementClient(config);

// ── Token refresh setup (cookie-based auth) ────────────────────
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
          await axios.post('/auth/refresh', {}, { withCredentials: true });
          processQueue(null);
          return client.client(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError);
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

// ── Re-export standard modules from @farm/api-client ───────
export const farmsAPI = client.farms;
export const cropsAPI = client.crops;
export const livestockAPI = client.livestock;
export const poultryAPI = client.poultry;
export const inventoryAPI = client.inventory;
export const workersAPI = client.workers;
export const financeAPI = client.finance;
export const tasksAPI = client.tasks;
export const attendanceAPI = client.attendance;
export const rosterAPI = client.roster;
export const messagesAPI = client.messages;
export const correspondenceAPI = client.correspondence;
export const leaveAPI = client.leave;
export const reportsAPI = client.reports;
export const scheduledReportsAPI = client.scheduledReports;
export const weatherAPI = client.weather;
export const documentsAPI = client.documents;
export const equipmentAPI = client.equipment;
export const contractsAPI = client.contracts;
export const marketplaceAPI = client.marketplace;
export const profitabilityAPI = client.profitability;
export const poultryHousesAPI = client.poultryHouses;
export const feedingRecordsAPI = client.feedingRecords;
export const vaccinationRecordsAPI = client.vaccinationRecords;
export const mortalityRecordsAPI = client.mortalityRecords;
export const eggProductionAPI = client.eggProduction;
export const medicationAPI = client.medication;
export const poultrySalesAPI = client.poultrySales;
export const cropStagesAPI = client.cropStages;
export const livestockHealthAPI = client.livestockHealth;
export const breedingAPI = client.breeding;
export const weightAPI = client.weight;
export const irrigationAPI = client.irrigation;
export const pestDiseaseAPI = client.pestDisease;
export const yieldAPI = client.yield;
export const lowStockAPI = client.lowStock;
export const orgAdminAPI = client.orgAdmin;
export const rolesAPI = client.roles;
export const adminAPI = client.admin;

// ── Auth API (from web) ──────────────────────────────────
export const authAPI = client.auth;

// ── Admin-specific extras (not in @farm/api-client) ────────
export const reportingAPI = reportsAPI;

export const permissionsAPI = {
  list: () => apiClient.get('/permissions'),
};

export const budgetsAPI = {
  list: (params?: any) => apiClient.get('/budgets', { params }),
  get: (id: string) => apiClient.get(`/budgets/${id}`),
  create: (data: any) => apiClient.post('/budgets', data),
  update: (id: string, data: any) => apiClient.put(`/budgets/${id}`, data),
  delete: (id: string) => apiClient.delete(`/budgets/${id}`),
  addCategory: (budgetId: string, data: any) => apiClient.post(`/budgets/${budgetId}/categories`, data),
  updateCategory: (categoryId: string, data: any) => apiClient.put(`/budgets/categories/${categoryId}`, data),
  deleteCategory: (categoryId: string) => apiClient.delete(`/budgets/categories/${categoryId}`),
  refresh: (budgetId: string) => apiClient.post(`/budgets/${budgetId}/refresh`),
};

export const pensAPI = {
  list: (params?: any) => apiClient.get('/pens', { params }),
  get: (id: string) => apiClient.get(`/pens/${id}`),
  create: (data: any) => apiClient.post('/pens', data),
  update: (id: string, data: any) => apiClient.put(`/pens/${id}`, data),
  delete: (id: string) => apiClient.delete(`/pens/${id}`),
};

export const breedsAPI = {
  list: (params?: any) => apiClient.get('/breeds', { params }),
  get: (id: string) => apiClient.get(`/breeds/${id}`),
  create: (data: any) => apiClient.post('/breeds', data),
  update: (id: string, data: any) => apiClient.put(`/breeds/${id}`, data),
  delete: (id: string) => apiClient.delete(`/breeds/${id}`),
};

export const flocksAPI = {
  list: (params?: any) => apiClient.get('/flocks', { params }),
  get: (id: string) => apiClient.get(`/flocks/${id}`),
  create: (data: any) => apiClient.post('/flocks', data),
  update: (id: string, data: any) => apiClient.put(`/flocks/${id}`, data),
  delete: (id: string) => apiClient.delete(`/flocks/${id}`),
};

export const importExportAPI = {
  exportFarms: (format?: string) => apiClient.get('/farms/export/farms', { params: { format }, responseType: format === 'csv' ? 'blob' : undefined }),
  importFarms: (data: any[]) => apiClient.post('/farms/import/farms', { data }),
  exportCrops: (format?: string) => apiClient.get('/farms/export/crops', { params: { format }, responseType: format === 'csv' ? 'blob' : undefined }),
  exportWorkers: (format?: string) => apiClient.get('/farms/export/workers', { params: { format }, responseType: format === 'csv' ? 'blob' : undefined }),
  exportInventory: (format?: string) => apiClient.get('/inventory/export', { params: { format }, responseType: format === 'csv' ? 'blob' : undefined }),
  importInventory: (data: any[]) => apiClient.post('/inventory/import', { data }),
};

export const farmMapAPI = {
  all: () => apiClient.get('/farms/map/all'),
  updateLocation: (id: string, data: { latitude: number; longitude: number }) => apiClient.put(`/farms/map/${id}/location`, data),
};

export const notificationsAPI = {
  list: (userId: string, params?: any) => apiClient.get(`/notifications/user/${userId}`, { params }),
  markRead: (id: string) => apiClient.put(`/notifications/${id}/read`),
  markAllRead: (userId: string) => apiClient.put(`/notifications/user/${userId}/read-all`),
  delete: (id: string) => apiClient.delete(`/notifications/${id}`),
};

export const settingsAPI = {
  getProfile: () => apiClient.get('/auth/me'),
  updateProfile: (data: any) => apiClient.put('/auth/profile', data),
  changePassword: (data: any) => apiClient.put('/auth/password', data),
  getPreferences: () => apiClient.get('/auth/preferences'),
  updatePreferences: (data: any) => apiClient.put('/auth/preferences', data),
  getMyOrganizations: () => apiClient.get('/auth/my-organizations'),
  switchOrganization: (organizationId: string) =>
    apiClient.post('/auth/switch-organization', { organizationId }),
  generate2FA: () => apiClient.post('/auth/2fa/generate'),
  enable2FA: (code: string) => apiClient.post('/auth/2fa/enable', { code }),
  disable2FA: (code: string) => apiClient.post('/auth/2fa/disable', { code }),
  getSessions: () => apiClient.get('/auth/sessions'),
  revokeSession: (tokenId: string) => apiClient.delete(`/auth/sessions/${tokenId}`),
  revokeAllSessions: () => apiClient.delete('/auth/sessions'),
  getApiKeys: () => apiClient.get('/api-keys'),
  listApiKeys: () => apiClient.get('/api-keys'),
  createApiKey: (data: any) => apiClient.post('/api-keys', data),
  toggleApiKey: (id: string) => apiClient.patch(`/api-keys/${id}/toggle`),
  deleteApiKey: (id: string) => apiClient.delete(`/api-keys/${id}`),
  // Device token management (from web)
  registerDeviceToken: (token: string, platform: 'web' | 'ios' | 'android' = 'web') =>
    apiClient.post('/devices/tokens', { token, platform }),
  unregisterDeviceToken: (token: string) =>
    apiClient.delete('/devices/tokens', { data: { token } }),
};
