import { z } from 'zod';
import { FARM_TYPES } from './farmTypes';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  middleName: z.string().optional(),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const mfaSchema = z.object({
  code: z.string().length(6, 'MFA code must be 6 digits'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type MFAInput = z.infer<typeof mfaSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const farmFormSchema = z.object({
  name: z.string().min(1, 'Farm name is required'),
  farmType: z.enum(FARM_TYPES, {
    required_error: 'Farm type is required',
  }),
  location: z.string().optional(),
  size: z.string().optional(),
  description: z.string().optional(),
});

export type FarmFormInput = z.infer<typeof farmFormSchema>;

export const cropFormSchema = z.object({
  name: z.string().min(1, 'Crop name is required'),
  farmId: z.string().min(1, 'Farm is required'),
  cropType: z.string().optional(),
  area: z.string().optional(),
  status: z.string().optional(),
});

export type CropFormInput = z.infer<typeof cropFormSchema>;

export const livestockFormSchema = z.object({
  species: z.string().min(1, 'Species is required'),
  breed: z.string().optional(),
  gender: z.string().min(1, 'Gender is required'),
  farmId: z.string().min(1, 'Farm is required'),
  birthDate: z.string().optional(),
  status: z.string().optional(),
});

export type LivestockFormInput = z.infer<typeof livestockFormSchema>;

export const pondFormSchema = z.object({
  name: z.string().min(1, 'Pond name is required'),
  farmId: z.string().min(1, 'Farm is required'),
  pondType: z.string().optional(),
  area: z.string().optional(),
  waterSource: z.string().optional(),
  capacity: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export type PondFormInput = z.infer<typeof pondFormSchema>;

export const pondStockingFormSchema = z.object({
  species: z.string().min(1, 'Species is required'),
  strain: z.string().optional(),
  count: z.string().min(1, 'Count is required'),
  source: z.string().optional(),
  totalCost: z.string().optional(),
  stockedAt: z.string().min(1, 'Stocked date is required'),
  expectedHarvestAt: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export type PondStockingFormInput = z.infer<typeof pondStockingFormSchema>;

export const pondFeedingFormSchema = z.object({
  feedType: z.string().min(1, 'Feed type is required'),
  quantityKg: z.string().min(1, 'Quantity is required'),
  cost: z.string().optional(),
  fedAt: z.string().min(1, 'Feed date is required'),
  notes: z.string().optional(),
});

export type PondFeedingFormInput = z.infer<typeof pondFeedingFormSchema>;

export const pondWaterQualityFormSchema = z.object({
  recordedAt: z.string().min(1, 'Recorded date is required'),
  ph: z.string().optional(),
  temperatureC: z.string().optional(),
  dissolvedOxygen: z.string().optional(),
  ammonia: z.string().optional(),
  turbidity: z.string().optional(),
  notes: z.string().optional(),
});

export type PondWaterQualityFormInput = z.infer<typeof pondWaterQualityFormSchema>;

export const pondHarvestFormSchema = z.object({
  harvestedAt: z.string().min(1, 'Harvest date is required'),
  quantityKg: z.string().min(1, 'Quantity is required'),
  count: z.string().optional(),
  unitPrice: z.string().optional(),
  revenue: z.string().optional(),
  notes: z.string().optional(),
});

export type PondHarvestFormInput = z.infer<typeof pondHarvestFormSchema>;

export const poultryHouseFormSchema = z.object({
  name: z.string().min(1, 'House name is required'),
  farmId: z.string().min(1, 'Farm is required'),
  capacity: z.string().min(1, 'Capacity is required'),
});

export type PoultryHouseFormInput = z.infer<typeof poultryHouseFormSchema>;

export const flockFormSchema = z.object({
  batchCode: z.string().min(1, 'Batch code is required'),
  farmId: z.string().min(1, 'Farm is required'),
  penId: z.string().min(1, 'Pen is required'),
  breedId: z.string().min(1, 'Breed is required'),
  birdCount: z.string().min(1, 'Bird count is required'),
  arrivalDate: z.string().min(1, 'Arrival date is required'),
  status: z.string().optional(),
});

export type FlockFormInput = z.infer<typeof flockFormSchema>;

export const feedingRecordFormSchema = z.object({
  flockId: z.string().min(1, 'Flock is required'),
  feedType: z.string().min(1, 'Feed type is required'),
  quantityKg: z.string().min(1, 'Quantity is required'),
  date: z.string().min(1, 'Date is required'),
});

export type FeedingRecordFormInput = z.infer<typeof feedingRecordFormSchema>;

export const vaccinationRecordFormSchema = z.object({
  flockId: z.string().min(1, 'Flock is required'),
  vaccine: z.string().min(1, 'Vaccine name is required'),
  dosage: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
});

export type VaccinationRecordFormInput = z.infer<typeof vaccinationRecordFormSchema>;

export const mortalityRecordFormSchema = z.object({
  flockId: z.string().min(1, 'Flock is required'),
  count: z.string().min(1, 'Count is required'),
  cause: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
});

export type MortalityRecordFormInput = z.infer<typeof mortalityRecordFormSchema>;

export const eggProductionFormSchema = z.object({
  flockId: z.string().min(1, 'Flock is required'),
  count: z.string().min(1, 'Egg count is required'),
  grade: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
});

export type EggProductionFormInput = z.infer<typeof eggProductionFormSchema>;

export const medicationFormSchema = z.object({
  flockId: z.string().min(1, 'Flock is required'),
  name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
});

export type MedicationFormInput = z.infer<typeof medicationFormSchema>;

export const inventoryFormSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  category: z.string().min(1, 'Category is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  unit: z.string().optional(),
  farmId: z.string().min(1, 'Farm is required'),
});

export type InventoryFormInput = z.infer<typeof inventoryFormSchema>;

export const workerFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  email: z
    .string()
    .min(1, 'Email is required — it becomes the worker login')
    .email('Invalid email'),
  phone: z.string().optional(),
  position: z.string().min(1, 'Position is required'),
  department: z.string().optional(),
  farmId: z.string().min(1, 'Farm is required'),
  // The add forms send it (defaulting to the WORKER role); the edit form has
  // no role field, so it stays optional and the backend defaults when absent.
  roleId: z.string().optional(),
});

export type WorkerFormInput = z.infer<typeof workerFormSchema>;

// Suggestions for the worker form dropdowns — free text stays allowed, so
// records with custom values keep editing cleanly.
export const WORKER_POSITION_OPTIONS = [
  'Farm Manager',
  'Supervisor',
  'Veterinarian',
  'Accountant',
  'Field Worker',
  'Livestock Handler',
  'Poultry Handler',
  'Equipment Operator',
  'Irrigation Technician',
  'Harvest Worker',
  'General Worker',
];

export const WORKER_DEPARTMENT_OPTIONS = [
  'Operations',
  'Agronomy',
  'Livestock',
  'Poultry',
  'Finance',
  'Administration',
  'Maintenance',
  'Logistics',
  'Storage',
  'Quality Assurance',
];

export const expenseFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.string().min(1, 'Amount is required'),
  date: z.string().min(1, 'Date is required'),
  farmId: z.string().min(1, 'Farm is required'),
});

export type ExpenseFormInput = z.infer<typeof expenseFormSchema>;

export const saleFormSchema = z.object({
  item: z.string().min(1, 'Item name is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  price: z.string().min(1, 'Unit price is required'),
  total: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  farmId: z.string().min(1, 'Farm is required'),
});

export type SaleFormInput = z.infer<typeof saleFormSchema>;