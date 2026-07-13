import axios, { AxiosInstance } from 'axios';

// Expo exposes env vars at build time via EXPO_PUBLIC_*; at runtime they
// are inlined. We guard the access so type-check still works in an
// environment without node typings.
declare const process: { env?: Record<string, string | undefined> } | undefined;

const API_BASE_URL =
  (typeof process !== 'undefined' && process?.env?.EXPO_PUBLIC_API_URL) ||
  'http://localhost:4000';

if (__DEV__ && API_BASE_URL.startsWith('http://') && !API_BASE_URL.includes('localhost') && !API_BASE_URL.includes('192.168.')) {
  console.warn(
    '[API] WARNING: Using HTTP in non-local environment. ' +
    'Set EXPO_PUBLIC_API_URL to an HTTPS URL for production builds.',
  );
}

class APIClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });

    // Request interceptor — attach Bearer token
    this.client.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    // Response interceptor — auto-refresh on 401
    let isRefreshing = false;
    let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (e: unknown) => void }> = [];

    const processQueue = (error: unknown) => {
      failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
      failedQueue = [];
    };

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then(() => this.client(originalRequest))
              .catch((err) => Promise.reject(err));
          }
          originalRequest._retry = true;
          isRefreshing = true;
          try {
            if (this.refreshToken) {
              const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                refreshToken: this.refreshToken,
              });
              this.setTokens(res.data.accessToken, res.data.refreshToken);
              processQueue(null);
              return this.client(originalRequest);
            }
            throw new Error('No refresh token');
          } catch (e) {
            processQueue(e);
            this.clearTokens();
            return Promise.reject(e);
          } finally {
            isRefreshing = false;
          }
        }
        return Promise.reject(error);
      }
    );
  }

  get axiosInstance() {
    return this.client;
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
  }
}

export const apiClient = new APIClient();

export const farmsAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/farms', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/farms/${id}`),
  create: (data: any) => {
    const { store } = require('../store/store');
    const orgId = store?.getState?.()?.auth?.user?.organizationId;
    return apiClient.axiosInstance.post('/farms', {
      organizationId: orgId,
      name: data.name,
      farmType: data.farmType,
      location: data.location || null,
      size: Number(data.size) || 0,
      status: data.status || 'active',
    });
  },
  update: (id: string, data: any) =>
    apiClient.axiosInstance.put(`/farms/${id}`, {
      name: data.name,
      location: data.location || null,
      size: Number(data.size) || 0,
      status: data.status || 'active',
    }),
  delete: (id: string) => apiClient.axiosInstance.delete(`/farms/${id}`),
};

export const cropsAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/crops', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/crops/${id}`),
  /** Creates a Crop, then optionally creates a CropCycle if planting info is provided. */
  create: async (data: any) => {
    // Mobile sends { name, type, farmId, area, plantedDate, health, status }
    // Backend Crop only accepts { name }
    const cropRes = await apiClient.axiosInstance.post('/crops', { name: data.name });
    const crop = cropRes.data;

    // If planting date is provided, create a CropCycle
    if (data.plantedDate && data.farmId) {
      try {
        // Get the farm to find a field
        const farmRes = await apiClient.axiosInstance.get(`/farms/${data.farmId}`);
        const fields = farmRes.data?.fields ?? [];
        const fieldId = fields[0]?.id;
        if (fieldId) {
          await apiClient.axiosInstance.post('/cycles', {
            fieldId,
            cropId: crop.id,
            plantingDate: data.plantedDate,
            health: Number(data.health) || 100,
            status: data.status || 'growing',
          });
        }
      } catch (err) {
        if (__DEV__) console.warn('[cropsAPI.create] Failed to create crop cycle:', err);
      }
    }
    return cropRes;
  },
  update: async (id: string, data: any) => {
    // Update crop name
    const cropRes = await apiClient.axiosInstance.put(`/crops/${id}`, { name: data.name });
    // Update crop cycle health/status if available
    if (data.plantedDate || data.health !== undefined || data.status) {
      try {
        const cyclesRes = await apiClient.axiosInstance.get('/cycles');
        const cycles = Array.isArray(cyclesRes.data) ? cyclesRes.data : [];
        const cycle = cycles.find((c: any) => c.cropId === id);
        if (cycle) {
          await apiClient.axiosInstance.put(`/cycles/${cycle.id}`, {
            health: Number(data.health) || undefined,
            status: data.status || undefined,
            harvestDate: data.status === 'completed' ? new Date().toISOString() : undefined,
          });
        }
      } catch { /* best-effort */ }
    }
    return cropRes;
  },
  delete: (id: string) => apiClient.axiosInstance.delete(`/crops/${id}`),
  listCycles: (params?: any) => apiClient.axiosInstance.get('/cycles', { params }),
};

