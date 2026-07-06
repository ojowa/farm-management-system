import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ── Token refresh interceptor ─────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v?: unknown) => void; reject: (e?: unknown) => void }> = [];

function processQueue(error: unknown) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        await apiClient.post('/auth/refresh');
        processQueue(null);
        return apiClient(originalRequest);
      } catch (e) {
        processQueue(e);
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export const farmsAPI = {
  list: (params?: any) => apiClient.get('/farms', { params }),
  get: (id: string) => apiClient.get(`/farms/${id}`),
  create: (data: any) => apiClient.post('/farms', data),
  update: (id: string, data: any) => apiClient.put(`/farms/${id}`, data),
  delete: (id: string) => apiClient.delete(`/farms/${id}`),
};

export const cropsAPI = {
  list: (params?: any) => apiClient.get('/crops', { params }),
  get: (id: string) => apiClient.get(`/crops/${id}`),
  create: (data: any) => apiClient.post('/crops', data),
  update: (id: string, data: any) => apiClient.put(`/crops/${id}`, data),
  delete: (id: string) => apiClient.delete(`/crops/${id}`),
};

export const livestockAPI = {
  list: (params?: any) => apiClient.get('/livestocks', { params }),
  get: (id: string) => apiClient.get(`/livestocks/${id}`),
  create: (data: any) => apiClient.post('/livestocks', data),
  update: (id: string, data: any) => apiClient.put(`/livestocks/${id}`, data),
  delete: (id: string) => apiClient.delete(`/livestocks/${id}`),
};

export const poultryAPI = {
  list: (params?: any) => apiClient.get('/poultry', { params }),
  get: (id: string) => apiClient.get(`/poultry/${id}`),
  create: (data: any) => apiClient.post('/poultry', data),
  update: (id: string, data: any) => apiClient.put(`/poultry/${id}`, data),
  delete: (id: string) => apiClient.delete(`/poultry/${id}`),
};

export const inventoryAPI = {
  list: (params?: any) => apiClient.get('/inventory', { params }),
  get: (id: string) => apiClient.get(`/inventory/${id}`),
  create: (data: any) => apiClient.post('/inventory', data),
  update: (id: string, data: any) => apiClient.put(`/inventory/${id}`, data),
  delete: (id: string) => apiClient.delete(`/inventory/${id}`),
};

export const workersAPI = {
  list: (params?: any) => apiClient.get('/workers', { params }),
  get: (id: string) => apiClient.get(`/workers/${id}`),
  create: (data: any) => apiClient.post('/workers', data),
  update: (id: string, data: any) => apiClient.put(`/workers/${id}`, data),
  delete: (id: string) => apiClient.delete(`/workers/${id}`),
};

export const financeAPI = {
  listExpenses: (params?: any) => apiClient.get('/finance/expenses', { params }),
  getExpense: (id: string) => apiClient.get(`/finance/expenses/${id}`),
  createExpense: (data: any) => apiClient.post('/finance/expenses', data),
  updateExpense: (id: string, data: any) => apiClient.put(`/finance/expenses/${id}`, data),
  deleteExpense: (id: string) => apiClient.delete(`/finance/expenses/${id}`),
  listSales: (params?: any) => apiClient.get('/finance/sales', { params }),
  getSale: (id: string) => apiClient.get(`/finance/sales/${id}`),
  createSale: (data: any) => apiClient.post('/finance/sales', data),
  updateSale: (id: string, data: any) => apiClient.put(`/finance/sales/${id}`, data),
  deleteSale: (id: string) => apiClient.delete(`/finance/sales/${id}`),
};

export const reportsAPI = {
  list: (params?: any) => apiClient.get('/reporting/reports', { params }),
  get: (id: string) => apiClient.get(`/reporting/reports/${id}`),
  create: (data: any) => apiClient.post('/reporting/reports', data),
  generate: (templateId: string) => apiClient.post('/reporting/reports/generate', { templateId }),
  update: (id: string, data: any) => apiClient.put(`/reporting/reports/${id}`, data),
  delete: (id: string) => apiClient.delete(`/reporting/reports/${id}`),
};

// ── Poultry sub-modules ────────────────────────────────────────────────
export const poultryHousesAPI = {
  list: (params?: any) => apiClient.get('/poultry/poultry-houses', { params }),
  get: (id: string) => apiClient.get(`/poultry/poultry-houses/${id}`),
  create: (data: any) => apiClient.post('/poultry/poultry-houses', data),
  update: (id: string, data: any) => apiClient.put(`/poultry/poultry-houses/${id}`, data),
  delete: (id: string) => apiClient.delete(`/poultry/poultry-houses/${id}`),
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

export const feedingRecordsAPI = {
  list: (params?: any) => apiClient.get('/poultry/feeding-records', { params }),
  get: (id: string) => apiClient.get(`/poultry/feeding-records/${id}`),
  create: (data: any) => apiClient.post('/poultry/feeding-records', data),
  update: (id: string, data: any) => apiClient.put(`/poultry/feeding-records/${id}`, data),
  delete: (id: string) => apiClient.delete(`/poultry/feeding-records/${id}`),
};

export const vaccinationRecordsAPI = {
  list: (params?: any) => apiClient.get('/poultry/vaccination-records', { params }),
  get: (id: string) => apiClient.get(`/poultry/vaccination-records/${id}`),
  create: (data: any) => apiClient.post('/poultry/vaccination-records', data),
  update: (id: string, data: any) => apiClient.put(`/poultry/vaccination-records/${id}`, data),
  delete: (id: string) => apiClient.delete(`/poultry/vaccination-records/${id}`),
};

export const mortalityRecordsAPI = {
  list: (params?: any) => apiClient.get('/poultry/mortality-records', { params }),
  get: (id: string) => apiClient.get(`/poultry/mortality-records/${id}`),
  create: (data: any) => apiClient.post('/poultry/mortality-records', data),
  update: (id: string, data: any) => apiClient.put(`/poultry/mortality-records/${id}`, data),
  delete: (id: string) => apiClient.delete(`/poultry/mortality-records/${id}`),
};

export const eggProductionAPI = {
  list: (params?: any) => apiClient.get('/poultry/egg-production', { params }),
  get: (id: string) => apiClient.get(`/poultry/egg-production/${id}`),
  create: (data: any) => apiClient.post('/poultry/egg-production', data),
  update: (id: string, data: any) => apiClient.put(`/poultry/egg-production/${id}`, data),
  delete: (id: string) => apiClient.delete(`/poultry/egg-production/${id}`),
};

export const medicationAPI = {
  list: (params?: any) => apiClient.get('/poultry/medications', { params }),
  get: (id: string) => apiClient.get(`/poultry/medications/${id}`),
  create: (data: any) => apiClient.post('/poultry/medications', data),
  update: (id: string, data: any) => apiClient.put(`/poultry/medications/${id}`, data),
  delete: (id: string) => apiClient.delete(`/poultry/medications/${id}`),
};

export const poultrySalesAPI = {
  list: (params?: any) => apiClient.get('/poultry/sales', { params }),
  get: (id: string) => apiClient.get(`/poultry/sales/${id}`),
  create: (data: any) => apiClient.post('/poultry/sales', data),
  update: (id: string, data: any) => apiClient.put(`/poultry/sales/${id}`, data),
  delete: (id: string) => apiClient.delete(`/poultry/sales/${id}`),
};

// Notifications API is defined in ./notifications.ts with proper types

export const orgAdminAPI = {
  getOrganization: () => apiClient.get('/org-admin/me'),
  updateOrganization: (data: any) => apiClient.put('/org-admin/me', data),
  listUsers: () => apiClient.get('/org-admin/users'),
  inviteUser: (data: { firstName: string; lastName: string; email: string; roleId?: string; phone?: string }) =>
    apiClient.post('/org-admin/users', data),
  updateUser: (userId: string, data: any) => apiClient.put(`/org-admin/users/${userId}`, data),
  removeUser: (userId: string) => apiClient.delete(`/org-admin/users/${userId}`),
  // Role management
  listRoles: () => apiClient.get('/org-admin/roles'),
  getRole: (id: string) => apiClient.get(`/org-admin/roles/${id}`),
  createRole: (data: { name: string; description?: string; permissionIds?: string[] }) =>
    apiClient.post('/org-admin/roles', data),
  updateRole: (id: string, data: { name?: string; description?: string; permissionIds?: string[] }) =>
    apiClient.put(`/org-admin/roles/${id}`, data),
  deleteRole: (id: string) => apiClient.delete(`/org-admin/roles/${id}`),
};



export const rosterAPI = {
  listShifts: () => apiClient.get('/shifts'),
  createShift: (data: { name: string; startTime: string; endTime: string; color?: string }) =>
    apiClient.post('/shifts', data),
  updateShift: (id: string, data: any) => apiClient.put(`/shifts/${id}`, data),
  deleteShift: (id: string) => apiClient.delete(`/shifts/${id}`),
  listAssignments: (params?: { startDate?: string; endDate?: string; userId?: string }) =>
    apiClient.get('/shift-assignments', { params }),
  createAssignment: (data: { shiftId: string; userId: string; date: string; notes?: string }) =>
    apiClient.post('/shift-assignments', data),
  bulkAssign: (assignments: Array<{ shiftId: string; userId: string; date: string; notes?: string }>) =>
    apiClient.post('/shift-assignments/bulk', { assignments }),
  deleteAssignment: (id: string) => apiClient.delete(`/shift-assignments/${id}`),
};

export const messagesAPI = {
  inbox: () => apiClient.get('/messages/inbox'),
  sent: () => apiClient.get('/messages/sent'),
  unreadCount: () => apiClient.get('/messages/unread-count'),
  get: (id: string) => apiClient.get(`/messages/${id}`),
  send: (data: { subject: string; body: string; recipientIds: string[]; priority?: string }) =>
    apiClient.post('/messages', data),
  delete: (id: string) => apiClient.delete(`/messages/${id}`),
};

export const correspondenceAPI = {
  list: (params?: { status?: string; type?: string; category?: string; archived?: string }) =>
    apiClient.get('/correspondence', { params }),
  get: (id: string) => apiClient.get(`/correspondence/${id}`),
  stats: () => apiClient.get('/correspondence/stats'),
  create: (data: any) => apiClient.post('/correspondence', data),
  update: (id: string, data: any) => apiClient.put(`/correspondence/${id}`, data),
  archive: (id: string) => apiClient.put(`/correspondence/${id}/archive`),
  unarchive: (id: string) => apiClient.put(`/correspondence/${id}/unarchive`),
  delete: (id: string) => apiClient.delete(`/correspondence/${id}`),
  addAttachment: (id: string, data: { fileName: string; fileSize: number; fileUrl: string; fileType?: string }) =>
    apiClient.post(`/correspondence/${id}/attachments`, data),
  removeAttachment: (attachmentId: string) => apiClient.delete(`/correspondence/attachments/${attachmentId}`),
};

export const tasksAPI = {
  list: (params?: any) => apiClient.get('/tasks', { params }),
  get: (id: string) => apiClient.get(`/tasks/${id}`),
  create: (data: any) => apiClient.post('/tasks', data),
  update: (id: string, data: any) => apiClient.put(`/tasks/${id}`, data),
  delete: (id: string) => apiClient.delete(`/tasks/${id}`),
  updateStatus: (id: string, status: string) => apiClient.put(`/tasks/${id}/status`, { status }),
};

export const attendanceAPI = {
  list: (params?: any) => apiClient.get('/attendance', { params }),
  getToday: () => apiClient.get('/attendance/today'),
  getSummary: (params: { workerId: string; month?: number; year?: number }) =>
    apiClient.get('/attendance/summary', { params }),
  create: (data: any) => apiClient.post('/attendance', data),
  clockIn: (data: { workerId: string; workerName: string }) => apiClient.post('/attendance/clock-in', data),
  clockOut: (data: { workerId: string }) => apiClient.post('/attendance/clock-out', data),
  update: (id: string, data: any) => apiClient.put(`/attendance/${id}`, data),
  bulkCreate: (records: any[]) => apiClient.post('/attendance/bulk', { records }),
};

export const cropStagesAPI = {
  calendar: (params?: any) => apiClient.get('/crops/lifecycle/calendar', { params }),
  listByCycle: (cropCycleId: string) => apiClient.get(`/crops/lifecycle/crop-cycle/${cropCycleId}/stages`),
  create: (cropCycleId: string, data: any) => apiClient.post(`/crops/lifecycle/crop-cycle/${cropCycleId}/stages`, data),
  update: (id: string, data: any) => apiClient.put(`/crops/lifecycle/stages/${id}`, data),
  delete: (id: string) => apiClient.delete(`/crops/lifecycle/stages/${id}`),
};

export const livestockHealthAPI = {
  listByAnimal: (livestockId: string) => apiClient.get(`/livestock/health/livestock/${livestockId}`),
  create: (livestockId: string, data: any) => apiClient.post(`/livestock/health/livestock/${livestockId}`, data),
  listVaccinations: (livestockId: string) => apiClient.get(`/livestock/health/vaccinations/${livestockId}`),
  scheduleVaccination: (livestockId: string, data: any) => apiClient.post(`/livestock/health/vaccinations/${livestockId}`, data),
  administerVaccination: (id: string) => apiClient.put(`/livestock/health/vaccinations/${id}/administer`),
  overdueVaccinations: () => apiClient.get('/livestock/health/overdue'),
};

export const breedingAPI = {
  list: (params?: any) => apiClient.get('/livestock/breeding', { params }),
  create: (data: any) => apiClient.post('/livestock/breeding', data),
  update: (id: string, data: any) => apiClient.put(`/livestock/breeding/${id}`, data),
  upcoming: () => apiClient.get('/livestock/breeding/upcoming'),
};

export const weightAPI = {
  listByAnimal: (livestockId: string) => apiClient.get(`/livestock/weight/livestock/${livestockId}`),
  recordForAnimal: (livestockId: string, data: any) => apiClient.post(`/livestock/weight/livestock/${livestockId}`, data),
  listByFlock: (flockId: string) => apiClient.get(`/livestock/weight/flock/${flockId}`),
  recordForFlock: (flockId: string, data: any) => apiClient.post(`/livestock/weight/flock/${flockId}`, data),
};

export const irrigationAPI = {
  listSchedules: (params?: any) => apiClient.get('/crops/irrigation/schedule', { params }),
  createSchedule: (data: any) => apiClient.post('/crops/irrigation/schedule', data),
  updateSchedule: (id: string, data: any) => apiClient.put(`/crops/irrigation/schedule/${id}`, data),
  deleteSchedule: (id: string) => apiClient.delete(`/crops/irrigation/schedule/${id}`),
  createLog: (data: any) => apiClient.post('/crops/irrigation/log', data),
  listLogs: (params?: any) => apiClient.get('/crops/irrigation/log', { params }),
};

export const pestDiseaseAPI = {
  list: (params?: any) => apiClient.get('/crops/pest-disease', { params }),
  active: () => apiClient.get('/crops/pest-disease/active'),
  create: (data: any) => apiClient.post('/crops/pest-disease', data),
  update: (id: string, data: any) => apiClient.put(`/crops/pest-disease/${id}`, data),
  delete: (id: string) => apiClient.delete(`/crops/pest-disease/${id}`),
};

export const weatherAPI = {
  current: (lat: number, lon: number) => apiClient.get('/weather/current', { params: { lat, lon } }),
  forecast: (lat: number, lon: number, days?: number) => apiClient.get('/weather/forecast', { params: { lat, lon, days } }),
  alerts: (lat: number, lon: number) => apiClient.get('/weather/alerts', { params: { lat, lon } }),
};

export const profitabilityAPI = {
  byFarm: (params?: any) => apiClient.get('/finance/profitability/farm', { params }),
  summary: (params?: any) => apiClient.get('/finance/profitability/summary', { params }),
};

export const yieldAPI = {
  listByCrop: (cropId: string) => apiClient.get(`/crops/yield/crop/${cropId}`),
  create: (cropId: string, data: any) => apiClient.post(`/crops/yield/crop/${cropId}`, data),
  summary: (cropId: string) => apiClient.get(`/crops/yield/crop/${cropId}/summary`),
};

export const scheduledReportsAPI = {
  list: () => apiClient.get('/reporting/schedule'),
  create: (data: any) => apiClient.post('/reporting/schedule', data),
  update: (id: string, data: any) => apiClient.put(`/reporting/schedule/${id}`, data),
  delete: (id: string) => apiClient.delete(`/reporting/schedule/${id}`),
};

export const lowStockAPI = {
  list: () => apiClient.get('/inventory/low-stock'),
  reorder: (id: string) => apiClient.post(`/inventory/${id}/reorder`),
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

export const equipmentAPI = {
  list: (params?: any) => apiClient.get('/inventory/equipment', { params }),
  get: (id: string) => apiClient.get(`/inventory/equipment/${id}`),
  create: (data: any) => apiClient.post('/inventory/equipment', data),
  update: (id: string, data: any) => apiClient.put(`/inventory/equipment/${id}`, data),
  delete: (id: string) => apiClient.delete(`/inventory/equipment/${id}`),
  maintenanceHistory: (id: string) => apiClient.get(`/inventory/equipment/${id}/maintenance`),
  addMaintenance: (id: string, data: any) => apiClient.post(`/inventory/equipment/${id}/maintenance`, data),
};

export const contractsAPI = {
  list: (params?: any) => apiClient.get('/finance/contracts', { params }),
  create: (data: any) => apiClient.post('/finance/contracts', data),
  update: (id: string, data: any) => apiClient.put(`/finance/contracts/${id}`, data),
  delete: (id: string) => apiClient.delete(`/finance/contracts/${id}`),
};

export const documentsAPI = {
  list: (params?: any) => apiClient.get('/documents', { params }),
  upload: (formData: FormData) => apiClient.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: string) => apiClient.delete(`/documents/${id}`),
};

export const marketplaceAPI = {
  listBuyers: (params?: any) => apiClient.get('/finance/marketplace/buyers', { params }),
  createBuyer: (data: any) => apiClient.post('/finance/marketplace/buyers', data),
  updateBuyer: (id: string, data: any) => apiClient.put(`/finance/marketplace/buyers/${id}`, data),
  deleteBuyer: (id: string) => apiClient.delete(`/finance/marketplace/buyers/${id}`),
  listListings: (params?: any) => apiClient.get('/finance/marketplace/listings', { params }),
  createListing: (data: any) => apiClient.post('/finance/marketplace/listings', data),
  updateListing: (id: string, data: any) => apiClient.put(`/finance/marketplace/listings/${id}`, data),
  deleteListing: (id: string) => apiClient.delete(`/finance/marketplace/listings/${id}`),
};

export const settingsAPI = {
  getProfile: () => apiClient.get('/auth/me'),
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string; avatar?: string }) =>
    apiClient.put('/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.put('/auth/password', data),
  getPreferences: () => apiClient.get('/auth/preferences'),
  updatePreferences: (data: { notificationPreferences?: any }) =>
    apiClient.put('/auth/preferences', data),
};
