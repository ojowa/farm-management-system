module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx', '**/*.test.ts', '**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/__mocks__/', '/e2e/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^test-renderer$': 'react-test-renderer',
    // SDK 57's dependency graph leaves expo-modules-core nested under expo/
    // (hoisting it conflicts with react-native-worklets 0.13's peer range),
    // so jest can't resolve the bare specifier that jest-expo's setup uses.
    '^expo-modules-core$': '<rootDir>/node_modules/expo/node_modules/expo-modules-core',
    '^expo-modules-core/(.*)$': '<rootDir>/node_modules/expo/node_modules/expo-modules-core/$1',
  },
  setupFiles: ['<rootDir>/jest-setup.js'],
  clearMocks: true,
  collectCoverageFrom: [
    'src/store/slices/*.ts',
    'src/core/utils/*.ts',
    'src/services/api.ts',
    'src/core/ui/**/*.tsx',
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