const LIVESTOCK_STATUS_MAP: Record<string, string> = {
  healthy: 'HEALTHY',
  sick: 'SICK',
  treatment: 'SOLD', // closest match
};

export const livestockAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/livestocks', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/livestocks/${id}`),
  create: (data: any) => {
    return apiClient.axiosInstance.post('/livestocks', {
      farmId: data.farmId,
      species: data.name || data.breed || 'Unknown',
      breed: data.breed || null,
      gender: data.gender || 'MALE',
      birthDate: data.birthDate || new Date().toISOString(),
      status: LIVESTOCK_STATUS_MAP[data.health] || 'HEALTHY',
    });
  },
  update: (id: string, data: any) =>
    apiClient.axiosInstance.put(`/livestocks/${id}`, {
      species: data.name || data.breed,
      breed: data.breed || null,
      gender: data.gender || undefined,
      birthDate: data.birthDate || undefined,
      status: LIVESTOCK_STATUS_MAP[data.health] || 'HEALTHY',
    }),
  delete: (id: string) => apiClient.axiosInstance.delete(`/livestocks/${id}`),
};

const POULTRY_STATUS_MAP: Record<string, string> = {
  healthy: 'ACTIVE',
  sick: 'DECEASED',
  treatment: 'SOLD',
};

export const poultryAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/poultry/flocks', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/poultry/flocks/${id}`),
  create: (data: any) => {
    const { store } = require('../store/store');
    const orgId = store?.getState?.()?.auth?.user?.organizationId;
    const qty = Number(data.quantity) || 0;
    return apiClient.axiosInstance.post('/poultry/flocks', {
      organizationId: orgId,
      farmId: data.farmId,
      penId: data.penId || '00000000-0000-0000-0000-000000000000',
      breedId: data.breedId || '00000000-0000-0000-0000-000000000000',
      batchCode: data.name || `BATCH-${Date.now()}`,
      birdCount: qty,
      currentCount: qty,
      arrivalDate: data.birthDate || new Date().toISOString(),
      currentAgeDays: 0,
      status: POULTRY_STATUS_MAP[data.health] || 'ACTIVE',
    });
  },
  update: (id: string, data: any) =>
    apiClient.axiosInstance.put(`/poultry/flocks/${id}`, {
      batchCode: data.name,
      currentCount: Number(data.quantity) || undefined,
      status: POULTRY_STATUS_MAP[data.health] || undefined,
      penId: data.penId || undefined,
      breedId: data.breedId || undefined,
    }),
  delete: (id: string) => apiClient.axiosInstance.delete(`/poultry/flocks/${id}`),
  listPens: (params?: any) => apiClient.axiosInstance.get('/poultry/pens', { params }),
  listBreeds: (params?: any) => apiClient.axiosInstance.get('/poultry/breeds', { params }),
};

/** Helper to get the first available farm ID from the backend. */
async function getDefaultFarmId(): Promise<string | undefined> {
  try {
    const { store } = require('../store/store');
    const farmsRes = await apiClient.axiosInstance.get('/farms');
    const farms = Array.isArray(farmsRes.data) ? farmsRes.data : [];
    return farms[0]?.id;
  } catch {
    return undefined;
  }
}

