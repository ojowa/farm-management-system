import { AxiosInstance } from 'axios';

export interface ReportsAPI {
  list: (params?: any) => Promise<any>;
  get: (id: string) => Promise<any>;
  create: (data: any) => Promise<any>;
  generate: (templateId: string) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createReportsAPI(client: AxiosInstance): ReportsAPI {
  return {
    list: (params) => client.get('/reports', { params }),
    get: (id) => client.get(`/reports/${id}`),
    create: (data) => client.post('/reports', data),
    generate: (templateId) => client.post('/reports/generate', { templateId }),
    update: (id, data) => client.put(`/reports/${id}`, data),
    delete: (id) => client.delete(`/reports/${id}`),
  };
}

export interface ScheduledReportsAPI {
  list: () => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createScheduledReportsAPI(client: AxiosInstance): ScheduledReportsAPI {
  return {
    list: () => client.get('/schedule'),
    create: (data) => client.post('/schedule', data),
    update: (id, data) => client.put(`/schedule/${id}`, data),
    delete: (id) => client.delete(`/schedule/${id}`),
  };
}
