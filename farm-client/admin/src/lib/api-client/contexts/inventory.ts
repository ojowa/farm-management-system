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
}

export function createEquipmentAPI(client: AxiosInstance): EquipmentAPI {
  // Equipment lives under /equipment (EquipmentController). The old
  // /inventory/equipment base only served the GET list — create/update/delete
  // all 404'd. There are no maintenance endpoints on the server, so the
  // previous maintenanceHistory/addMaintenance methods are gone.
  return {
    list: (params) => client.get('/equipment', { params }),
    get: (id) => client.get(`/equipment/${id}`),
    create: (data) => client.post('/equipment', data),
    update: (id, data) => client.put(`/equipment/${id}`, data),
    delete: (id) => client.delete(`/equipment/${id}`),
  };
}