export const financeAPI = {
  /** Fetches both expenses and sales, merges into a single list. */
  list: async (params?: any) => {
    const [expensesRes, salesRes] = await Promise.all([
      apiClient.axiosInstance.get('/finance/expenses', { params }),
      apiClient.axiosInstance.get('/finance/sales', { params }),
    ]);
    const expenses = Array.isArray(expensesRes.data) ? expensesRes.data : [];
    const sales = Array.isArray(salesRes.data) ? salesRes.data : [];
    return { data: [...expenses, ...sales] };
  },
  listExpenses: (params?: any) => apiClient.axiosInstance.get('/finance/expenses', { params }),
  listSales: (params?: any) => apiClient.axiosInstance.get('/finance/sales', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/finance/expenses/${id}`).catch(() => apiClient.axiosInstance.get(`/finance/sales/${id}`)),
  getExpense: (id: string) => apiClient.axiosInstance.get(`/finance/expenses/${id}`),
  getSale: (id: string) => apiClient.axiosInstance.get(`/finance/sales/${id}`),
  create: async (data: any) => {
    const farmId = await getDefaultFarmId();
    if (data.type === 'income') {
      const amount = Math.abs(Number(data.amount) || 0);
      return apiClient.axiosInstance.post('/finance/sales', {
        farmId,
        item: data.title,
        quantity: 1,
        price: amount,
        total: amount,
        date: data.date,
      });
    }
    return apiClient.axiosInstance.post('/finance/expenses', {
      farmId,
      title: data.title,
      amount: Math.abs(Number(data.amount) || 0),
      date: data.date,
    });
  },
  createExpense: (data: any) => apiClient.axiosInstance.post('/finance/expenses', data),
  createSale: (data: any) => apiClient.axiosInstance.post('/finance/sales', data),
  update: async (id: string, data: any) => {
    if (data.type === 'income') {
      const amount = Math.abs(Number(data.amount) || 0);
      return apiClient.axiosInstance.put(`/finance/sales/${id}`, {
        item: data.title,
        price: amount,
        total: amount,
        date: data.date,
      });
    }
    return apiClient.axiosInstance.put(`/finance/expenses/${id}`, {
      title: data.title,
      amount: Math.abs(Number(data.amount) || 0),
      date: data.date,
    });
  },
  updateExpense: (id: string, data: any) => apiClient.axiosInstance.put(`/finance/expenses/${id}`, data),
  updateSale: (id: string, data: any) => apiClient.axiosInstance.put(`/finance/sales/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/finance/expenses/${id}`).catch(() => apiClient.axiosInstance.delete(`/finance/sales/${id}`)),
  deleteExpense: (id: string) => apiClient.axiosInstance.delete(`/finance/expenses/${id}`),
  deleteSale: (id: string) => apiClient.axiosInstance.delete(`/finance/sales/${id}`),
  getReports: (params?: any) => apiClient.axiosInstance.get('/reporting/reports', { params }),
};

export const reportsAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/reporting/reports', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/reporting/reports/${id}`),
  create: (data: any) => apiClient.axiosInstance.post('/reporting/reports', data),
  generate: (templateId: string) => apiClient.axiosInstance.post('/reporting/reports/generate', { templateId }),
  update: (id: string, data: any) => apiClient.axiosInstance.put(`/reporting/reports/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/reporting/reports/${id}`),
};

export const inventoryAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/inventory', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/inventory/${id}`),
  create: (data: any) => apiClient.axiosInstance.post('/inventory', data),
  update: (id: string, data: any) => apiClient.axiosInstance.put(`/inventory/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/inventory/${id}`),
};

export const workersAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/workers', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/workers/${id}`),
  create: (data: any) => apiClient.axiosInstance.post('/workers', data),
  update: (id: string, data: any) => apiClient.axiosInstance.put(`/workers/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/workers/${id}`),
};

export const poultryHousesAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/poultry/poultry-houses', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/poultry/poultry-houses/${id}`),
  create: (data: any) => apiClient.axiosInstance.post('/poultry/poultry-houses', data),
  update: (id: string, data: any) => apiClient.axiosInstance.put(`/poultry/poultry-houses/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/poultry/poultry-houses/${id}`),
};

export const feedingRecordsAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/poultry/feeding-records', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/poultry/feeding-records/${id}`),
  create: (data: any) => apiClient.axiosInstance.post('/poultry/feeding-records', data),
  update: (id: string, data: any) => apiClient.axiosInstance.put(`/poultry/feeding-records/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/poultry/feeding-records/${id}`),
};

export const vaccinationRecordsAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/poultry/vaccination-records', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/poultry/vaccination-records/${id}`),
  create: (data: any) => apiClient.axiosInstance.post('/poultry/vaccination-records', data),
  update: (id: string, data: any) => apiClient.axiosInstance.put(`/poultry/vaccination-records/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/poultry/vaccination-records/${id}`),
};

