import axios, { AxiosInstance } from 'axios';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type {
  ApiResponse,
  PaginatedResponse,
  LoginRequest,
  LoginResponse,
  VerifyMfaRequest,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  User,
  Farm,
  CreateFarmRequest,
  UpdateFarmRequest,
  Field,
  CreateFieldRequest,
  Crop,
  CreateCropRequest,
  CropCycle,
  CreateCropCycleRequest,
  Livestock,
  CreateLivestockRequest,
  UpdateLivestockRequest,
  Flock,
  CreateFlockRequest,
  Expense,
  CreateExpenseRequest,
  Sale,
  CreateSaleRequest,
  Worker,
  CreateWorkerRequest,
  Attendance,
  ClockInRequest,
  Task,
  Shift,
  ShiftAssignment,
  LeaveRequest,
  LeaveType,
  Message,
  Correspondence,
  Notification,
  Report,
  ScheduledReport,
  Contract,
  Buyer,
  MarketListing,
  ProfitabilitySummary,
  FarmProfitability,
  HealthRecord,
  VaccinationSchedule,
  BreedingRecord,
  WeightRecord,
  PoultryHouse,
  Pen,
  Breed,
  FeedingRecord,
  VaccinationRecord,
  MortalityRecord,
  Medication,
  Organization,
  ListParams,
} from './types';

// ─── Config ────────────────────────────────────────────────────────────────────

declare const process: { env?: Record<string, string | undefined> } | undefined;

const API_BASE_URL: string =
  (typeof process !== 'undefined' && process?.env?.EXPO_PUBLIC_API_URL) || '';

if (!API_BASE_URL && typeof process !== 'undefined' && process.env?.NODE_ENV !== 'test') {
  throw new Error('[API] EXPO_PUBLIC_API_URL is not set. Create a .env file with your API URL.');
}

const APP_VERSION: string = Constants.expoConfig?.version || '1.0.0';

let _storeRef: any = null;
function getStore() {
  if (!_storeRef) {
    try {
      _storeRef = require('../store/store').store;
    } catch {}
  }
  return _storeRef;
}

if (__DEV__ && API_BASE_URL.startsWith('http://') && !API_BASE_URL.includes('localhost') && !API_BASE_URL.includes('192.168.')) {
  console.warn('[API] WARNING: Using HTTP in non-local environment.');
}

if (!__DEV__ && API_BASE_URL.startsWith('http://')) {
  throw new Error('[API] HTTP is not allowed in production. Use HTTPS.');
}

// ─── API Client ────────────────────────────────────────────────────────────────

class APIClient {
  public client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'x-platform': Platform.OS,
        'x-app-version': APP_VERSION,
        'x-device-id': Device.osInternalBuildId || Device.modelName || 'unknown',
      },
    });

    let isRefreshing = false;
    let failedQueue: Array<{ resolve: (v?: unknown) => void; reject: (e: unknown) => void }> = [];

    const processQueue = (error: unknown) => {
      failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
      failedQueue = [];
    };

    // Auto-unwrap { success, data, timestamp, requestId } envelope
    this.client.interceptors.response.use(
      (response) => {
        if (response.data && typeof response.data === 'object' && 'success' in response.data && 'data' in response.data) {
          response.data = response.data.data;
        }
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then(() => this.client(originalRequest))
              .catch((err) => Promise.reject(err));
          }
          originalRequest._retry = true;
          isRefreshing = true;
          try {
            await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
            processQueue(null);
            return this.client(originalRequest);
          } catch (e) {
            processQueue(e);
            try {
              const store = getStore();
              const { logout } = require('../modules/auth/services/authSlice');
              store?.dispatch(logout());
            } catch {}
            return Promise.reject(e);
          } finally {
            isRefreshing = false;
          }
        }
        return Promise.reject(error);
      }
    );
  }
}

export const apiClient = new APIClient();
const http = apiClient.client;

// ─── Auth ──────────────────────────────────────────────────────────────────────

