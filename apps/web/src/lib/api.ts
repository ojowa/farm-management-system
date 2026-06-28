import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach access token
apiClient.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor — handle 401 + token refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (t: string) => void; reject: (e: any) => void }> = [];

function processQueue(error: any, token: string | null) {
  failedQueue.forEach((p) => (error || !token ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) return Promise.reject(error);

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
      if (!refreshToken) throw new Error('No refresh token');

      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
      const { accessToken, refreshToken: newRefresh } = data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefresh);

      processQueue(null, accessToken);
      original.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(original);
    } catch (refreshError) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('mfaSessionToken');
        document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        window.location.href = '/(auth)/login';
      }
      processQueue(refreshError, null);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ── API modules ───────────────────────────────────────────────────────
export const authAPI = {
  login: (creds: { email: string; password: string }) => apiClient.post('/auth/login', creds),
  register: (data: any) => apiClient.post('/auth/register', data),
  logout: () => apiClient.post('/auth/logout'),
  getProfile: () => apiClient.get('/auth/profile'),
  updateProfile: (data: any) => apiClient.put('/auth/profile', data),
  refreshToken: (data: { refreshToken: string }) => apiClient.post('/auth/refresh', data),
  verifyMFA: (data: { mfaSessionToken: string; code: string }) => apiClient.post('/auth/verify-mfa', data),
  requestPasswordReset: (data: { email: string }) => apiClient.post('/auth/forgot-password', data),
  resetPassword: (data: { token: string; newPassword: string }) => apiClient.post('/auth/reset-password', data),
};

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
  list: (params?: any) => apiClient.get('/finance', { params }),
  get: (id: string) => apiClient.get(`/finance/${id}`),
  create: (data: any) => apiClient.post('/finance', data),
  update: (id: string, data: any) => apiClient.put(`/finance/${id}`, data),
  delete: (id: string) => apiClient.delete(`/finance/${id}`),
  getReports: (params?: any) => apiClient.get('/finance/reports', { params }),
};

export const reportsAPI = {
  list: (params?: any) => apiClient.get('/reports', { params }),
  get: (id: string) => apiClient.get(`/reports/${id}`),
};

// ── Poultry sub-modules ────────────────────────────────────────────────
export const poultryHousesAPI = {
  list: (params?: any) => apiClient.get('/poultry-houses', { params }),
  get: (id: string) => apiClient.get(`/poultry-houses/${id}`),
  create: (data: any) => apiClient.post('/poultry-houses', data),
  update: (id: string, data: any) => apiClient.put(`/poultry-houses/${id}`, data),
  delete: (id: string) => apiClient.delete(`/poultry-houses/${id}`),
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

export const feedingRecordsAPI = {
  list: (params?: any) => apiClient.get('/feeding-records', { params }),
  get: (id: string) => apiClient.get(`/feeding-records/${id}`),
  create: (data: any) => apiClient.post('/feeding-records', data),
  update: (id: string, data: any) => apiClient.put(`/feeding-records/${id}`, data),
  delete: (id: string) => apiClient.delete(`/feeding-records/${id}`),
};

export const vaccinationRecordsAPI = {
  list: (params?: any) => apiClient.get('/vaccination-records', { params }),
  get: (id: string) => apiClient.get(`/vaccination-records/${id}`),
  create: (data: any) => apiClient.post('/vaccination-records', data),
  update: (id: string, data: any) => apiClient.put(`/vaccination-records/${id}`, data),
  delete: (id: string) => apiClient.delete(`/vaccination-records/${id}`),
};

export const mortalityRecordsAPI = {
  list: (params?: any) => apiClient.get('/mortality-records', { params }),
  get: (id: string) => apiClient.get(`/mortality-records/${id}`),
  create: (data: any) => apiClient.post('/mortality-records', data),
  update: (id: string, data: any) => apiClient.put(`/mortality-records/${id}`, data),
  delete: (id: string) => apiClient.delete(`/mortality-records/${id}`),
};

export const eggProductionAPI = {
  list: (params?: any) => apiClient.get('/egg-production', { params }),
  get: (id: string) => apiClient.get(`/egg-production/${id}`),
  create: (data: any) => apiClient.post('/egg-production', data),
  update: (id: string, data: any) => apiClient.put(`/egg-production/${id}`, data),
  delete: (id: string) => apiClient.delete(`/egg-production/${id}`),
};

export const medicationAPI = {
  list: (params?: any) => apiClient.get('/medications', { params }),
  get: (id: string) => apiClient.get(`/medications/${id}`),
  create: (data: any) => apiClient.post('/medications', data),
  update: (id: string, data: any) => apiClient.put(`/medications/${id}`, data),
  delete: (id: string) => apiClient.delete(`/medications/${id}`),
};

export const salesAPI = {
  list: (params?: any) => apiClient.get('/sales', { params }),
  get: (id: string) => apiClient.get(`/sales/${id}`),
  create: (data: any) => apiClient.post('/sales', data),
  update: (id: string, data: any) => apiClient.put(`/sales/${id}`, data),
  delete: (id: string) => apiClient.delete(`/sales/${id}`),
};

export const notificationsAPI = {
  list: (userId: string, params?: any) => apiClient.get(`/notifications/user/${userId}`, { params }),
  getUnreadCount: (userId: string) => apiClient.get(`/notifications/user/${userId}/unread-count`),
  markAsRead: (id: string) => apiClient.put(`/notifications/${id}/read`),
  markAllAsRead: (userId: string) => apiClient.put(`/notifications/user/${userId}/read-all`),
  delete: (id: string) => apiClient.delete(`/notifications/${id}`),
};
