import { AxiosInstance } from 'axios';

export interface AuthAPI {
  login: (data: { email: string; password: string }) => Promise<any>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<any>;
  refresh: () => Promise<any>;
  logout: () => Promise<any>;
  getProfile: () => Promise<any>;
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string; avatar?: string }) => Promise<any>;
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<any>;
  getPreferences: () => Promise<any>;
  updatePreferences: (data: { notificationPreferences?: any }) => Promise<any>;
}

export function createAuthAPI(client: AxiosInstance): AuthAPI {
  return {
    login: (data) => client.post('/auth/login', data),
    register: (data) => client.post('/auth/register', data),
    refresh: () => client.post('/auth/refresh'),
    logout: () => client.post('/auth/logout'),
    getProfile: () => client.get('/auth/me'),
    updateProfile: (data) => client.put('/auth/profile', data),
    changePassword: (data) => client.put('/auth/password', data),
    getPreferences: () => client.get('/auth/preferences'),
    updatePreferences: (data) => client.put('/auth/preferences', data),
  };
}

export interface RolesAPI {
  list: () => Promise<any>;
  get: (id: string) => Promise<any>;
  create: (data: { name: string; description?: string; permissionIds?: string[] }) => Promise<any>;
  update: (id: string, data: { name?: string; description?: string; permissionIds?: string[] }) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createRolesAPI(client: AxiosInstance): RolesAPI {
  return {
    list: () => client.get('/roles'),
    get: (id) => client.get(`/roles/${id}`),
    create: (data) => client.post('/roles', data),
    update: (id, data) => client.put(`/roles/${id}`, data),
    delete: (id) => client.delete(`/roles/${id}`),
  };
}

export interface OrgAdminAPI {
  getOrganization: () => Promise<any>;
  updateOrganization: (data: any) => Promise<any>;
  listUsers: () => Promise<any>;
  inviteUser: (data: { firstName: string; lastName: string; email: string; roleId?: string; phone?: string }) => Promise<any>;
  updateUser: (userId: string, data: any) => Promise<any>;
  removeUser: (userId: string) => Promise<any>;
  listRoles: () => Promise<any>;
  getRole: (id: string) => Promise<any>;
  createRole: (data: { name: string; description?: string; permissionIds?: string[] }) => Promise<any>;
  updateRole: (id: string, data: { name?: string; description?: string; permissionIds?: string[] }) => Promise<any>;
  deleteRole: (id: string) => Promise<any>;
}

export function createOrgAdminAPI(client: AxiosInstance): OrgAdminAPI {
  return {
    getOrganization: () => client.get('/org-admin/me'),
    updateOrganization: (data) => client.put('/org-admin/me', data),
    listUsers: () => client.get('/org-admin/users'),
    inviteUser: (data) => client.post('/org-admin/users', data),
    updateUser: (userId, data) => client.put(`/org-admin/users/${userId}`, data),
    removeUser: (userId) => client.delete(`/org-admin/users/${userId}`),
    listRoles: () => client.get('/org-admin/roles'),
    getRole: (id) => client.get(`/org-admin/roles/${id}`),
    createRole: (data) => client.post('/org-admin/roles', data),
    updateRole: (id, data) => client.put(`/org-admin/roles/${id}`, data),
    deleteRole: (id) => client.delete(`/org-admin/roles/${id}`),
  };
}

export interface AdminAPI {
  listOrganizations: () => Promise<any>;
  updateOrgSubscription: (orgId: string, data: any) => Promise<any>;
  listUsers: () => Promise<any>;
  updateUser: (userId: string, data: any) => Promise<any>;
}

export function createAdminAPI(client: AxiosInstance): AdminAPI {
  return {
    listOrganizations: () => client.get('/admin/organizations'),
    updateOrgSubscription: (orgId, data) => client.put(`/admin/organizations/${orgId}/subscription`, data),
    listUsers: () => client.get('/admin/users'),
    updateUser: (userId, data) => client.put(`/admin/users/${userId}`, data),
  };
}
