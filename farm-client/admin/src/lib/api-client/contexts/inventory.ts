import { AxiosInstance } from 'axios';

export interface InventoryAPI {
  list: (params?: any) => Promise<any>;
  get: (id: string) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
  export: (format?: string) => Promise<any>;
  import: (data: any[]) => Promise<any>;
}

export function createInventoryAPI(client: AxiosInstance): InventoryAPI {
  return {
    list: (params) => client.get('/inventory', { params }),
    get: (id) => client.get(`/inventory/${id}`),
    create: (data) => client.post('/inventory', data),
    update: (id, data) => client.put(`/inventory/${id}`, data),
    delete: (id) => client.delete(`/inventory/${id}`),
    export: (format) => client.get('/inventory/export', { params: { format }, responseType: format === 'csv' ? 'blob' : undefined }),
    import: (data) => client.post('/inventory/import', { data }),
  };
}

export interface LowStockAPI {
  list: () => Promise<any>;
  reorder: (id: string) => Promise<any>;
}

export function createLowStockAPI(client: AxiosInstance): LowStockAPI {
  return {
    list: () => client.get('/inventory/low-stock'),
    reorder: (id) => client.post(`/inventory/${id}/reorder`),
  };
}

export interface EquipmentAPI {
  list: (params?: any) => Promise<any>;
  get: (id: string) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
  maintenanceHistory: (id: string) => Promise<any>;
  addMaintenance: (id: string, data: any) => Promise<any>;
}

export function createEquipmentAPI(client: AxiosInstance): EquipmentAPI {
  return {
    list: (params) => client.get('/inventory/equipment', { params }),
    get: (id) => client.get(`/inventory/equipment/${id}`),
    create: (data) => client.post('/inventory/equipment', data),
    update: (id, data) => client.put(`/inventory/equipment/${id}`, data),
    delete: (id) => client.delete(`/inventory/equipment/${id}`),
    maintenanceHistory: (id) => client.get(`/inventory/equipment/${id}/maintenance`),
    addMaintenance: (id, data) => client.post(`/inventory/equipment/${id}/maintenance`, data),
  };
}
