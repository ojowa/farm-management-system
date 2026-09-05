import { toApiError, describeApiError } from './apiError';

describe('apiError', () => {
  describe('toApiError', () => {
    it('handles null/undefined input', () => {
      const result = toApiError(null);
      expect(result.isNetwork).toBe(false);
      expect(result.status).toBeNull();
      expect(result.message).toBe('Request failed');
    });

    it('parses network error (no response)', () => {
      const error = { message: 'Network Error', code: 'ERR_NETWORK' };
      const result = toApiError(error);
      expect(result.isNetwork).toBe(true);
      expect(result.status).toBeNull();
    });

    it('parses 401 error', () => {
      const error = {
        response: { status: 401, data: { message: 'Unauthorized' } },
      };
      const result = toApiError(error);
      expect(result.status).toBe(401);
      expect(result.isAuth).toBe(true);
      expect(result.isForbidden).toBe(false);
    });

    it('parses 403 error', () => {
      const error = { response: { status: 403, data: {} } };
      const result = toApiError(error);
      expect(result.isForbidden).toBe(true);
      expect(result.isAuth).toBe(true);
    });

    it('parses 404 error', () => {
      const error = { response: { status: 404, data: {} } };
      const result = toApiError(error);
      expect(result.status).toBe(404);
      expect(result.isClient).toBe(true);
    });

    it('parses 500 error', () => {
      const error = { response: { status: 500, data: {} } };
      const result = toApiError(error);
      expect(result.isServer).toBe(true);
    });

    it('extracts server message from response.data.message', () => {
      const error = {
        response: { status: 400, data: { message: 'Invalid email' } },
      };
      const result = toApiError(error);
      expect(result.message).toBe('Invalid email');
    });

    it('extracts server message from response.data.error', () => {
      const error = {
        response: { status: 400, data: { error: 'Bad request' } },
      };
      const result = toApiError(error);
      expect(result.message).toBe('Bad request');
    });

    it('uses fallback when no message', () => {
      const error = { response: { status: 500, data: {} } };
      const result = toApiError(error, 'Something broke');
      expect(result.message).toBe('Something broke');
    });
  });

  describe('describeApiError', () => {
    it('network error → friendly message', () => {
      const error = { message: 'Network Error', code: 'ERR_NETWORK' };
      expect(describeApiError(error)).toBe('No connection. Check your network and try again.');
    });

    it('401 → session expired', () => {
      const error = { response: { status: 401, data: {} } };
      expect(describeApiError(error)).toBe('Your session has expired. Please sign in again.');
    });

    it('403 → no permission', () => {
      const error = { response: { status: 403, data: {} } };
      expect(describeApiError(error)).toBe("You don\u2019t have permission to do that.");
    });

    it('404 → not found', () => {
      const error = { response: { status: 404, data: {} } };
      expect(describeApiError(error)).toBe('The requested resource was not found.');
    });

    it('500 → server error', () => {
      const error = { response: { status: 500, data: {} } };
      expect(describeApiError(error)).toBe('The server ran into a problem. Please try again in a moment.');
    });

    it('server message is used when available', () => {
      const error = {
        response: { status: 400, data: { message: 'Email already in use' } },
      };
      expect(describeApiError(error)).toBe('Email already in use');
    });

    it('fallback is used for unknown errors', () => {
      expect(describeApiError(null, 'Custom fallback')).toBe('Custom fallback');
    });
  });
});