export const mortalityRecordsAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/poultry/mortality-records', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/poultry/mortality-records/${id}`),
  create: (data: any) => apiClient.axiosInstance.post('/poultry/mortality-records', data),
  update: (id: string, data: any) => apiClient.axiosInstance.put(`/poultry/mortality-records/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/poultry/mortality-records/${id}`),
};

export const eggProductionAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/poultry/egg-production', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/poultry/egg-production/${id}`),
  create: (data: any) => apiClient.axiosInstance.post('/poultry/egg-production', data),
  update: (id: string, data: any) => apiClient.axiosInstance.put(`/poultry/egg-production/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/poultry/egg-production/${id}`),
};

export const medicationAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/poultry/medications', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/poultry/medications/${id}`),
  create: (data: any) => apiClient.axiosInstance.post('/poultry/medications', data),
  update: (id: string, data: any) => apiClient.axiosInstance.put(`/poultry/medications/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/poultry/medications/${id}`),
};

export const organizationsAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/organizations', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/organizations/${id}`),
  getBySlug: (slug: string) => apiClient.axiosInstance.get(`/organizations/slug/${slug}`),
  create: (data: any) => apiClient.axiosInstance.post('/organizations', data),
  update: (id: string, data: any) => apiClient.axiosInstance.put(`/organizations/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/organizations/${id}`),
};

export const orgAdminAPI = {
  getOrganization: () => apiClient.axiosInstance.get('/org-admin/me'),
  updateOrganization: (data: any) => apiClient.axiosInstance.put('/org-admin/me', data),
  listUsers: () => apiClient.axiosInstance.get('/org-admin/users'),
  inviteUser: (data: { firstName: string; lastName: string; email: string; roleId?: string }) =>
    apiClient.axiosInstance.post('/org-admin/users', data),
  updateUser: (userId: string, data: any) => apiClient.axiosInstance.put(`/org-admin/users/${userId}`, data),
  removeUser: (userId: string) => apiClient.axiosInstance.delete(`/org-admin/users/${userId}`),
  listRoles: () => apiClient.axiosInstance.get('/org-admin/roles'),
  getRole: (id: string) => apiClient.axiosInstance.get(`/org-admin/roles/${id}`),
  createRole: (data: { name: string; description?: string; permissionIds?: string[] }) =>
    apiClient.axiosInstance.post('/org-admin/roles', data),
  updateRole: (id: string, data: { name?: string; description?: string; permissionIds?: string[] }) =>
    apiClient.axiosInstance.put(`/org-admin/roles/${id}`, data),
  deleteRole: (id: string) => apiClient.axiosInstance.delete(`/org-admin/roles/${id}`),
};

export const tasksAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/tasks', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/tasks/${id}`),
  create: (data: any) => apiClient.axiosInstance.post('/tasks', data),
  update: (id: string, data: any) => apiClient.axiosInstance.put(`/tasks/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/tasks/${id}`),
  updateStatus: (id: string, status: string) => apiClient.axiosInstance.put(`/tasks/${id}/status`, { status }),
};

export const leaveAPI = {
  types: () => apiClient.axiosInstance.get('/leave/types'),
  requests: (params?: any) => apiClient.axiosInstance.get('/leave/requests', { params }),
  balance: (params?: any) => apiClient.axiosInstance.get('/leave/balance', { params }),
  createRequest: (data: any) => apiClient.axiosInstance.post('/leave/requests', data),
  approve: (id: string) => apiClient.axiosInstance.put(`/leave/requests/${id}/approve`),
  reject: (id: string, data?: any) => apiClient.axiosInstance.put(`/leave/requests/${id}/reject`, data),
  cancel: (id: string) => apiClient.axiosInstance.put(`/leave/requests/${id}/cancel`),
};