export const authAPI = {
  login: (data: LoginRequest) =>
    http.post<LoginResponse>('/auth/login', data),
  register: (data: RegisterRequest) =>
    http.post('/auth/register', data),
  verifyMFA: (data: VerifyMfaRequest) =>
    http.post<LoginResponse>('/auth/verify-mfa', data),
  refresh: () =>
    http.post('/auth/refresh'),
  logout: () =>
    http.post('/auth/logout').catch(() => {}),
  getProfile: () =>
    http.get<User>('/auth/me'),
  updateProfile: (data: UpdateProfileRequest) =>
    http.put<User>('/auth/profile', data),
  changePassword: (data: ChangePasswordRequest) =>
    http.put('/auth/password', data),
  getPreferences: () =>
    http.get('/auth/preferences'),
  updatePreferences: (data: any) =>
    http.put('/auth/preferences', data),
  generate2FA: () =>
    http.post('/auth/2fa/generate'),
  enable2FA: (code: string) =>
    http.post('/auth/2fa/enable', { code }),
  disable2FA: (code: string) =>
    http.post('/auth/2fa/disable', { code }),
  listSessions: () =>
    http.get('/auth/sessions'),
  deleteSession: (tokenId: string) =>
    http.delete(`/auth/sessions/${tokenId}`),
  deleteAllSessions: () =>
    http.delete('/auth/sessions'),
};

// ─── Farm ──────────────────────────────────────────────────────────────────────

export const farmsAPI = {
  list: (params?: ListParams) =>
    http.get<Farm[]>('/farms', { params }),
  get: (id: string) =>
    http.get<Farm>(`/farms/${id}`),
  create: (data: CreateFarmRequest) =>
    http.post<Farm>('/farms', data),
  update: (id: string, data: UpdateFarmRequest) =>
    http.put<Farm>(`/farms/${id}`, data),
  delete: (id: string) =>
    http.delete(`/farms/${id}`),
};

// ─── Fields ────────────────────────────────────────────────────────────────────

export const fieldsAPI = {
  list: (params?: { farmId?: string }) =>
    http.get<Field[]>('/fields', { params }),
  get: (id: string) =>
    http.get<Field>(`/fields/${id}`),
  create: (data: CreateFieldRequest) =>
    http.post<Field>('/fields', data),
  update: (id: string, data: { name?: string; size?: number }) =>
    http.put<Field>(`/fields/${id}`, data),
  delete: (id: string) =>
    http.delete(`/fields/${id}`),
};

// ─── Crop ──────────────────────────────────────────────────────────────────────

export const cropsAPI = {
  list: (params?: ListParams) =>
    http.get<Crop[]>('/crops', { params }),
  get: (id: string) =>
    http.get<Crop>(`/crops/${id}`),
  create: (data: CreateCropRequest) =>
    http.post<Crop>('/crops', data),
  update: (id: string, data: { name?: string }) =>
    http.put<Crop>(`/crops/${id}`, data),
  delete: (id: string) =>
    http.delete(`/crops/${id}`),
  listCycles: (params?: ListParams & { fieldId?: string; cropId?: string; status?: string }) =>
    http.get<CropCycle[]>('/crop-cycles', { params }),
  getCycle: (id: string) =>
    http.get<CropCycle>(`/crop-cycles/${id}`),
  createCycle: (data: CreateCropCycleRequest) =>
    http.post<CropCycle>('/crop-cycles', data),
  updateCycle: (id: string, data: Partial<CreateCropCycleRequest>) =>
    http.put<CropCycle>(`/crop-cycles/${id}`, data),
  deleteCycle: (id: string) =>
    http.delete(`/crop-cycles/${id}`),
};

// ─── Crop Stages / Lifecycle ──────────────────────────────────────────────────

