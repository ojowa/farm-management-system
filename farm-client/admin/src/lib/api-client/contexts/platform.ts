import { AxiosInstance } from 'axios';

export interface WeatherAPI {
  current: (lat: number, lon: number) => Promise<any>;
  forecast: (lat: number, lon: number, days?: number) => Promise<any>;
  alerts: (lat: number, lon: number) => Promise<any>;
}

export function createWeatherAPI(client: AxiosInstance): WeatherAPI {
  return {
    current: (lat, lon) => client.get('/weather/current', { params: { lat, lon } }),
    forecast: (lat, lon, days) => client.get('/weather/forecast', { params: { lat, lon, days } }),
    alerts: (lat, lon) => client.get('/weather/alerts', { params: { lat, lon } }),
  };
}

export interface DocumentsAPI {
  list: (params?: any) => Promise<any>;
  upload: (formData: FormData) => Promise<any>;
  delete: (id: string) => Promise<any>;
}

export function createDocumentsAPI(client: AxiosInstance): DocumentsAPI {
  return {
    list: (params) => client.get('/documents', { params }),
    upload: (formData) => client.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    delete: (id) => client.delete(`/documents/${id}`),
  };
}

// Owner-only billing views — the server gates all of these on `billing.manage`.
export interface SubscriptionAPI {
  /** Snapshot: linked plan, entitlements, usage, and Paystack billing state. */
  current: () => Promise<any>;
  listPlans: () => Promise<any>;
  /** Free-plan switch (paid plans are rejected server-side: checkout instead). */
  changePlan: (planId: string) => Promise<any>;
  /** Hosted Paystack checkout: { reference, authorizationUrl }. */
  checkout: (planId: string) => Promise<any>;
  /** Poll a reference until it settles (SUCCESS | FAILED | ABANDONED). */
  checkoutStatus: (reference: string) => Promise<any>;
  /** This org's payment history: { payments, total }. */
  payments: (limit?: number) => Promise<any>;
  /** Stop auto-renewal: { status: 'CANCELLED', paidThrough }. */
  cancel: () => Promise<any>;
  /** Re-enable a cancelled subscription: { status: 'ACTIVE', paidThrough }. */
  resume: () => Promise<any>;
}

export function createSubscriptionAPI(client: AxiosInstance): SubscriptionAPI {
  return {
    current: () => client.get('/organizations/subscription'),
    listPlans: () => client.get('/organizations/subscription-plans'),
    changePlan: (planId) => client.patch('/organizations/subscription', { planId }),
    checkout: (planId) => client.post('/organizations/subscription/checkout', { planId }),
    checkoutStatus: (reference) =>
      client.get(`/organizations/subscription/checkout/${encodeURIComponent(reference)}`),
    payments: (limit) => client.get('/organizations/subscription/payments', { params: limit ? { limit } : undefined }),
    cancel: () => client.post('/organizations/subscription/cancel'),
    resume: () => client.post('/organizations/subscription/resume'),
  };
}
