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
    list: (params) => client.get('/reporting/reports', { params }),
    get: (id) => client.get(`/reporting/reports/${id}`),
    create: (data) => client.post('/reporting/reports', data),
    generate: (templateId) => client.post('/reporting/reports/generate', { templateId }),
    update: (id, data) => client.put(`/reporting/reports/${id}`, data),
    delete: (id) => client.delete(`/reporting/reports/${id}`),
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
    list: () => client.get('/reporting/schedule'),
    create: (data) => client.post('/reporting/schedule', data),
    update: (id, data) => client.put(`/reporting/schedule/${id}`, data),
    delete: (id) => client.delete(`/reporting/schedule/${id}`),
  };
}
