import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
        window.location.href = '/login';
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
  updateProfile: (data: any) => {
    const isFormData = data instanceof FormData;
    return apiClient.put('/auth/profile', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
  },
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

export const myOrgsAPI = {
  list: () => apiClient.get('/auth/my-organizations'),
  switch: (organizationId: string) => apiClient.post('/auth/switch-organization', { organizationId }),
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