export const cropStagesAPI = {
  calendar: (params?: any) =>
    http.get('/crops/lifecycle/calendar', { params }),
  listByCycle: (cropCycleId: string) =>
    http.get(`/crops/lifecycle/crop-cycle/${cropCycleId}/stages`),
  create: (cropCycleId: string, data: any) =>
    http.post(`/crops/lifecycle/crop-cycle/${cropCycleId}/stages`, data),
  update: (id: string, data: any) =>
    http.put(`/crops/lifecycle/stages/${id}`, data),
  delete: (id: string) =>
    http.delete(`/crops/lifecycle/stages/${id}`),
};

// ─── Livestock ─────────────────────────────────────────────────────────────────

export const livestockAPI = {
  list: (params?: ListParams & { farmId?: string; species?: string; status?: string }) =>
    http.get<Livestock[]>('/livestock', { params }),
  get: (id: string) =>
    http.get<Livestock>(`/livestock/${id}`),
  create: (data: CreateLivestockRequest) =>
    http.post<Livestock>('/livestock', data),
  update: (id: string, data: UpdateLivestockRequest) =>
    http.put<Livestock>(`/livestock/${id}`, data),
  delete: (id: string) =>
    http.delete(`/livestock/${id}`),
};

// ─── Livestock Health ─────────────────────────────────────────────────────────

export const livestockHealthAPI = {
  listByAnimal: (livestockId: string) =>
    http.get<HealthRecord[]>(`/health/livestock/${livestockId}`),
  create: (livestockId: string, data: any) =>
    http.post<HealthRecord>(`/health/livestock/${livestockId}`, data),
  listVaccinations: (livestockId: string) =>
    http.get<VaccinationSchedule[]>(`/health/vaccinations/${livestockId}`),
  scheduleVaccination: (livestockId: string, data: any) =>
    http.post<VaccinationSchedule>(`/health/vaccinations/${livestockId}`, data),
  administerVaccination: (id: string) =>
    http.put(`/health/vaccinations/${id}/administer`),
  overdueVaccinations: () =>
    http.get<VaccinationSchedule[]>('/health/overdue'),
};

// ─── Breeding ──────────────────────────────────────────────────────────────────

export const breedingAPI = {
  list: (params?: { status?: string }) =>
    http.get<BreedingRecord[]>('/breeding', { params }),
  create: (data: any) =>
    http.post<BreedingRecord>('/breeding', data),
  update: (id: string, data: any) =>
    http.put<BreedingRecord>(`/breeding/${id}`, data),
  upcoming: () =>
    http.get<BreedingRecord[]>('/breeding/upcoming'),
};

// ─── Weight ────────────────────────────────────────────────────────────────────

export const weightAPI = {
  listByAnimal: (livestockId: string) =>
    http.get<WeightRecord[]>(`/weight/livestock/${livestockId}`),
  recordForAnimal: (livestockId: string, data: any) =>
    http.post<WeightRecord>(`/weight/livestock/${livestockId}`, data),
  listByFlock: (flockId: string) =>
    http.get<WeightRecord[]>(`/weight/flock/${flockId}`),
  recordForFlock: (flockId: string, data: any) =>
    http.post<WeightRecord>(`/weight/flock/${flockId}`, data),
};

// ─── Poultry Houses ───────────────────────────────────────────────────────────

export const poultryHousesAPI = {
  list: (params?: any) =>
    http.get<PoultryHouse[]>('/poultry-houses', { params }),
  get: (id: string) =>
    http.get<PoultryHouse>(`/poultry-houses/${id}`),
  create: (data: { farmId: string; name: string; capacity: number }) =>
    http.post<PoultryHouse>('/poultry-houses', data),
  update: (id: string, data: any) =>
    http.put<PoultryHouse>(`/poultry-houses/${id}`, data),
  delete: (id: string) =>
    http.delete(`/poultry-houses/${id}`),
};

// ─── Pens ──────────────────────────────────────────────────────────────────────

export const pensAPI = {
  list: (params?: any) =>
    http.get<Pen[]>('/pens', { params }),
  get: (id: string) =>
    http.get<Pen>(`/pens/${id}`),
  create: (data: any) =>
    http.post<Pen>('/pens', data),
  update: (id: string, data: any) =>
    http.put<Pen>(`/pens/${id}`, data),
  delete: (id: string) =>
    http.delete(`/pens/${id}`),
};

