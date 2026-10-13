import { describe, it, expect } from 'vitest';
import { getErrorMessage } from '@/lib/toasts';

// The API wraps failures differently depending on which layer produced them,
// so each envelope is a case worth pinning down. The first one is the real
// body the auth service returns (captured from production).
const axiosLike = (status: number, data: any, extra: any = {}) => ({
  isAxiosError: true,
  message: `Request failed with status code ${status}`,
  request: {},
  response: { status, data },
  ...extra,
});

describe('getErrorMessage', () => {
  it('reads the auth service envelope ({ success, data: { message } })', () => {
    const err = axiosLike(401, {
      success: false,
      data: { statusCode: 401, message: 'Invalid credentials', path: '/auth/login' },
    });
    expect(getErrorMessage(err)).toBe('Invalid credentials');
  });

  it("reads Nest's default envelope ({ message })", () => {
    const err = axiosLike(409, { statusCode: 409, message: 'Email already registered' });
    expect(getErrorMessage(err)).toBe('Email already registered');
  });

  it('joins validation errors from an array message', () => {
    const err = axiosLike(400, {
      statusCode: 400,
      message: ['email must be an email', 'password is too short'],
    });
    expect(getErrorMessage(err)).toBe('email must be an email. password is too short');
  });

  it('reads the gateway filter envelope ({ error: { message } })', () => {
    const err = axiosLike(404, { success: false, error: { statusCode: 404, message: 'Role not found' } });
    expect(getErrorMessage(err)).toBe('Role not found');
  });

  it('reads a plain string error body', () => {
    const err = axiosLike(500, { error: 'Upstream service unavailable' });
    expect(getErrorMessage(err)).toBe('Upstream service unavailable');
  });

  it('translates rate limiting instead of leaking the throttler message', () => {
    const err = axiosLike(429, { statusCode: 429, message: 'ThrottlerException: Too Many Requests' });
    expect(getErrorMessage(err)).toBe('Too many attempts. Please wait a minute and try again.');
  });

  it('explains a request that never reached the server', () => {
    const err = { message: 'Network Error', request: {} };
    expect(getErrorMessage(err)).toBe("Can't reach the server. Check your connection and try again.");
  });

  it('uses a friendly message for server errors', () => {
    const err = { message: 'Request failed with status code 502', request: {}, response: { status: 502, data: '' } };
    expect(getErrorMessage(err)).toBe('The server had a problem. Please try again shortly.');
  });

  it('never surfaces axios technical messages', () => {
    const err = axiosLike(401, {});
    expect(getErrorMessage(err, 'Invalid credentials')).toBe('Invalid credentials');
  });

  it('falls back for non-axios throws such as the MFA hand-off object', () => {
    expect(getErrorMessage({ requiresMFA: true, mfaToken: 'x' }, 'Invalid credentials')).toBe(
      'Invalid credentials',
    );
  });
});
