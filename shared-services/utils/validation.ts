// Shared validation schemas for all services
import { z } from 'zod';

// Base entity interface
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// Shared validation schemas
export const sharedSchemas = {
  uuid: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']),
};

// Create response type
export type CreateResponse<T> = T & { id: string };

// Update response type  
export type UpdateResponse<T> = T;

// List response type
export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// Pagination params
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
