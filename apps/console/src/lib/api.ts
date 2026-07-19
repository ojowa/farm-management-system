import { createFarmManagementClient, FarmManagementClient, APIClientConfig } from '@farm/api-client';
import { authAudit } from '@/lib/auth-audit';

const config: APIClientConfig = {
  baseURL: '',
};

const client: FarmManagementClient = createFarmManagementClient(config);
export const apiClient = client.client;

// ── Shared refresh state ───────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v?: unknown) => void; reject: (e?: unknown) => void }> = [];

function processQueue(error: unknown) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
  failedQueue = [];
}

async function handleRefresh(error: any, originalRequest: any, httpClient: any) {
  authAudit('TOKEN_REFRESH_START', {
    url: originalRequest?.url,
    method: originalRequest?.method,
    status: error.response?.status,
    alreadyRetried: !!originalRequest._retry,
  });

  if (error.response?.status !== 401 || originalRequest._retry) {
    authAudit('TOKEN_REFRESH_FAIL', { reason: 'not_401_or_retried', status: error.response?.status });
    return Promise.reject(error);
  }

  const isRefreshCall = originalRequest.url?.includes('/auth/refresh');
  const isLoginPath = typeof window !== 'undefined' && window.location.pathname === '/login';
  if (isRefreshCall || isLoginPath) {
    authAudit('TOKEN_REFRESH_FAIL', { reason: 'refresh_or_login_path' });
    return Promise.reject(error);
  }

  if (isRefreshing) {
    authAudit('TOKEN_REFRESH_START', { queued: true });
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    })
      .then(() => httpClient(originalRequest))
      .catch((err: unknown) => Promise.reject(err));
  }

  originalRequest._retry = true;
  isRefreshing = true;
  try {
    const refreshResponse = await fetch('/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (!refreshResponse.ok) {
      throw new Error(`Refresh failed with status ${refreshResponse.status}`);
    }
    authAudit('TOKEN_REFRESH_OK', { retryingUrl: originalRequest?.url });
    processQueue(null);
    return httpClient(originalRequest);
  } catch (refreshError: any) {
    authAudit('TOKEN_REFRESH_FAIL', {
      reason: 'refresh_http_failed',
      message: refreshError?.message,
    });
    processQueue(refreshError);
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      authAudit('STATE_CHANGE', { action: 'redirect_to_login', cause: 'refresh_failed' });
      window.location.href = '/login';
    }
    return Promise.reject(refreshError);
  } finally {
    isRefreshing = false;
  }
}

// Apply refresh interceptor to the shared client
apiClient.interceptors.response.use(
  (res) => res,
  (error) => handleRefresh(error, error.config, apiClient),
);

// Audit every outgoing request and its outcome (focus on auth endpoints).
apiClient.interceptors.request.use((config: any) => {
  const url: string = config?.url || '';
  if (url.includes('/auth/') || url.includes('/api/platform')) {
    authAudit('REQ_START', { method: config?.method, url });
  }
  return config;
});

apiClient.interceptors.response.use(
  (res: any) => {
    const url: string = res?.config?.url || '';
    if (url.includes('/auth/') || url.includes('/api/platform')) {
      authAudit('REQ_SUCCESS', {
        method: res?.config?.method,
        url,
        status: res?.status,
      });
    }
    return res;
  },
  (error: any) => {
    const url: string = error?.config?.url || '';
    if (url.includes('/auth/') || url.includes('/api/platform')) {
      authAudit('REQ_FAIL', {
        method: error?.config?.method,
        url,
        status: error?.response?.status,
      });
    }
    return Promise.reject(error);
  },
);

// ── Platform Admin APIs (gateway /api prefix) ──────────────
export const platformUsersAPI = {
  list: (params?: any) => apiClient.get('/api/platform-users', { params }),
  get: (id: string) => apiClient.get(`/api/platform-users/${id}`),
  update: (id: string, data: any) => apiClient.patch(`/api/platform-users/${id}`, data),
  deactivate: (id: string) => apiClient.delete(`/api/platform-users/${id}`),
  impersonate: (id: string) => apiClient.post(`/api/platform-users/${id}/impersonate`),
  forceLogout: (id: string) => apiClient.post(`/api/platform-users/${id}/force-logout`),
  sessions: (id: string) => apiClient.get(`/api/platform-users/${id}/sessions`),
  toggleActive: (userId: string) => apiClient.put(`/api/platform-users/${userId}/toggle-active`),
};

