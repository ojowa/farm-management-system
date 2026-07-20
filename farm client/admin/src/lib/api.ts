import { createFarmManagementClient, FarmManagementClient, APIClientConfig } from '@farm/api-client';

const config: APIClientConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_URL!,
};

const client: FarmManagementClient = createFarmManagementClient(config);
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

// ── Admin-specific extras (not in @farm/api-client) ────────
export const reportingAPI = reportsAPI;

export const permissionsAPI = {
  list: () => apiClient.get('/permissions'),
};

export const budgetsAPI = {
  list: (params?: any) => apiClient.get('/finance/budgets', { params }),
  get: (id: string) => apiClient.get(`/finance/budgets/${id}`),
  create: (data: any) => apiClient.post('/finance/budgets', data),
  update: (id: string, data: any) => apiClient.put(`/finance/budgets/${id}`, data),
  delete: (id: string) => apiClient.delete(`/finance/budgets/${id}`),
  addCategory: (budgetId: string, data: any) => apiClient.post(`/finance/budgets/${budgetId}/categories`, data),
  updateCategory: (categoryId: string, data: any) => apiClient.put(`/finance/budgets/categories/${categoryId}`, data),
  deleteCategory: (categoryId: string) => apiClient.delete(`/finance/budgets/categories/${categoryId}`),
  refresh: (budgetId: string) => apiClient.post(`/finance/budgets/${budgetId}/refresh`),
};

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

export const flocksAPI = {
  list: (params?: any) => apiClient.get('/poultry/flocks', { params }),
  get: (id: string) => apiClient.get(`/poultry/flocks/${id}`),
  create: (data: any) => apiClient.post('/poultry/flocks', data),
  update: (id: string, data: any) => apiClient.put(`/poultry/flocks/${id}`, data),
  delete: (id: string) => apiClient.delete(`/poultry/flocks/${id}`),
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
  list: (params?: any) => apiClient.get('/notifications', { params }),
  markRead: (id: string) => apiClient.put(`/notifications/${id}/read`),
  markAllRead: () => apiClient.put('/notifications/read-all'),
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
};