// ─── Breeds ────────────────────────────────────────────────────────────────────

export const breedsAPI = {
  list: (params?: any) =>
    http.get<Breed[]>('/breeds', { params }),
  get: (id: string) =>
    http.get<Breed>(`/breeds/${id}`),
  create: (data: any) =>
    http.post<Breed>('/breeds', data),
  update: (id: string, data: any) =>
    http.put<Breed>(`/breeds/${id}`, data),
  delete: (id: string) =>
    http.delete(`/breeds/${id}`),
};

// ─── Flocks ────────────────────────────────────────────────────────────────────

export const poultryAPI = {
  list: (params?: any) =>
    http.get<Flock[]>('/flocks', { params }),
  get: (id: string) =>
    http.get<Flock>(`/flocks/${id}`),
  create: (data: CreateFlockRequest) =>
    http.post<Flock>('/flocks', data),
  update: (id: string, data: any) =>
    http.put<Flock>(`/flocks/${id}`, data),
  delete: (id: string) =>
    http.delete(`/flocks/${id}`),
  listPens: (params?: any) =>
    http.get<Pen[]>('/pens', { params }),
  listBreeds: (params?: any) =>
    http.get<Breed[]>('/breeds', { params }),
};

// ─── Feeding Records ──────────────────────────────────────────────────────────

export const feedingRecordsAPI = {
  list: (params?: any) =>
    http.get<FeedingRecord[]>('/feeding-records', { params }),
  get: (id: string) =>
    http.get<FeedingRecord>(`/feeding-records/${id}`),
  create: (data: { flockId: string; feedType: string; quantityKg: number; date: string }) =>
    http.post<FeedingRecord>('/feeding-records', data),
  update: (id: string, data: any) =>
    http.put<FeedingRecord>(`/feeding-records/${id}`, data),
  delete: (id: string) =>
    http.delete(`/feeding-records/${id}`),
};

// ─── Vaccination Records ──────────────────────────────────────────────────────

export const vaccinationRecordsAPI = {
  list: (params?: any) =>
    http.get<VaccinationRecord[]>('/vaccination-records', { params }),
  get: (id: string) =>
    http.get<VaccinationRecord>(`/vaccination-records/${id}`),
  create: (data: { flockId: string; vaccine: string; dosage?: string; date: string }) =>
    http.post<VaccinationRecord>('/vaccination-records', data),
  update: (id: string, data: any) =>
    http.put<VaccinationRecord>(`/vaccination-records/${id}`, data),
  delete: (id: string) =>
    http.delete(`/vaccination-records/${id}`),
};

// ─── Mortality Records ────────────────────────────────────────────────────────

export const mortalityRecordsAPI = {
  list: (params?: any) =>
    http.get<MortalityRecord[]>('/mortality-records', { params }),
  get: (id: string) =>
    http.get<MortalityRecord>(`/mortality-records/${id}`),
  create: (data: { flockId: string; count: number; cause?: string; date: string }) =>
    http.post<MortalityRecord>('/mortality-records', data),
  update: (id: string, data: any) =>
    http.put<MortalityRecord>(`/mortality-records/${id}`, data),
  delete: (id: string) =>
    http.delete(`/mortality-records/${id}`),
};

// ─── Medications ──────────────────────────────────────────────────────────────

export const medicationAPI = {
  list: (params?: any) =>
    http.get<Medication[]>('/medications', { params }),
  get: (id: string) =>
    http.get<Medication>(`/medications/${id}`),
  create: (data: { flockId: string; name: string; dosage: string; frequency: string; startDate: string; endDate?: string; notes?: string }) =>
    http.post<Medication>('/medications', data),
  update: (id: string, data: any) =>
    http.put<Medication>(`/medications/${id}`, data),
  delete: (id: string) =>
    http.delete(`/medications/${id}`),
};

// ─── Expenses ──────────────────────────────────────────────────────────────────