export const rosterAPI = {
  listShifts: () => apiClient.axiosInstance.get('/shifts'),
  createShift: (data: any) => apiClient.axiosInstance.post('/shifts', data),
  updateShift: (id: string, data: any) => apiClient.axiosInstance.put(`/shifts/${id}`, data),
  deleteShift: (id: string) => apiClient.axiosInstance.delete(`/shifts/${id}`),
  listAssignments: (params?: any) => apiClient.axiosInstance.get('/shift-assignments', { params }),
  createAssignment: (data: any) => apiClient.axiosInstance.post('/shift-assignments', data),
  deleteAssignment: (id: string) => apiClient.axiosInstance.delete(`/shift-assignments/${id}`),
};

export const messagesAPI = {
  inbox: () => apiClient.axiosInstance.get('/messages/inbox'),
  sent: () => apiClient.axiosInstance.get('/messages/sent'),
  unreadCount: () => apiClient.axiosInstance.get('/messages/unread-count'),
  get: (id: string) => apiClient.axiosInstance.get(`/messages/${id}`),
  send: (data: any) => apiClient.axiosInstance.post('/messages', data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/messages/${id}`),
};

export const correspondenceAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/correspondence', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/correspondence/${id}`),
  stats: () => apiClient.axiosInstance.get('/correspondence/stats'),
  create: (data: any) => apiClient.axiosInstance.post('/correspondence', data),
  update: (id: string, data: any) => apiClient.axiosInstance.put(`/correspondence/${id}`, data),
  archive: (id: string) => apiClient.axiosInstance.put(`/correspondence/${id}/archive`),
  unarchive: (id: string) => apiClient.axiosInstance.put(`/correspondence/${id}/unarchive`),
  delete: (id: string) => apiClient.axiosInstance.delete(`/correspondence/${id}`),
};

export const notificationsAPI = {
  list: (userId: string, params?: any) => apiClient.axiosInstance.get(`/notifications/user/${userId}`, { params }),
  unreadCount: (userId: string) => apiClient.axiosInstance.get(`/notifications/user/${userId}/unread-count`),
  markAsRead: (id: string) => apiClient.axiosInstance.put(`/notifications/${id}/read`),
  markAllAsRead: (userId: string) => apiClient.axiosInstance.put(`/notifications/user/${userId}/read-all`),
};

export const attendanceAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/attendance', { params }),
  getToday: () => apiClient.axiosInstance.get('/attendance/today'),
  getSummary: (params: { workerId: string; month?: number; year?: number }) =>
    apiClient.axiosInstance.get('/attendance/summary', { params }),
  create: (data: any) => apiClient.axiosInstance.post('/attendance', data),
  clockIn: (data: { workerId: string; workerName: string }) => apiClient.axiosInstance.post('/attendance/clock-in', data),
  clockOut: (data: { workerId: string }) => apiClient.axiosInstance.post('/attendance/clock-out', data),
  update: (id: string, data: any) => apiClient.axiosInstance.put(`/attendance/${id}`, data),
  bulkCreate: (records: any[]) => apiClient.axiosInstance.post('/attendance/bulk', { records }),
};

export const cropStagesAPI = {
  calendar: (params?: any) => apiClient.axiosInstance.get('/crops/lifecycle/calendar', { params }),
  listByCycle: (cropCycleId: string) => apiClient.axiosInstance.get(`/crops/lifecycle/crop-cycle/${cropCycleId}/stages`),
  create: (cropCycleId: string, data: any) => apiClient.axiosInstance.post(`/crops/lifecycle/crop-cycle/${cropCycleId}/stages`, data),
  update: (id: string, data: any) => apiClient.axiosInstance.put(`/crops/lifecycle/stages/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/crops/lifecycle/stages/${id}`),
};

export const livestockHealthAPI = {
  listByAnimal: (livestockId: string) => apiClient.axiosInstance.get(`/livestock/health/livestock/${livestockId}`),
  create: (livestockId: string, data: any) => apiClient.axiosInstance.post(`/livestock/health/livestock/${livestockId}`, data),
  listVaccinations: (livestockId: string) => apiClient.axiosInstance.get(`/livestock/health/vaccinations/${livestockId}`),
  scheduleVaccination: (livestockId: string, data: any) => apiClient.axiosInstance.post(`/livestock/health/vaccinations/${livestockId}`, data),
  administerVaccination: (id: string) => apiClient.axiosInstance.put(`/livestock/health/vaccinations/${id}/administer`),
  overdueVaccinations: () => apiClient.axiosInstance.get('/livestock/health/overdue'),
};

