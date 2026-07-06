import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: [
      'src/__tests__/Badge.test.tsx',
      'src/__tests__/Button.test.tsx',
      'src/__tests__/Card.test.tsx',
      'src/__tests__/Input.test.tsx',
    ],
    css: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
