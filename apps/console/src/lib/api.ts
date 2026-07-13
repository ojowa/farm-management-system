import axios from 'axios';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://localhost:4001';

export const platformClient = axios.create({
  baseURL: `${API_GATEWAY_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const authClient = axios.create({
  baseURL: AUTH_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const platformUsersAPI = {
  list: (params?: any) => platformClient.get('/platform-users', { params }),
  get: (id: string) => platformClient.get(`/platform-users/${id}`),
  update: (id: string, data: any) => platformClient.patch(`/platform-users/${id}`, data),
  deactivate: (id: string) => platformClient.delete(`/platform-users/${id}`),
  impersonate: (id: string) => platformClient.post(`/platform-users/${id}/impersonate`),
  forceLogout: (id: string) => platformClient.post(`/platform-users/${id}/force-logout`),
  sessions: (id: string) => platformClient.get(`/platform-users/${id}/sessions`),
  toggleActive: (userId: string) =>
    platformClient.put(`/platform-users/${userId}/toggle-active`),
};

export const platformOrgsAPI = {
  list: (params?: any) => platformClient.get('/platform-organizations', { params }),
  get: (id: string) => platformClient.get(`/platform-organizations/${id}`),
  create: (data: any) => platformClient.post('/platform-organizations', data),
  update: (id: string, data: any) => platformClient.patch(`/platform-organizations/${id}`, data),
  delete: (id: string) => platformClient.delete(`/platform-organizations/${id}`),
  suspend: (id: string) => platformClient.post(`/platform-organizations/${id}/suspend`),
  activate: (id: string) => platformClient.post(`/platform-organizations/${id}/activate`),
  stats: (id: string) => platformClient.get(`/platform-organizations/${id}/stats`),
  members: (id: string) => platformClient.get(`/platform-organizations/${id}/members`),
  updateSubscription: (id: string, data: { subscriptionPlan?: string; subscriptionStatus?: string }) =>
    platformClient.patch(`/platform-organizations/${id}/subscription`, data),
  toggleUserActive: (userId: string) =>
    platformClient.put(`/platform-users/${userId}/toggle-active`),
};

export const platformFeaturesAPI = {
  list: () => platformClient.get('/platform-features'),
  get: (id: string) => platformClient.get(`/platform-features/${id}`),
  toggle: (id: string, data: { isEnabled: boolean }) => platformClient.patch(`/platform-features/${id}`, data),
  overrides: (id: string) => platformClient.get(`/platform-features/${id}/overrides`),
  setOverride: (id: string, data: { organizationId: string; isEnabled: boolean }) => platformClient.post(`/platform-features/${id}/overrides`, data),
  deleteOverride: (id: string, orgId: string) => platformClient.delete(`/platform-features/${id}/overrides/${orgId}`),
};

export const platformSubscriptionsAPI = {
  listPlans: () => platformClient.get('/platform-subscriptions/plans'),
  getPlan: (id: string) => platformClient.get(`/platform-subscriptions/plans/${id}`),
  createPlan: (data: any) => platformClient.post('/platform-subscriptions/plans', data),
  updatePlan: (id: string, data: any) => platformClient.patch(`/platform-subscriptions/plans/${id}`, data),
  deletePlan: (id: string) => platformClient.delete(`/platform-subscriptions/plans/${id}`),
  assignPlan: (orgId: string, data: { planId: string; status?: string }) => platformClient.patch(`/platform-organizations/${orgId}/subscription`, data),
};

export const platformHealthAPI = {
  status: () => platformClient.get('/platform-health'),
  check: () => platformClient.post('/platform-health/check'),
};

export const platformAuditAPI = {
  list: (params?: any) => platformClient.get('/platform-audit', { params }),
  get: (id: string) => platformClient.get(`/platform-audit/${id}`),
};

export const platformBroadcastsAPI = {
  list: () => platformClient.get('/platform-broadcasts'),
  get: (id: string) => platformClient.get(`/platform-broadcasts/${id}`),
  create: (data: any) => platformClient.post('/platform-broadcasts', data),
  update: (id: string, data: any) => platformClient.patch(`/platform-broadcasts/${id}`, data),
  delete: (id: string) => platformClient.delete(`/platform-broadcasts/${id}`),
};

export const platformConfigAPI = {
  list: () => platformClient.get('/platform-config'),
  get: (key: string) => platformClient.get(`/platform-config/${key}`),
  update: (configs: Array<{ key: string; value: string; description?: string; category?: string }>) =>
    platformClient.patch('/platform-config', { configs }),
};

export const platformOptionsAPI = {
  all: () => platformClient.get('/platform-options'),
  plans: () => platformClient.get('/platform-options/plans'),
  statuses: () => platformClient.get('/platform-options/statuses'),
  broadcastTypes: () => platformClient.get('/platform-options/broadcast-types'),
  roles: () => platformClient.get('/platform-options/roles'),
  platformAdminRoles: () => platformClient.get('/platform-options/platform-admin-roles'),
};

export const platformRolesAPI = {
  list: () => authClient.get('/platform-roles'),
  get: (id: string) => authClient.get(`/platform-roles/${id}`),
  create: (data: any) => authClient.post('/platform-roles', data),
  update: (id: string, data: any) => authClient.put(`/platform-roles/${id}`, data),
  delete: (id: string) => authClient.delete(`/platform-roles/${id}`),
  setPermissions: (id: string, permissionIds: string[]) => authClient.post(`/platform-roles/${id}/permissions`, { permissionIds }),
};

export const platformPermissionsAPI = {
  list: () => authClient.get('/platform-permissions'),
  create: (data: any) => authClient.post('/platform-permissions', data),
  delete: (id: string) => authClient.delete(`/platform-permissions/${id}`),
};

export const platformApiKeysAPI = {
  list: () => authClient.get('/platform-api-keys'),
  create: (data: any) => authClient.post('/platform-api-keys', data),
  toggle: (id: string) => authClient.patch(`/platform-api-keys/${id}/toggle`),
  delete: (id: string) => authClient.delete(`/platform-api-keys/${id}`),
};
