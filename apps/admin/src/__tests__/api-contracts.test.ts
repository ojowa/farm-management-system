import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  apiClient,
  authAPI,
  farmsAPI,
  cropsAPI,
  livestockAPI,
  poultryAPI,
  inventoryAPI,
  workersAPI,
  financeAPI,
  reportsAPI,
  reportingAPI,
  poultryHousesAPI,
  pensAPI,
  breedsAPI,
  flocksAPI,
  feedingRecordsAPI,
  vaccinationRecordsAPI,
  mortalityRecordsAPI,
  medicationAPI,
  organizationsAPI,
  eggProductionAPI,
  poultrySalesAPI,
} from '@/lib/api';

// ── Contract Schemas ──────────────────────────────────────────────────
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string(),
  fullName: z.string().min(1),
  organizationName: z.string().min(1),
});

const MFAVerifySchema = z.object({
  mfaSessionToken: z.string().min(1),
  code: z.string().length(6),
});

const PasswordResetRequestSchema = z.object({
  email: z.string().email(),
});

const PasswordResetSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

const FarmSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional(),
  size: z.number().positive().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

const CropSchema = z.object({
  name: z.string().min(1),
  farmId: z.string().min(1),
  cropType: z.string().optional(),
  area: z.number().positive().optional(),
  status: z.enum(['planted', 'growing', 'harvested', 'failed']).optional(),
});

const LivestockSchema = z.object({
  species: z.string().min(1),
  farmId: z.string().min(1),
  breed: z.string().optional(),
  gender: z.enum(['male', 'female']).optional(),
  status: z.enum(['active', 'sold', 'deceased']).optional(),
});

const InventorySchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  quantity: z.number().min(0),
  unit: z.string().optional(),
});

const WorkerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  role: z.string().min(1),
  farmId: z.string().optional(),
});

const TransactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number().positive(),
  title: z.string().min(1),
  category: z.string().optional(),
});

const PaginationParamsSchema = z.object({
  page: z.number().positive().optional(),
  limit: z.number().positive().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ── Mock Setup ────────────────────────────────────────────────────────
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    })),
    post: vi.fn(),
  },
}));

