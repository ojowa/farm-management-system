// Jest setup for api-gateway tests.
// Ensure required env vars exist so modules that use them at import-time don't crash.

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-unit-tests-only';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || 'http://localhost:3000';

