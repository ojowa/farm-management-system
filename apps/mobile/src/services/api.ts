import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Expo exposes env vars at build time via EXPO_PUBLIC_*; at runtime they
// are inlined. We guard the access so type-check still works in an
// environment without node typings.
declare const process: { env?: Record<string, string | undefined> } | undefined;

const API_BASE_URL =
  (typeof process !== 'undefined' && process?.env?.EXPO_PUBLIC_API_URL) ||
  'http://localhost:3000/api';

// ── Force-logout callback ─────────────────────────────────────────────
// The Redux store registers a callback here so the interceptor can trigger
// a global logout without creating a circular import.
let onForceLogout: (() => void) | null = null;

export function registerForceLogoutHandler(handler: () => void) {
  onForceLogout = handler;
}

// ── Concurrent-401 protection ─────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

function processQueue(error: any, token: string | null) {
  failedQueue.forEach((promise) => {
    if (error || !token) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
}

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for token refresh with concurrent-401 queue
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };

        if (error.response?.status !== 401 || originalRequest._retry) {
          return Promise.reject(error);
        }

        // If a refresh is already in flight, queue this request
        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = await AsyncStorage.getItem('refreshToken');
          if (!refreshToken) throw new Error('No refresh token');

          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          await AsyncStorage.setItem('accessToken', accessToken);
          await AsyncStorage.setItem('refreshToken', newRefreshToken);

          processQueue(null, accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return this.client(originalRequest);
        } catch (refreshError) {
          // Refresh failed — clear tokens, notify the app, and reject queued requests
          await AsyncStorage.removeItem('accessToken');
          await AsyncStorage.removeItem('refreshToken');
          await AsyncStorage.removeItem('user');

          processQueue(refreshError, null);

          // Trigger a global force-logout so the UI navigates to login
          if (onForceLogout) {
            onForceLogout();
          }

          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
    );
  }

  get axiosInstance() {
    return this.client;
  }
}

export const apiClient = new APIClient();


// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    apiClient.axiosInstance.post('/auth/login', credentials),
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    apiClient.axiosInstance.post('/auth/register', data),
  refreshToken: (data: { refreshToken: string }) =>
    apiClient.axiosInstance.post('/auth/refresh', data),
  requestPasswordReset: (data: { email: string }) =>
    apiClient.axiosInstance.post('/auth/forgot-password', data),
  resetPassword: (data: { token: string; newPassword: string }) =>
    apiClient.axiosInstance.post('/auth/reset-password', data),
  verifyMFA: (data: { mfaSessionToken: string; code: string }) =>
    apiClient.axiosInstance.post('/auth/verify-mfa', data),
  getProfile: () => apiClient.axiosInstance.get('/auth/me'),
  updateProfile: (data: { fullName?: string; email?: string; avatar?: string }) =>
    apiClient.axiosInstance.put('/auth/profile', data),
  logout: () => apiClient.axiosInstance.post('/auth/logout').catch(() => ({ data: null })),
};

export const farmsAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/farms', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/farms/${id}`),
  create: (data: any) => {
    const { store } = require('../store/store');
    const orgId = store?.getState?.()?.auth?.user?.organizationId;
    return apiClient.axiosInstance.post('/farms', {
      organizationId: orgId,
      name: data.name,
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
  list: (params?: any) => apiClient.axiosInstance.get('/flocks', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/flocks/${id}`),
  create: (data: any) => {
    const { store } = require('../store/store');
    const orgId = store?.getState?.()?.auth?.user?.organizationId;
    const qty = Number(data.quantity) || 0;
    return apiClient.axiosInstance.post('/flocks', {
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
    apiClient.axiosInstance.put(`/flocks/${id}`, {
      batchCode: data.name,
      currentCount: Number(data.quantity) || undefined,
      status: POULTRY_STATUS_MAP[data.health] || undefined,
      penId: data.penId || undefined,
      breedId: data.breedId || undefined,
    }),
  delete: (id: string) => apiClient.axiosInstance.delete(`/flocks/${id}`),
  listPens: (params?: any) => apiClient.axiosInstance.get('/pens', { params }),
  listBreeds: (params?: any) => apiClient.axiosInstance.get('/breeds', { params }),
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
      apiClient.axiosInstance.get('/expenses', { params }),
      apiClient.axiosInstance.get('/sales', { params }),
    ]);
    const expenses = Array.isArray(expensesRes.data) ? expensesRes.data : [];
    const sales = Array.isArray(salesRes.data) ? salesRes.data : [];
    return { data: [...expenses, ...sales] };
  },
  get: (id: string) => apiClient.axiosInstance.get(`/expenses/${id}`).catch(() => apiClient.axiosInstance.get(`/sales/${id}`)),
  create: async (data: any) => {
    const farmId = await getDefaultFarmId();
    if (data.type === 'income') {
      const amount = Math.abs(Number(data.amount) || 0);
      return apiClient.axiosInstance.post('/sales', {
        farmId,
        item: data.title,
        quantity: 1,
        price: amount,
        total: amount,
        date: data.date,
      });
    }
    return apiClient.axiosInstance.post('/expenses', {
      farmId,
      title: data.title,
      amount: Math.abs(Number(data.amount) || 0),
      date: data.date,
    });
  },
  update: async (id: string, data: any) => {
    if (data.type === 'income') {
      const amount = Math.abs(Number(data.amount) || 0);
      return apiClient.axiosInstance.put(`/sales/${id}`, {
        item: data.title,
        price: amount,
        total: amount,
        date: data.date,
      });
    }
    return apiClient.axiosInstance.put(`/expenses/${id}`, {
      title: data.title,
      amount: Math.abs(Number(data.amount) || 0),
      date: data.date,
    });
  },
  delete: (id: string) => apiClient.axiosInstance.delete(`/expenses/${id}`).catch(() => apiClient.axiosInstance.delete(`/sales/${id}`)),
  getReports: (params?: any) => apiClient.axiosInstance.get('/finance/reports', { params }),
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
