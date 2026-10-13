import { AxiosInstance } from 'axios';

export interface FarmsAPI {
  list: (params?: any) => Promise<any>;
  get: (id: string) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
  all: () => Promise<any>;
  updateLocation: (id: string, data: { latitude: number; longitude: number }) => Promise<any>;
  exportFarms: (format?: string) => Promise<any>;
  importFarms: (data: any[]) => Promise<any>;
  exportCrops: (format?: string) => Promise<any>;
  exportWorkers: (format?: string) => Promise<any>;
}

export function createFarmsAPI(client: AxiosInstance): FarmsAPI {
  return {
    list: (params) => client.get('/farms', { params }),
    get: (id) => client.get(`/farms/${id}`),
    create: (data) => client.post('/farms', data),
    update: (id, data) => client.put(`/farms/${id}`, data),
    delete: (id) => client.delete(`/farms/${id}`),
    all: () => client.get('/farms/map/all'),
    updateLocation: (id, data) => client.put(`/farms/map/${id}/location`, data),
    exportFarms: (format) => client.get('/farms/export/farms', { params: { format }, responseType: format === 'csv' ? 'blob' : undefined }),
    importFarms: (data) => client.post('/farms/import/farms', { data }),
    exportCrops: (format) => client.get('/farms/export/crops', { params: { format }, responseType: format === 'csv' ? 'blob' : undefined }),
    exportWorkers: (format) => client.get('/farms/export/workers', { params: { format }, responseType: format === 'csv' ? 'blob' : undefined }),
  };
}
