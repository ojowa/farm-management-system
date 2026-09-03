module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx', '**/*.test.ts', '**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/__mocks__/', '/e2e/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^test-renderer$': 'react-test-renderer',
  },
  setupFiles: ['<rootDir>/jest-setup.js'],
  clearMocks: true,
  collectCoverageFrom: [
    'src/store/slices/*.ts',
    'src/utils/*.ts',
    'src/services/api.ts',
    'src/components/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  transform: {
    '^.+\\.tsx?$': ['babel-jest', {
      presets: ['babel-preset-expo'],
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@reduxjs/toolkit|immer)',
  ],
};