export const breedingAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/livestock/breeding', { params }),
  create: (data: any) => apiClient.axiosInstance.post('/livestock/breeding', data),
  update: (id: string, data: any) => apiClient.axiosInstance.put(`/livestock/breeding/${id}`, data),
  upcoming: () => apiClient.axiosInstance.get('/livestock/breeding/upcoming'),
};

export const weightAPI = {
  listByAnimal: (livestockId: string) => apiClient.axiosInstance.get(`/livestock/weight/livestock/${livestockId}`),
  recordForAnimal: (livestockId: string, data: any) => apiClient.axiosInstance.post(`/livestock/weight/livestock/${livestockId}`, data),
  listByFlock: (flockId: string) => apiClient.axiosInstance.get(`/livestock/weight/flock/${flockId}`),
  recordForFlock: (flockId: string, data: any) => apiClient.axiosInstance.post(`/livestock/weight/flock/${flockId}`, data),
};

export const irrigationAPI = {
  listSchedules: (params?: any) => apiClient.axiosInstance.get('/crops/irrigation/schedule', { params }),
  createSchedule: (data: any) => apiClient.axiosInstance.post('/crops/irrigation/schedule', data),
  updateSchedule: (id: string, data: any) => apiClient.axiosInstance.put(`/crops/irrigation/schedule/${id}`, data),
  deleteSchedule: (id: string) => apiClient.axiosInstance.delete(`/crops/irrigation/schedule/${id}`),
  createLog: (data: any) => apiClient.axiosInstance.post('/crops/irrigation/log', data),
  listLogs: (params?: any) => apiClient.axiosInstance.get('/crops/irrigation/log', { params }),
};

export const pestDiseaseAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/crops/pest-disease', { params }),
  active: () => apiClient.axiosInstance.get('/crops/pest-disease/active'),
  create: (data: any) => apiClient.axiosInstance.post('/crops/pest-disease', data),
  update: (id: string, data: any) => apiClient.axiosInstance.put(`/crops/pest-disease/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/crops/pest-disease/${id}`),
};

export const weatherAPI = {
  current: (lat: number, lon: number) => apiClient.axiosInstance.get('/weather/current', { params: { lat, lon } }),
  forecast: (lat: number, lon: number, days?: number) => apiClient.axiosInstance.get('/weather/forecast', { params: { lat, lon, days } }),
  alerts: (lat: number, lon: number) => apiClient.axiosInstance.get('/weather/alerts', { params: { lat, lon } }),
};

export const profitabilityAPI = {
  byFarm: (params?: any) => apiClient.axiosInstance.get('/finance/profitability/farm', { params }),
  summary: (params?: any) => apiClient.axiosInstance.get('/finance/profitability/summary', { params }),
};

export const yieldAPI = {
  listByCrop: (cropId: string) => apiClient.axiosInstance.get(`/crops/yield/crop/${cropId}`),
  create: (cropId: string, data: any) => apiClient.axiosInstance.post(`/crops/yield/crop/${cropId}`, data),
  summary: (cropId: string) => apiClient.axiosInstance.get(`/crops/yield/crop/${cropId}/summary`),
};

export const scheduledReportsAPI = {
  list: () => apiClient.axiosInstance.get('/reporting/schedule'),
  create: (data: any) => apiClient.axiosInstance.post('/reporting/schedule', data),
  update: (id: string, data: any) => apiClient.axiosInstance.put(`/reporting/schedule/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/reporting/schedule/${id}`),
};

export const lowStockAPI = {
  list: () => apiClient.axiosInstance.get('/inventory/low-stock'),
  reorder: (id: string) => apiClient.axiosInstance.post(`/inventory/${id}/reorder`),
};

export const importExportAPI = {
  exportFarms: (format?: string) => apiClient.axiosInstance.get('/farms/export/farms', { params: { format }, responseType: format === 'csv' ? 'blob' : undefined }),
  importFarms: (data: any[]) => apiClient.axiosInstance.post('/farms/import/farms', { data }),
  exportCrops: (format?: string) => apiClient.axiosInstance.get('/farms/export/crops', { params: { format }, responseType: format === 'csv' ? 'blob' : undefined }),
  exportWorkers: (format?: string) => apiClient.axiosInstance.get('/farms/export/workers', { params: { format }, responseType: format === 'csv' ? 'blob' : undefined }),
  exportInventory: (format?: string) => apiClient.axiosInstance.get('/inventory/export', { params: { format }, responseType: format === 'csv' ? 'blob' : undefined }),
  importInventory: (data: any[]) => apiClient.axiosInstance.post('/inventory/import', { data }),
};