export const expensesAPI = {
  list: (params?: ListParams & { farmId?: string }) =>
    http.get<Expense[]>('/expenses', { params }),
  get: (id: string) =>
    http.get<Expense>(`/expenses/${id}`),
  create: (data: CreateExpenseRequest) =>
    http.post<Expense>('/expenses', data),
  update: (id: string, data: Partial<CreateExpenseRequest>) =>
    http.put<Expense>(`/expenses/${id}`, data),
  delete: (id: string) =>
    http.delete(`/expenses/${id}`),
};

// ─── Sales ─────────────────────────────────────────────────────────────────────

export const salesAPI = {
  list: (params?: ListParams & { farmId?: string }) =>
    http.get<Sale[]>('/sales', { params }),
  get: (id: string) =>
    http.get<Sale>(`/sales/${id}`),
  create: (data: CreateSaleRequest) =>
    http.post<Sale>('/sales', data),
  update: (id: string, data: Partial<CreateSaleRequest>) =>
    http.put<Sale>(`/sales/${id}`, data),
  delete: (id: string) =>
    http.delete(`/sales/${id}`),
};

// ─── Finance (convenience) ────────────────────────────────────────────────────

export const financeAPI = {
  list: async (params?: any) => {
    const [expensesRes, salesRes] = await Promise.all([
      expensesAPI.list(params),
      salesAPI.list(params),
    ]);
    const expenses = Array.isArray(expensesRes.data) ? expensesRes.data : [];
    const sales = Array.isArray(salesRes.data) ? salesRes.data : [];
    return { data: [...expenses, ...sales] };
  },
  get: (id: string) => expensesAPI.get(id),
  create: (data: any) => expensesAPI.create(data),
  update: (id: string, data: any) => expensesAPI.update(id, data),
  delete: (id: string) => expensesAPI.delete(id),
  listExpenses: expensesAPI.list,
  listSales: salesAPI.list,
  getExpense: expensesAPI.get,
  getSale: salesAPI.get,
  createExpense: expensesAPI.create,
  createSale: salesAPI.create,
  updateExpense: expensesAPI.update,
  updateSale: salesAPI.update,
  deleteExpense: expensesAPI.delete,
  deleteSale: salesAPI.delete,
};

// ─── Contracts ────────────────────────────────────────────────────────────────

export const contractsAPI = {
  list: (params?: { type?: string; status?: string }) =>
    http.get<Contract[]>('/contracts', { params }),
  get: (id: string) =>
    http.get<Contract>(`/contracts/${id}`),
  create: (data: any) =>
    http.post<Contract>('/contracts', data),
  update: (id: string, data: any) =>
    http.put<Contract>(`/contracts/${id}`, data),
  delete: (id: string) =>
    http.delete(`/contracts/${id}`),
};

// ─── Marketplace ──────────────────────────────────────────────────────────────

export const marketplaceAPI = {
  listBuyers: (params?: any) =>
    http.get<Buyer[]>('/marketplace/buyers', { params }),
  createBuyer: (data: any) =>
    http.post<Buyer>('/marketplace/buyers', data),
  updateBuyer: (id: string, data: any) =>
    http.put<Buyer>(`/marketplace/buyers/${id}`, data),
  deleteBuyer: (id: string) =>
    http.delete(`/marketplace/buyers/${id}`),
  listListings: (params?: { status?: string; entityType?: string }) =>
    http.get<MarketListing[]>('/marketplace/listings', { params }),
  createListing: (data: any) =>
    http.post<MarketListing>('/marketplace/listings', data),
  updateListing: (id: string, data: any) =>
    http.put<MarketListing>(`/marketplace/listings/${id}`, data),
  deleteListing: (id: string) =>
    http.delete(`/marketplace/listings/${id}`),
};

// ─── Profitability ────────────────────────────────────────────────────────────

export const profitabilityAPI = {
  byFarm: (params?: { farmId?: string; startDate?: string; endDate?: string }) =>
    http.get<FarmProfitability[]>('/profitability/farm', { params }),
  summary: (params?: { startDate?: string; endDate?: string }) =>
    http.get<ProfitabilitySummary>('/profitability/summary', { params }),
};