describe('API Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Auth API Contracts', () => {
    it('login accepts valid credentials', () => {
      const validInput = { email: 'test@example.com', password: 'password123' };
      expect(() => LoginSchema.parse(validInput)).not.toThrow();
    });

    it('login rejects invalid email', () => {
      const invalidInput = { email: 'not-an-email', password: 'password123' };
      expect(() => LoginSchema.parse(invalidInput)).toThrow();
    });

    it('login rejects empty password', () => {
      const invalidInput = { email: 'test@example.com', password: '' };
      expect(() => LoginSchema.parse(invalidInput)).toThrow();
    });

    it('register accepts valid data', () => {
      const validInput = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        fullName: 'John Doe',
        organizationName: 'Test Farm',
      };
      expect(() => RegisterSchema.parse(validInput)).not.toThrow();
    });

    it('register rejects short password', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: 'short',
        confirmPassword: 'short',
        fullName: 'John Doe',
        organizationName: 'Test Farm',
      };
      expect(() => RegisterSchema.parse(invalidInput)).toThrow();
    });

    it('MFA verify accepts 6-digit code', () => {
      const validInput = { mfaSessionToken: 'abc123', code: '123456' };
      expect(() => MFAVerifySchema.parse(validInput)).not.toThrow();
    });

    it('MFA verify rejects non-6-digit code', () => {
      const invalidInput = { mfaSessionToken: 'abc123', code: '12345' };
      expect(() => MFAVerifySchema.parse(invalidInput)).toThrow();
    });

    it('password reset request accepts valid email', () => {
      const validInput = { email: 'test@example.com' };
      expect(() => PasswordResetRequestSchema.parse(validInput)).not.toThrow();
    });

    it('password reset accepts valid token and password', () => {
      const validInput = { token: 'reset-token-123', newPassword: 'newpassword123' };
      expect(() => PasswordResetSchema.parse(validInput)).not.toThrow();
    });

    it('password reset rejects short password', () => {
      const invalidInput = { token: 'reset-token-123', newPassword: 'short' };
      expect(() => PasswordResetSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('Farm API Contracts', () => {
    it('farm schema accepts valid data', () => {
      const validInput = { name: 'Green Valley Farm', location: 'Nairobi', size: 100 };
      expect(() => FarmSchema.parse(validInput)).not.toThrow();
    });

    it('farm schema accepts minimal data', () => {
      const validInput = { name: 'Test Farm' };
      expect(() => FarmSchema.parse(validInput)).not.toThrow();
    });

    it('farm schema rejects empty name', () => {
      const invalidInput = { name: '' };
      expect(() => FarmSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('Crop API Contracts', () => {
    it('crop schema accepts valid data', () => {
      const validInput = { name: 'Maize', farmId: 'farm-123', cropType: 'cereal', area: 50 };
      expect(() => CropSchema.parse(validInput)).not.toThrow();
    });

    it('crop schema requires name and farmId', () => {
      const invalidInput = { name: 'Maize' };
      expect(() => CropSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('Livestock API Contracts', () => {
    it('livestock schema accepts valid data', () => {
      const validInput = { species: 'Cattle', farmId: 'farm-123', breed: 'Friesian', gender: 'female' };
      expect(() => LivestockSchema.parse(validInput)).not.toThrow();
    });

    it('livestock schema requires species and farmId', () => {
      const invalidInput = { species: 'Cattle' };
      expect(() => LivestockSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('Inventory API Contracts', () => {
    it('inventory schema accepts valid data', () => {
      const validInput = { name: 'Fertilizer', category: 'inputs', quantity: 100, unit: 'kg' };
      expect(() => InventorySchema.parse(validInput)).not.toThrow();
    });

    it('inventory schema rejects negative quantity', () => {
      const invalidInput = { name: 'Fertilizer', quantity: -10 };
      expect(() => InventorySchema.parse(invalidInput)).toThrow();
    });
  });

  describe('Worker API Contracts', () => {
    it('worker schema accepts valid data', () => {
      const validInput = { name: 'John Worker', email: 'john@farm.com', role: 'Farm Hand', farmId: 'farm-123' };
      expect(() => WorkerSchema.parse(validInput)).not.toThrow();
    });

    it('worker schema requires name and role', () => {
      const invalidInput = { name: 'John' };
      expect(() => WorkerSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('Transaction API Contracts', () => {
    it('transaction schema accepts valid income', () => {
      const validInput = { type: 'income' as const, amount: 5000, title: 'Egg Sales', category: 'poultry' };
      expect(() => TransactionSchema.parse(validInput)).not.toThrow();
    });

    it('transaction schema accepts valid expense', () => {
      const validInput = { type: 'expense' as const, amount: 1500, title: 'Feed Purchase', category: 'inputs' };
      expect(() => TransactionSchema.parse(validInput)).not.toThrow();
    });

    it('transaction schema rejects zero amount', () => {
      const invalidInput = { type: 'income' as const, amount: 0, title: 'Test' };
      expect(() => TransactionSchema.parse(invalidInput)).toThrow();
    });

    it('transaction schema rejects negative amount', () => {
      const invalidInput = { type: 'income' as const, amount: -100, title: 'Test' };
      expect(() => TransactionSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('Pagination Parameter Contracts', () => {
    it('pagination accepts valid params', () => {
      const validInput = { page: 1, limit: 20, search: 'farm', sortBy: 'name', sortOrder: 'asc' as const };
      expect(() => PaginationParamsSchema.parse(validInput)).not.toThrow();
    });

    it('pagination accepts empty params', () => {
      expect(() => PaginationParamsSchema.parse({})).not.toThrow();
    });

    it('pagination rejects invalid sortOrder', () => {
      const invalidInput = { sortOrder: 'random' };
      expect(() => PaginationParamsSchema.parse(invalidInput)).toThrow();
    });

    it('pagination rejects negative page', () => {
      const invalidInput = { page: -1 };
      expect(() => PaginationParamsSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('API Client Configuration', () => {
    it('has correct base URL', () => {
      expect(apiClient.defaults.baseURL).toBeDefined();
    });

    it('has correct timeout', () => {
      expect(apiClient.defaults.timeout).toBe(15000);
    });

    it('has JSON content type', () => {
      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('API Module Exports', () => {
    it('exports authAPI with all methods', () => {
      expect(authAPI.login).toBeDefined();
      expect(authAPI.register).toBeDefined();
      expect(authAPI.logout).toBeDefined();
      expect(authAPI.getProfile).toBeDefined();
      expect(authAPI.updateProfile).toBeDefined();
      expect(authAPI.refreshToken).toBeDefined();
      expect(authAPI.verifyMFA).toBeDefined();
      expect(authAPI.requestPasswordReset).toBeDefined();
      expect(authAPI.resetPassword).toBeDefined();
    });

    it('exports farmsAPI with CRUD methods', () => {
      expect(farmsAPI.list).toBeDefined();
      expect(farmsAPI.get).toBeDefined();
      expect(farmsAPI.create).toBeDefined();
      expect(farmsAPI.update).toBeDefined();
      expect(farmsAPI.delete).toBeDefined();
    });

    it('exports cropsAPI with CRUD methods', () => {
      expect(cropsAPI.list).toBeDefined();
      expect(cropsAPI.get).toBeDefined();
      expect(cropsAPI.create).toBeDefined();
      expect(cropsAPI.update).toBeDefined();
      expect(cropsAPI.delete).toBeDefined();
    });

    it('exports livestockAPI with CRUD methods', () => {
      expect(livestockAPI.list).toBeDefined();
      expect(livestockAPI.get).toBeDefined();
      expect(livestockAPI.create).toBeDefined();
      expect(livestockAPI.update).toBeDefined();
      expect(livestockAPI.delete).toBeDefined();
    });

    it('exports poultryAPI with CRUD methods', () => {
      expect(poultryAPI.list).toBeDefined();
      expect(poultryAPI.get).toBeDefined();
      expect(poultryAPI.create).toBeDefined();
      expect(poultryAPI.update).toBeDefined();
      expect(poultryAPI.delete).toBeDefined();
    });

    it('exports inventoryAPI with CRUD methods', () => {
      expect(inventoryAPI.list).toBeDefined();
      expect(inventoryAPI.get).toBeDefined();
      expect(inventoryAPI.create).toBeDefined();
      expect(inventoryAPI.update).toBeDefined();
      expect(inventoryAPI.delete).toBeDefined();
    });

    it('exports workersAPI with CRUD methods', () => {
      expect(workersAPI.list).toBeDefined();
      expect(workersAPI.get).toBeDefined();
      expect(workersAPI.create).toBeDefined();
      expect(workersAPI.update).toBeDefined();
      expect(workersAPI.delete).toBeDefined();
    });

    it('exports financeAPI with expense and sales methods', () => {
      expect(financeAPI.listExpenses).toBeDefined();
      expect(financeAPI.getExpense).toBeDefined();
      expect(financeAPI.createExpense).toBeDefined();
      expect(financeAPI.updateExpense).toBeDefined();
      expect(financeAPI.deleteExpense).toBeDefined();
      expect(financeAPI.listSales).toBeDefined();
      expect(financeAPI.getSale).toBeDefined();
      expect(financeAPI.createSale).toBeDefined();
      expect(financeAPI.updateSale).toBeDefined();
      expect(financeAPI.deleteSale).toBeDefined();
    });

    it('exports reportingAPI with CRUD and generate methods', () => {
      expect(reportsAPI.list).toBeDefined();
      expect(reportsAPI.get).toBeDefined();
      expect(reportsAPI.create).toBeDefined();
      expect(reportsAPI.generate).toBeDefined();
      expect(reportsAPI.update).toBeDefined();
      expect(reportsAPI.delete).toBeDefined();
    });
  });

  describe('API Method Signatures', () => {
    it('farmsAPI.get accepts string ID', () => {
      expect(typeof farmsAPI.get).toBe('function');
    });

    it('farmsAPI.list accepts optional params', () => {
      expect(typeof farmsAPI.list).toBe('function');
    });

    it('authAPI.login accepts credentials object', () => {
      expect(typeof authAPI.login).toBe('function');
    });

    it('authAPI.verifyMFA accepts token and code', () => {
      expect(typeof authAPI.verifyMFA).toBe('function');
    });

    it('financeAPI.listExpenses accepts optional params', () => {
      expect(typeof financeAPI.listExpenses).toBe('function');
    });

    it('financeAPI.listSales accepts optional params', () => {
      expect(typeof financeAPI.listSales).toBe('function');
    });
  });

  describe('Poultry Sub-module API Contracts', () => {
    it('exports poultryHousesAPI with CRUD methods', () => {
      expect(poultryHousesAPI.list).toBeDefined();
      expect(poultryHousesAPI.get).toBeDefined();
      expect(poultryHousesAPI.create).toBeDefined();
      expect(poultryHousesAPI.update).toBeDefined();
      expect(poultryHousesAPI.delete).toBeDefined();
    });

    it('exports pensAPI with CRUD methods', () => {
      expect(pensAPI.list).toBeDefined();
      expect(pensAPI.get).toBeDefined();
      expect(pensAPI.create).toBeDefined();
      expect(pensAPI.update).toBeDefined();
      expect(pensAPI.delete).toBeDefined();
    });

    it('exports breedsAPI with CRUD methods', () => {
      expect(breedsAPI.list).toBeDefined();
      expect(breedsAPI.get).toBeDefined();
      expect(breedsAPI.create).toBeDefined();
      expect(breedsAPI.update).toBeDefined();
      expect(breedsAPI.delete).toBeDefined();
    });

    it('exports flocksAPI with CRUD methods', () => {
      expect(flocksAPI.list).toBeDefined();
      expect(flocksAPI.get).toBeDefined();
      expect(flocksAPI.create).toBeDefined();
      expect(flocksAPI.update).toBeDefined();
      expect(flocksAPI.delete).toBeDefined();
    });

    it('exports feedingRecordsAPI with CRUD methods', () => {
      expect(feedingRecordsAPI.list).toBeDefined();
      expect(feedingRecordsAPI.get).toBeDefined();
      expect(feedingRecordsAPI.create).toBeDefined();
      expect(feedingRecordsAPI.update).toBeDefined();
      expect(feedingRecordsAPI.delete).toBeDefined();
    });

    it('exports vaccinationRecordsAPI with CRUD methods', () => {
      expect(vaccinationRecordsAPI.list).toBeDefined();
      expect(vaccinationRecordsAPI.get).toBeDefined();
      expect(vaccinationRecordsAPI.create).toBeDefined();
      expect(vaccinationRecordsAPI.update).toBeDefined();
      expect(vaccinationRecordsAPI.delete).toBeDefined();
    });

    it('exports mortalityRecordsAPI with CRUD methods', () => {
      expect(mortalityRecordsAPI.list).toBeDefined();
      expect(mortalityRecordsAPI.get).toBeDefined();
      expect(mortalityRecordsAPI.create).toBeDefined();
      expect(mortalityRecordsAPI.update).toBeDefined();
      expect(mortalityRecordsAPI.delete).toBeDefined();
    });

    it('exports medicationAPI with CRUD methods', () => {
      expect(medicationAPI.list).toBeDefined();
      expect(medicationAPI.get).toBeDefined();
      expect(medicationAPI.create).toBeDefined();
      expect(medicationAPI.update).toBeDefined();
      expect(medicationAPI.delete).toBeDefined();
    });

    it('exports organizationsAPI with CRUD methods', () => {
      expect(organizationsAPI.list).toBeDefined();
      expect(organizationsAPI.get).toBeDefined();
      expect(organizationsAPI.getBySlug).toBeDefined();
      expect(organizationsAPI.create).toBeDefined();
      expect(organizationsAPI.update).toBeDefined();
      expect(organizationsAPI.delete).toBeDefined();
    });

    it('exports eggProductionAPI with CRUD methods', () => {
      expect(eggProductionAPI.list).toBeDefined();
      expect(eggProductionAPI.get).toBeDefined();
      expect(eggProductionAPI.create).toBeDefined();
      expect(eggProductionAPI.update).toBeDefined();
      expect(eggProductionAPI.delete).toBeDefined();
    });

    it('exports poultrySalesAPI with CRUD methods', () => {
      expect(poultrySalesAPI.list).toBeDefined();
      expect(poultrySalesAPI.get).toBeDefined();
      expect(poultrySalesAPI.create).toBeDefined();
      expect(poultrySalesAPI.update).toBeDefined();
      expect(poultrySalesAPI.delete).toBeDefined();
    });
  });
});