export const farmMapAPI = {
  all: () => apiClient.axiosInstance.get('/farms/map/all'),
  updateLocation: (id: string, data: { latitude: number; longitude: number }) => apiClient.axiosInstance.put(`/farms/map/${id}/location`, data),
};

export const equipmentAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/inventory/equipment', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/inventory/equipment/${id}`),
  create: (data: any) => apiClient.axiosInstance.post('/inventory/equipment', data),
  update: (id: string, data: any) => apiClient.axiosInstance.put(`/inventory/equipment/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/inventory/equipment/${id}`),
  maintenanceHistory: (id: string) => apiClient.axiosInstance.get(`/inventory/equipment/${id}/maintenance`),
  addMaintenance: (id: string, data: any) => apiClient.axiosInstance.post(`/inventory/equipment/${id}/maintenance`, data),
};

export const contractsAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/finance/contracts', { params }),
  create: (data: any) => apiClient.axiosInstance.post('/finance/contracts', data),
  update: (id: string, data: any) => apiClient.axiosInstance.put(`/finance/contracts/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/finance/contracts/${id}`),
};

export const documentsAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/documents', { params }),
  upload: (formData: FormData) => apiClient.axiosInstance.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: string) => apiClient.axiosInstance.delete(`/documents/${id}`),
};

export const marketplaceAPI = {
  listBuyers: (params?: any) => apiClient.axiosInstance.get('/finance/marketplace/buyers', { params }),
  createBuyer: (data: any) => apiClient.axiosInstance.post('/finance/marketplace/buyers', data),
  updateBuyer: (id: string, data: any) => apiClient.axiosInstance.put(`/finance/marketplace/buyers/${id}`, data),
  deleteBuyer: (id: string) => apiClient.axiosInstance.delete(`/finance/marketplace/buyers/${id}`),
  listListings: (params?: any) => apiClient.axiosInstance.get('/finance/marketplace/listings', { params }),
  createListing: (data: any) => apiClient.axiosInstance.post('/finance/marketplace/listings', data),
  updateListing: (id: string, data: any) => apiClient.axiosInstance.put(`/finance/marketplace/listings/${id}`, data),
  deleteListing: (id: string) => apiClient.axiosInstance.delete(`/finance/marketplace/listings/${id}`),
};

export const authAPI = {
  login: async (email: string, password: string) => {
    const res = await apiClient.axiosInstance.post('/auth/login', { email, password });
    const data = res.data;
    if (data.accessToken && data.refreshToken) {
      apiClient.setTokens(data.accessToken, data.refreshToken);
    }
    return data;
  },
  verifyMFA: async (mfaToken: string, code: string) => {
    const res = await apiClient.axiosInstance.post('/auth/verify-mfa', { mfaToken, code });
    const data = res.data;
    if (data.accessToken && data.refreshToken) {
      apiClient.setTokens(data.accessToken, data.refreshToken);
    }
    return data;
  },
  logout: async () => {
    try {
      await apiClient.axiosInstance.post('/auth/logout');
    } finally {
      apiClient.clearTokens();
    }
  },
  getProfile: () => apiClient.axiosInstance.get('/auth/me'),
  updateProfile: (data: any) => apiClient.axiosInstance.put('/auth/profile', data),
  changePassword: (data: any) => apiClient.axiosInstance.put('/auth/password', data),
  getPreferences: () => apiClient.axiosInstance.get('/auth/preferences'),
  updatePreferences: (data: any) => apiClient.axiosInstance.put('/auth/preferences', data),
  generate2FA: () => apiClient.axiosInstance.post('/auth/2fa/generate'),
  enable2FA: (code: string) => apiClient.axiosInstance.post('/auth/2fa/enable', { code }),
  disable2FA: (code: string) => apiClient.axiosInstance.post('/auth/2fa/disable', { code }),
};