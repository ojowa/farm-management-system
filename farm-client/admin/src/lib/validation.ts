import { z } from 'zod';

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
  farmType: z.enum(['CROP', 'LIVESTOCK', 'POULTRY', 'DAIRY', 'AQUACULTURE'], {
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
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  position: z.string().min(1, 'Position is required'),
  department: z.string().optional(),
  farmId: z.string().min(1, 'Farm is required'),
});

export type WorkerFormInput = z.infer<typeof workerFormSchema>;

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