export const platformOrgsAPI = {
  list: (params?: any) => apiClient.get('/api/platform-organizations', { params }),
  get: (id: string) => apiClient.get(`/api/platform-organizations/${id}`),
  create: (data: any) => apiClient.post('/api/platform-organizations', data),
  update: (id: string, data: any) => apiClient.patch(`/api/platform-organizations/${id}`, data),
  delete: (id: string) => apiClient.delete(`/api/platform-organizations/${id}`),
  suspend: (id: string) => apiClient.post(`/api/platform-organizations/${id}/suspend`),
  activate: (id: string) => apiClient.post(`/api/platform-organizations/${id}/activate`),
  stats: (id: string) => apiClient.get(`/api/platform-organizations/${id}/stats`),
  members: (id: string) => apiClient.get(`/api/platform-organizations/${id}/members`),
  updateSubscription: (id: string, data: { subscriptionPlan?: string; subscriptionStatus?: string }) =>
    apiClient.patch(`/api/platform-organizations/${id}/subscription`, data),
  toggleUserActive: (userId: string) => apiClient.put(`/api/platform-users/${userId}/toggle-active`),
};

export const platformFeaturesAPI = {
  list: () => apiClient.get('/api/platform-features'),
  get: (id: string) => apiClient.get(`/api/platform-features/${id}`),
  toggle: (id: string, data: { isEnabled: boolean }) => apiClient.patch(`/api/platform-features/${id}`, data),
  overrides: (id: string) => apiClient.get(`/api/platform-features/${id}/overrides`),
  setOverride: (id: string, data: { organizationId: string; isEnabled: boolean }) => apiClient.post(`/api/platform-features/${id}/overrides`, data),
  deleteOverride: (id: string, orgId: string) => apiClient.delete(`/api/platform-features/${id}/overrides/${orgId}`),
};

export const platformSubscriptionsAPI = {
  listPlans: () => apiClient.get('/api/platform-subscriptions/plans'),
  getPlan: (id: string) => apiClient.get(`/api/platform-subscriptions/plans/${id}`),
  createPlan: (data: any) => apiClient.post('/api/platform-subscriptions/plans', data),
  updatePlan: (id: string, data: any) => apiClient.patch(`/api/platform-subscriptions/plans/${id}`, data),
  deletePlan: (id: string) => apiClient.delete(`/api/platform-subscriptions/plans/${id}`),
  assignPlan: (orgId: string, data: { planId: string; status?: string }) => apiClient.patch(`/api/platform-organizations/${orgId}/subscription`, data),
};

export const platformHealthAPI = {
  status: () => apiClient.get('/api/platform-health'),
  check: () => apiClient.post('/api/platform-health/check'),
};

export const platformAuditAPI = {
  list: (params?: any) => apiClient.get('/api/platform-audit', { params }),
  get: (id: string) => apiClient.get(`/api/platform-audit/${id}`),
};

export const platformBroadcastsAPI = {
  list: () => apiClient.get('/api/platform-broadcasts'),
  get: (id: string) => apiClient.get(`/api/platform-broadcasts/${id}`),
  create: (data: any) => apiClient.post('/api/platform-broadcasts', data),
  update: (id: string, data: any) => apiClient.patch(`/api/platform-broadcasts/${id}`, data),
  delete: (id: string) => apiClient.delete(`/api/platform-broadcasts/${id}`),
};

export const platformConfigAPI = {
  list: () => apiClient.get('/api/platform-config'),
  get: (key: string) => apiClient.get(`/api/platform-config/${key}`),
  update: (configs: Array<{ key: string; value: string; description?: string; category?: string }>) =>
    apiClient.patch('/api/platform-config', { configs }),
};

export const platformOptionsAPI = {
  all: () => apiClient.get('/api/platform-options'),
  plans: () => apiClient.get('/api/platform-options/plans'),
  statuses: () => apiClient.get('/api/platform-options/statuses'),
  broadcastTypes: () => apiClient.get('/api/platform-options/broadcast-types'),
  roles: () => apiClient.get('/api/platform-options/roles'),
  platformAdminRoles: () => apiClient.get('/api/platform-options/platform-admin-roles'),
};

// ── Auth-domain APIs (gateway root) ────────────────────────
export const platformRolesAPI = {
  list: () => apiClient.get('/platform-roles'),
  get: (id: string) => apiClient.get(`/platform-roles/${id}`),
  create: (data: any) => apiClient.post('/platform-roles', data),
  update: (id: string, data: any) => apiClient.put(`/platform-roles/${id}`, data),
  delete: (id: string) => apiClient.delete(`/platform-roles/${id}`),
  setPermissions: (id: string, permissionIds: string[]) => apiClient.post(`/platform-roles/${id}/permissions`, { permissionIds }),
};

export const platformPermissionsAPI = {
  list: () => apiClient.get('/platform-permissions'),
  create: (data: any) => apiClient.post('/platform-permissions', data),
  delete: (id: string) => apiClient.delete(`/platform-permissions/${id}`),
};

export const platformApiKeysAPI = {
  list: () => apiClient.get('/platform-api-keys'),
  create: (data: any) => apiClient.post('/platform-api-keys', data),
  toggle: (id: string) => apiClient.patch(`/platform-api-keys/${id}/toggle`),
  delete: (id: string) => apiClient.delete(`/platform-api-keys/${id}`),
};

// ── Legacy aliases for backward compatibility ───────────────
export const authClient = apiClient;
export const platformClient = apiClient;
