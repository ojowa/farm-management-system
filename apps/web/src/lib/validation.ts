import { z } from 'zod';

export const farmFormSchema = z.object({
  name: z.string().min(1, 'Farm name is required'),
  farmType: z.enum(['CROP', 'LIVESTOCK', 'POULTRY', 'DAIRY', 'AQUACULTURE'], {
    errorMap: () => ({ message: 'Farm type is required' }),
  }),
  location: z.string().optional(),
  size: z.string().optional(),
  description: z.string().optional(),
});

export const cropFormSchema = z.object({
  name: z.string().min(1, 'Crop name is required'),
  farmId: z.string().min(1, 'Farm is required'),
  cropType: z.string().optional(),
  area: z.string().optional(),
  status: z.string().optional(),
});

export const livestockFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  breed: z.string().optional(),
  farmId: z.string().min(1, 'Farm is required'),
  status: z.string().optional(),
  tagNumber: z.string().optional(),
});

export const poultryFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  breed: z.string().optional(),
  farmId: z.string().min(1, 'Farm is required'),
  status: z.string().optional(),
  quantity: z.string().optional(),
});

export const inventoryFormSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  category: z.string().min(1, 'Category is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  unit: z.string().optional(),
  farmId: z.string().optional(),
  costPerUnit: z.string().optional(),
});

export const workerFormSchema = z.object({
  fullName: z.string().min(1, 'Name is required'),
  role: z.string().optional(),
  phone: z.string().optional(),
  farmId: z.string().min(1, 'Farm is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
});

export const saleFormSchema = z.object({
  productType: z.string().min(1, 'Product type is required'),
  productName: z.string().min(1, 'Product name is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  unit: z.string().optional(),
  totalPrice: z.string().min(1, 'Price is required'),
  buyerName: z.string().optional(),
  farmId: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
});

export const loginFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  middleName: z.string().optional(),
  organizationName: z.string().min(1, 'Organization name is required'),
});
