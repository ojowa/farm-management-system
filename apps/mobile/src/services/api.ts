import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

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

    // Add response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await AsyncStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                refreshToken,
              });

              const { accessToken, refreshToken: newRefreshToken } = response.data;
              await AsyncStorage.setItem('accessToken', accessToken);
              await AsyncStorage.setItem('refreshToken', newRefreshToken);

              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            await AsyncStorage.removeItem('accessToken');
            await AsyncStorage.removeItem('refreshToken');
            // This will be handled by Redux
          }
        }

        return Promise.reject(error);
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

  register: (data: { email: string; password: string; fullName: string }) =>
    apiClient.axiosInstance.post('/auth/register', data),

  refreshToken: (data: { refreshToken: string }) =>
    apiClient.axiosInstance.post('/auth/refresh', data),

  requestPasswordReset: (data: { email: string }) =>
    apiClient.axiosInstance.post('/auth/forgot-password', data),

  resetPassword: (data: { token: string; newPassword: string }) =>
    apiClient.axiosInstance.post('/auth/reset-password', data),

  verifyMFA: (data: { mfaSessionToken: string; code: string }) =>
    apiClient.axiosInstance.post('/auth/verify-mfa', data),

  getProfile: () => apiClient.axiosInstance.get('/auth/profile'),

  logout: () => apiClient.axiosInstance.post('/auth/logout'),
};

// Farms API
export const farmsAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/farms', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/farms/${id}`),
  create: (data: any) => apiClient.axiosInstance.post('/farms', data),
  update: (id: string, data: any) =>
    apiClient.axiosInstance.put(`/farms/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/farms/${id}`),
};

// Crops API
export const cropsAPI = {
  list: (params?: any) => apiClient.axiosInstance.get('/crops', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/crops/${id}`),
  create: (data: any) => apiClient.axiosInstance.post('/crops', data),
  update: (id: string, data: any) =>
    apiClient.axiosInstance.put(`/crops/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/crops/${id}`),
};

// Livestock API
export const livestockAPI = {
  list: (params?: any) =>
    apiClient.axiosInstance.get('/livestocks', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/livestocks/${id}`),
  create: (data: any) => apiClient.axiosInstance.post('/livestocks', data),
  update: (id: string, data: any) =>
    apiClient.axiosInstance.put(`/livestocks/${id}`, data),
  delete: (id: string) =>
    apiClient.axiosInstance.delete(`/livestocks/${id}`),
};

// Poultry API
export const poultryAPI = {
  list: (params?: any) =>
    apiClient.axiosInstance.get('/poultry', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/poultry/${id}`),
  create: (data: any) => apiClient.axiosInstance.post('/poultry', data),
  update: (id: string, data: any) =>
    apiClient.axiosInstance.put(`/poultry/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/poultry/${id}`),
};

// Finance API
export const financeAPI = {
  list: (params?: any) =>
    apiClient.axiosInstance.get('/finance', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/finance/${id}`),
  create: (data: any) => apiClient.axiosInstance.post('/finance', data),
  update: (id: string, data: any) =>
    apiClient.axiosInstance.put(`/finance/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/finance/${id}`),
  getReports: (params?: any) =>
    apiClient.axiosInstance.get('/finance/reports', { params }),
};

// Inventory API
export const inventoryAPI = {
  list: (params?: any) =>
    apiClient.axiosInstance.get('/inventory', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/inventory/${id}`),
  create: (data: any) => apiClient.axiosInstance.post('/inventory', data),
  update: (id: string, data: any) =>
    apiClient.axiosInstance.put(`/inventory/${id}`, data),
  delete: (id: string) =>
    apiClient.axiosInstance.delete(`/inventory/${id}`),
};

// Workers API
export const workersAPI = {
  list: (params?: any) =>
    apiClient.axiosInstance.get('/workers', { params }),
  get: (id: string) => apiClient.axiosInstance.get(`/workers/${id}`),
  create: (data: any) => apiClient.axiosInstance.post('/workers', data),
  update: (id: string, data: any) =>
    apiClient.axiosInstance.put(`/workers/${id}`, data),
  delete: (id: string) => apiClient.axiosInstance.delete(`/workers/${id}`),
};