// ─── Workers ──────────────────────────────────────────────────────────────────

export const workersAPI = {
  list: (params?: ListParams & { farmId?: string }) =>
    http.get<Worker[]>('/workers', { params }),
  get: (id: string) =>
    http.get<Worker>(`/workers/${id}`),
  create: (data: CreateWorkerRequest) =>
    http.post<Worker>('/workers', data),
  update: (id: string, data: any) =>
    http.put<Worker>(`/workers/${id}`, data),
  delete: (id: string) =>
    http.delete(`/workers/${id}`),
};

// ─── Attendance ────────────────────────────────────────────────────────────────

export const attendanceAPI = {
  list: (params?: any) =>
    http.get<Attendance[]>('/attendance', { params }),
  getToday: () =>
    http.get<Attendance[]>('/attendance/today'),
  getSummary: (params: { workerId: string; month?: number; year?: number }) =>
    http.get('/attendance/summary', { params }),
  create: (data: any) =>
    http.post<Attendance>('/attendance', data),
  clockIn: (data: ClockInRequest) =>
    http.post<Attendance>('/attendance/clock-in', data),
  clockOut: (data: { workerId: string }) =>
    http.post<Attendance>('/attendance/clock-out', data),
  update: (id: string, data: any) =>
    http.put<Attendance>(`/attendance/${id}`, data),
  bulkCreate: (records: any[]) =>
    http.post('/attendance/bulk', { records }),
};

// ─── Tasks ─────────────────────────────────────────────────────────────────────

export const tasksAPI = {
  list: (params?: ListParams & { status?: string; assignedTo?: string }) =>
    http.get<Task[]>('/tasks', { params }),
  get: (id: string) =>
    http.get<Task>(`/tasks/${id}`),
  create: (data: any) =>
    http.post<Task>('/tasks', data),
  update: (id: string, data: any) =>
    http.put<Task>(`/tasks/${id}`, data),
  updateStatus: (id: string, status: string) =>
    http.put<Task>(`/tasks/${id}/status`, { status }),
  delete: (id: string) =>
    http.delete(`/tasks/${id}`),
};

// ─── Shifts ────────────────────────────────────────────────────────────────────

export const rosterAPI = {
  listShifts: () =>
    http.get<Shift[]>('/shifts'),
  createShift: (data: any) =>
    http.post<Shift>('/shifts', data),
  updateShift: (id: string, data: any) =>
    http.put<Shift>(`/shifts/${id}`, data),
  deleteShift: (id: string) =>
    http.delete(`/shifts/${id}`),
  listAssignments: (params?: any) =>
    http.get<ShiftAssignment[]>('/shift-assignments', { params }),
  createAssignment: (data: any) =>
    http.post<ShiftAssignment>('/shift-assignments', data),
  bulkAssign: (data: any[]) =>
    http.post('/shift-assignments/bulk', { records: data }),
  deleteAssignment: (id: string) =>
    http.delete(`/shift-assignments/${id}`),
};

// ─── Leave ─────────────────────────────────────────────────────────────────────

export const leaveAPI = {
  types: () =>
    http.get<LeaveType[]>('/leave/types'),
  createType: (data: any) =>
    http.post<LeaveType>('/leave/types', data),
  updateType: (id: string, data: any) =>
    http.put<LeaveType>(`/leave/types/${id}`, data),
  deleteType: (id: string) =>
    http.delete(`/leave/types/${id}`),
  requests: (params?: any) =>
    http.get<LeaveRequest[]>('/leave/requests', { params }),
  createRequest: (data: any) =>
    http.post<LeaveRequest>('/leave/requests', data),
  approve: (id: string) =>
    http.put(`/leave/requests/${id}/approve`),
  reject: (id: string, data?: any) =>
    http.put(`/leave/requests/${id}/reject`, data),
  cancel: (id: string) =>
    http.put(`/leave/requests/${id}/cancel`),
  balance: (params?: any) =>
    http.get('/leave/balance', { params }),
  upsertBalance: (data: any) =>
    http.put('/leave/balance', data),
};

