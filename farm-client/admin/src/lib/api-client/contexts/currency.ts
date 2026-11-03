import { AxiosInstance } from 'axios';

export interface CurrencyAPI {
  list: (params?: any) => Promise<any>;
  get: (code: string) => Promise<any>;
  create: (data: any) => Promise<any>;
  update: (code: string, data: any) => Promise<any>;
  delete: (code: string) => Promise<any>;
  // Exchange rates
  listRates: (params?: { fromCurrency?: string; toCurrency?: string }) => Promise<any>;
  setRate: (data: any) => Promise<any>;
  // Conversion
  convert: (data: { amount: number; fromCurrency: string; toCurrency: string }) => Promise<any>;
  convertToOrgBase: (data: { amount: number; fromCurrency: string; organizationId: string }) => Promise<any>;
}

export function createCurrencyAPI(client: AxiosInstance): CurrencyAPI {
  return {
    list: (params) => client.get('/currencies', { params }),
    get: (code) => client.get(`/currencies/${code}`),
    create: (data) => client.post('/currencies', data),
    update: (code, data) => client.put(`/currencies/${code}`, data),
    delete: (code) => client.delete(`/currencies/${code}`),
    listRates: (params) => client.get('/currencies/rates', { params }),
    setRate: (data) => client.post('/currencies/rates', data),
    convert: (data) => client.post('/currencies/convert', data),
    convertToOrgBase: (data) => client.post('/currencies/convert/organization-base', data),
  };
}
