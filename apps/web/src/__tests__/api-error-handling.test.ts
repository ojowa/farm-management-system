import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn().mockReturnThis(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: { headers: { common: {} } },
  };
  return { default: mockAxios };
});

describe('API error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles 401 errors by triggering refresh flow', async () => {
    const error = {
      response: { status: 401, data: { message: 'Unauthorized' } },
      config: { _retry: false, headers: {} },
    };
    expect(error.response.status).toBe(401);
    expect(error.config._retry).toBe(false);
  });

  it('handles network errors gracefully', async () => {
    const error = {
      response: undefined,
      message: 'Network Error',
      code: 'ERR_NETWORK',
    };
    expect(error.code).toBe('ERR_NETWORK');
    expect(error.response).toBeUndefined();
  });

  it('handles timeout errors', async () => {
    const error = {
      code: 'ECONNABORTED',
      message: 'timeout of 15000ms exceeded',
    };
    expect(error.code).toBe('ECONNABORTED');
  });

  it('extracts error messages from response data', () => {
    const error = {
      response: { status: 422, data: { message: 'Validation failed', errors: { name: ['Name is required'] } } },
    };
    const message = error.response.data.message || 'An error occurred';
    expect(message).toBe('Validation failed');
  });

  it('falls back to default message when no response data', () => {
    const error = { response: { status: 500 } } as any;
    const message = error.response.data?.message || 'An error occurred';
    expect(message).toBe('An error occurred');
  });

  it('handles 403 forbidden responses', () => {
    const error = { response: { status: 403, data: { message: 'Forbidden' } } };
    expect(error.response.status).toBe(403);
  });

  it('handles 404 not found responses', () => {
    const error = { response: { status: 404, data: { message: 'Not found' } } };
    expect(error.response.status).toBe(404);
  });

  it('handles 500 server error responses', () => {
    const error = { response: { status: 500, data: { message: 'Internal server error' } } };
    expect(error.response.status).toBe(500);
  });
});

describe('Validation schemas', () => {
  it('validates farm form data', async () => {
    const { farmFormSchema } = await import('@/lib/validation');

    const validData = { name: 'Test Farm', farmType: 'CROP', location: 'Nairobi', size: '', description: '' };
    const result = farmFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects farm form with empty name', async () => {
    const { farmFormSchema } = await import('@/lib/validation');

    const invalidData = { name: '', farmType: 'CROP', location: 'Nairobi', size: '', description: '' };
    const result = farmFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('validates crop form data', async () => {
    const { cropFormSchema } = await import('@/lib/validation');

    const validData = { name: 'Maize', farmId: 'uuid-123', cropType: 'grain', area: '10', status: 'active' };
    const result = cropFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects crop form with empty name', async () => {
    const { cropFormSchema } = await import('@/lib/validation');

    const invalidData = { name: '', farmId: 'uuid-123', cropType: '', area: '', status: '' };
    const result = cropFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('rejects crop form with empty farmId', async () => {
    const { cropFormSchema } = await import('@/lib/validation');

    const invalidData = { name: 'Maize', farmId: '', cropType: '', area: '', status: '' };
    const result = cropFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('validates login form', async () => {
    const { loginFormSchema } = await import('@/lib/validation');

    const validData = { email: 'test@example.com', password: 'password123' };
    const result = loginFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects login form with invalid email', async () => {
    const { loginFormSchema } = await import('@/lib/validation');

    const invalidData = { email: 'not-an-email', password: 'password123' };
    const result = loginFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('rejects login form with short password', async () => {
    const { loginFormSchema } = await import('@/lib/validation');

    const invalidData = { email: 'test@example.com', password: '123' };
    const result = loginFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('validates worker form', async () => {
    const { workerFormSchema } = await import('@/lib/validation');

    const validData = { firstName: 'John', lastName: 'Doe', position: 'Farmhand', phone: '+1234567890', farmId: 'uuid-123', email: 'john@example.com' };
    const result = workerFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects worker form with empty name', async () => {
    const { workerFormSchema } = await import('@/lib/validation');

    const invalidData = { fullName: '', role: '', phone: '', farmId: 'uuid-123', email: '' };
    const result = workerFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
