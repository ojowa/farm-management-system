import axios from 'axios';
import { setCookie, deleteCookie } from '@farm/auth';

const PLATFORM_API_URL = process.env.NEXT_PUBLIC_PLATFORM_API_URL || 'http://localhost:4020';
const CONSOLE_PREFIX = 'console_';

function setConsoleCookies(accessToken: string, refreshToken: string) {
  setCookie(`${CONSOLE_PREFIX}accessToken`, accessToken, 1);
  setCookie(`${CONSOLE_PREFIX}refreshToken`, refreshToken, 7);
}

export const platformClient = axios.create({
  baseURL: PLATFORM_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

platformClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('console_accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (t: string) => void; reject: (e: any) => void }> = [];

function processQueue(error: any, token: string | null) {
  failedQueue.forEach((p) => (error || !token ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

platformClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) return Promise.reject(error);
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => { failedQueue.push({ resolve, reject }); })
        .then((token) => { original.headers.Authorization = `Bearer ${token}`; return platformClient(original); });
    }
    original._retry = true;
    isRefreshing = true;
    try {
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('console_refreshToken') : null;
      if (!refreshToken) throw new Error('No refresh token');
      const { data } = await axios.post(`${PLATFORM_API_URL}/auth/refresh`, { refreshToken });
      const { accessToken, refreshToken: newRefresh } = data;
      localStorage.setItem('console_accessToken', accessToken);
      if (newRefresh) localStorage.setItem('console_refreshToken', newRefresh);
      setConsoleCookies(accessToken, newRefresh || refreshToken);
      processQueue(null, accessToken);
      original.headers.Authorization = `Bearer ${accessToken}`;
      return platformClient(original);
    } catch (refreshError) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('console_accessToken');
        localStorage.removeItem('console_refreshToken');
        localStorage.removeItem('console_user');
        deleteCookie('console_accessToken');
        deleteCookie('console_refreshToken');
        window.location.href = '/login';
      }
      processQueue(refreshError, null);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export const platformAuthAPI = {
  login: (creds: { email: string; password: string }) => platformClient.post('/auth/login', creds),
  refresh: (data: { refreshToken: string }) => platformClient.post('/auth/refresh', data),
  me: () => platformClient.get('/auth/me'),
};

export const platformUsersAPI = {
  list: (params?: any) => platformClient.get('/users', { params }),
  get: (id: string) => platformClient.get(`/users/${id}`),
  update: (id: string, data: any) => platformClient.patch(`/users/${id}`, data),
  deactivate: (id: string) => platformClient.delete(`/users/${id}`),
  impersonate: (id: string) => platformClient.post(`/users/${id}/impersonate`),
  forceLogout: (id: string) => platformClient.post(`/users/${id}/force-logout`),
  sessions: (id: string) => platformClient.get(`/users/${id}/sessions`),
};

export const platformOrgsAPI = {
  list: (params?: any) => platformClient.get('/organizations', { params }),
  get: (id: string) => platformClient.get(`/organizations/${id}`),
  create: (data: any) => platformClient.post('/organizations', data),
  update: (id: string, data: any) => platformClient.patch(`/organizations/${id}`, data),
  delete: (id: string) => platformClient.delete(`/organizations/${id}`),
  suspend: (id: string) => platformClient.post(`/organizations/${id}/suspend`),
  activate: (id: string) => platformClient.post(`/organizations/${id}/activate`),
  stats: (id: string) => platformClient.get(`/organizations/${id}/stats`),
  members: (id: string) => platformClient.get(`/organizations/${id}/members`),
};

export const platformFeaturesAPI = {
  list: () => platformClient.get('/features'),
  get: (id: string) => platformClient.get(`/features/${id}`),
  toggle: (id: string, data: { isEnabled: boolean }) => platformClient.patch(`/features/${id}`, data),
  overrides: (id: string) => platformClient.get(`/features/${id}/overrides`),
  setOverride: (id: string, data: { organizationId: string; isEnabled: boolean }) => platformClient.post(`/features/${id}/overrides`, data),
  deleteOverride: (id: string, orgId: string) => platformClient.delete(`/features/${id}/overrides/${orgId}`),
};

export const platformSubscriptionsAPI = {
  listPlans: () => platformClient.get('/subscriptions/plans'),
  getPlan: (id: string) => platformClient.get(`/subscriptions/plans/${id}`),
  createPlan: (data: any) => platformClient.post('/subscriptions/plans', data),
  updatePlan: (id: string, data: any) => platformClient.patch(`/subscriptions/plans/${id}`, data),
  deletePlan: (id: string) => platformClient.delete(`/subscriptions/plans/${id}`),
  assignPlan: (orgId: string, data: { planId: string; status?: string }) => platformClient.patch(`/subscriptions/organizations/${orgId}/subscription`, data),
};

export const platformHealthAPI = {
  status: () => platformClient.get('/health'),
  check: () => platformClient.post('/health/check'),
};

export const platformAuditAPI = {
  list: (params?: any) => platformClient.get('/audit', { params }),
  get: (id: string) => platformClient.get(`/audit/${id}`),
};

export const platformBroadcastsAPI = {
  list: () => platformClient.get('/broadcasts'),
  get: (id: string) => platformClient.get(`/broadcasts/${id}`),
  create: (data: any) => platformClient.post('/broadcasts', data),
  update: (id: string, data: any) => platformClient.patch(`/broadcasts/${id}`, data),
  delete: (id: string) => platformClient.delete(`/broadcasts/${id}`),
};

export const platformConfigAPI = {
  list: () => platformClient.get('/config'),
  get: (key: string) => platformClient.get(`/config/${key}`),
  update: (configs: Array<{ key: string; value: string; description?: string; category?: string }>) =>
    platformClient.patch('/config', { configs }),
};