// ─── Messages ──────────────────────────────────────────────────────────────────

export const messagesAPI = {
  inbox: () =>
    http.get<Message[]>('/messages/inbox'),
  sent: () =>
    http.get<Message[]>('/messages/sent'),
  unreadCount: () =>
    http.get<{ count: number }>('/messages/unread-count'),
  get: (id: string) =>
    http.get<Message>(`/messages/${id}`),
  send: (data: any) =>
    http.post<Message>('/messages', data),
  delete: (id: string) =>
    http.delete(`/messages/${id}`),
};

// ─── Correspondence ───────────────────────────────────────────────────────────

export const correspondenceAPI = {
  list: (params?: any) =>
    http.get<Correspondence[]>('/correspondence', { params }),
  get: (id: string) =>
    http.get<Correspondence>(`/correspondence/${id}`),
  stats: () =>
    http.get('/correspondence/stats'),
  getAttachment: (id: string) =>
    http.get(`/correspondence/attachments/${id}`),
  create: (data: any) =>
    http.post<Correspondence>('/correspondence', data),
  update: (id: string, data: any) =>
    http.put<Correspondence>(`/correspondence/${id}`, data),
  archive: (id: string) =>
    http.put(`/correspondence/${id}/archive`),
  unarchive: (id: string) =>
    http.put(`/correspondence/${id}/unarchive`),
  delete: (id: string) =>
    http.delete(`/correspondence/${id}`),
  addAttachment: (id: string, formData: FormData) =>
    http.post(`/correspondence/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteAttachment: (id: string) =>
    http.delete(`/correspondence/attachments/${id}`),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationsAPI = {
  list: (userId: string, params?: any) =>
    http.get<Notification[]>(`/notifications/user/${userId}`, { params }),
  get: (id: string) =>
    http.get<Notification>(`/notifications/${id}`),
  unreadCount: (userId: string) =>
    http.get<{ count: number }>(`/notifications/user/${userId}/unread-count`),
  markAsRead: (id: string) =>
    http.put(`/notifications/${id}/read`),
  markAllAsRead: (userId: string) =>
    http.put(`/notifications/user/${userId}/read-all`),
  delete: (id: string) =>
    http.delete(`/notifications/${id}`),
  registerDevice: (data: { token: string; platform: string; deviceId?: string }) =>
    http.post('/devices/tokens', data),
  unregisterDevice: (data: { token: string }) =>
    http.delete('/devices/tokens', { data }),
};

// ─── Organizations ────────────────────────────────────────────────────────────

export const organizationsAPI = {
  list: (params?: any) =>
    http.get<Organization[]>('/organizations', { params }),
  get: (id: string) =>
    http.get<Organization>(`/organizations/${id}`),
  getBySlug: (slug: string) =>
    http.get<Organization>(`/organizations/slug/${slug}`),
  create: (data: any) =>
    http.post<Organization>('/organizations', data),
  update: (id: string, data: any) =>
    http.put<Organization>(`/organizations/${id}`, data),
  delete: (id: string) =>
    http.delete(`/organizations/${id}`),
  subscriptionPlans: () =>
    http.get('/organizations/subscription-plans'),
};

// ─── Org Admin ────────────────────────────────────────────────────────────────

export const orgAdminAPI = {
  getOrganization: () =>
    http.get<Organization>('/org-admin/me'),
  updateOrganization: (data: any) =>
    http.put<Organization>('/org-admin/me', data),
  listUsers: () =>
    http.get<User[]>('/org-admin/users'),
  inviteUser: (data: { firstName: string; lastName: string; email: string; roleId?: string }) =>
    http.post<User>('/org-admin/users', data),
  updateUser: (userId: string, data: any) =>
    http.put<User>(`/org-admin/users/${userId}`, data),
  removeUser: (userId: string) =>
    http.delete(`/org-admin/users/${userId}`),
  listRoles: () =>
    http.get('/org-admin/roles'),
  getRole: (id: string) =>
    http.get(`/org-admin/roles/${id}`),
  createRole: (data: { name: string; description?: string; permissionIds?: string[] }) =>
    http.post('/org-admin/roles', data),
  updateRole: (id: string, data: { name?: string; description?: string; permissionIds?: string[] }) =>
    http.put(`/org-admin/roles/${id}`, data),
  deleteRole: (id: string) =>
    http.delete(`/org-admin/roles/${id}`),
};

// ─── Reports ──────────────────────────────────────────────────────────────────

export const reportsAPI = {
  list: (params?: any) =>
    http.get<Report[]>('/reports', { params }),
  get: (id: string) =>
    http.get<Report>(`/reports/${id}`),
  create: (data: any) =>
    http.post<Report>('/reports', data),
  update: (id: string, data: any) =>
    http.put<Report>(`/reports/${id}`, data),
  delete: (id: string) =>
    http.delete(`/reports/${id}`),
};

export const scheduledReportsAPI = {
  list: () =>
    http.get<ScheduledReport[]>('/schedule'),
  create: (data: any) =>
    http.post<ScheduledReport>('/schedule', data),
  update: (id: string, data: any) =>
    http.put<ScheduledReport>(`/schedule/${id}`, data),
  delete: (id: string) =>
    http.delete(`/schedule/${id}`),
};

// ─── Irrigation ───────────────────────────────────────────────────────────────

export const irrigationAPI = {
  listSchedules: (params?: any) =>
    http.get('/irrigation/schedule', { params }),
  createSchedule: (data: any) =>
    http.post('/irrigation/schedule', data),
  updateSchedule: (id: string, data: any) =>
    http.put(`/irrigation/schedule/${id}`, data),
  deleteSchedule: (id: string) =>
    http.delete(`/irrigation/schedule/${id}`),
  createLog: (data: any) =>
    http.post('/irrigation/log', data),
  listLogs: (params?: any) =>
    http.get('/irrigation/log', { params }),
};

// ─── Pest & Disease ───────────────────────────────────────────────────────────

export const pestDiseaseAPI = {
  list: (params?: any) =>
    http.get('/pest-disease', { params }),
  active: () =>
    http.get('/pest-disease/active'),
  create: (data: any) =>
    http.post('/pest-disease', data),
  update: (id: string, data: any) =>
    http.put(`/pest-disease/${id}`, data),
  delete: (id: string) =>
    http.delete(`/pest-disease/${id}`),
};

// ─── Yield ────────────────────────────────────────────────────────────────────

export const yieldAPI = {
  listByCrop: (cropId: string) =>
    http.get(`/yield/crop/${cropId}`),
  create: (cropId: string, data: any) =>
    http.post(`/yield/crop/${cropId}`, data),
  summary: (cropId: string) =>
    http.get(`/yield/crop/${cropId}/summary`),
};

// ─── Inventory ────────────────────────────────────────────────────────────────

export const inventoryAPI = {
  list: (params?: any) =>
    http.get('/inventory', { params }),
  get: (id: string) =>
    http.get(`/inventory/${id}`),
  create: (data: any) =>
    http.post('/inventory', data),
  update: (id: string, data: any) =>
    http.put(`/inventory/${id}`, data),
  delete: (id: string) =>
    http.delete(`/inventory/${id}`),
  lowStock: () =>
    http.get('/inventory/low-stock'),
  reorder: (id: string) =>
    http.post(`/inventory/${id}/reorder`),
};

// ─── Egg Production ───────────────────────────────────────────────────────────

export const eggProductionAPI = {
  list: (params?: any) =>
    http.get('/egg-production', { params }),
  get: (id: string) =>
    http.get(`/egg-production/${id}`),
  create: (data: any) =>
    http.post('/egg-production', data),
  update: (id: string, data: any) =>
    http.put(`/egg-production/${id}`, data),
  delete: (id: string) =>
    http.delete(`/egg-production/${id}`),
};
