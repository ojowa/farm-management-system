import { AxiosInstance } from 'axios';

export interface FinanceAPI {
  listExpenses: (params?: any) => Promise<any>;
  getExpense: (id: string) => Promise<any>;
  createExpense: (data: any) => Promise<any>;
  updateExpense: (id: string, data: any) => Promise<any>;
  deleteExpense: (id: string) => Promise<any>;
  listSales: (params?: any) => Promise<any>;
  getSale: (id: string) => Promise<any>;
  createSale: (data: any) => Promise<any>;
  updateSale: (id: string, data: any) => Promise<any>;
  deleteSale: (id: string) => Promise<any>;
}

export function createFinanceAPI(client: AxiosInstance): FinanceAPI {
  return {
    listExpenses: (params) => client.get('/finance/expenses', { params }),
    getExpense: (id) => client.get(`/finance/expenses/${id}`),
    createExpense: (data) => client.post('/finance/expenses', data),
    updateExpense: (id, data) => client.put(`/finance/expenses/${id}`, data),
    deleteExpense: (id) => client.delete(`/finance/expenses/${id}`),
    listSales: (params) => client.get('/finance/sales', { params }),
    getSale: (id) => client.get(`/finance/sales/${id}`),
    createSale: (data) => client.post('/finance/sales', data),
    updateSale: (id, data) => client.put(`/finance/sales/${id}`, data),
    deleteSale: (id) => client.delete(`/finance/sales/${id}`),
  };
}

export interface ProfitabilityAPI {
  byFarm: (params?: any) => Promise<any>;
  summary: (params?: any) => Promise<any>;
}

export function createProfitabilityAPI(client: AxiosInstance): ProfitabilityAPI {
  return {
    byFarm: (params) => client.get('/finance/profitability/farm', { params }),
    summary: (params) => client.get('/finance/profitability/summary', { params }),
  };
}

export interface ContractsAPI {
  list: (params?: any) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createContractsAPI(client: AxiosInstance): ContractsAPI {
  return {
    list: (params) => client.get('/finance/contracts', { params }),
    create: (data) => client.post('/finance/contracts', data),
    update: (id, data) => client.put(`/finance/contracts/${id}`, data),
    delete: (id) => client.delete(`/finance/contracts/${id}`),
  };
}

export interface MarketplaceAPI {
  listBuyers: (params?: any) => Promise<any>;
  createBuyer: (data: any) => Promise<any>;
  updateBuyer: (id: string, data: any) => Promise<any>;
  deleteBuyer: (id: string) => Promise<any>;
  listListings: (params?: any) => Promise<any>;
  createListing: (data: any) => Promise<any>;
  updateListing: (id: string, data: any) => Promise<any>;
  deleteListing: (id: string) => Promise<any>;
}

export function createMarketplaceAPI(client: AxiosInstance): MarketplaceAPI {
  return {
    listBuyers: (params) => client.get('/finance/marketplace/buyers', { params }),
    createBuyer: (data) => client.post('/finance/marketplace/buyers', data),
    updateBuyer: (id, data) => client.put(`/finance/marketplace/buyers/${id}`, data),
    deleteBuyer: (id) => client.delete(`/finance/marketplace/buyers/${id}`),
    listListings: (params) => client.get('/finance/marketplace/listings', { params }),
    createListing: (data) => client.post('/finance/marketplace/listings', data),
    updateListing: (id, data) => client.put(`/finance/marketplace/listings/${id}`, data),
    deleteListing: (id) => client.delete(`/finance/marketplace/listings/${id}`),
  };
}
