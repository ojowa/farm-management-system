import axios from 'axios';

const PLATFORM_API_URL = process.env.NEXT_PUBLIC_PLATFORM_API_URL || 'http://localhost:4020';

export const platformClient = axios.create({
  baseURL: PLATFORM_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

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
  updateSubscription: (id: string, data: { subscriptionPlan?: string; subscriptionStatus?: string }) =>
    platformClient.patch(`/organizations/${id}/subscription`, data),
  toggleUserActive: (userId: string) =>
    platformClient.put(`/users/${userId}/toggle-active`),
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