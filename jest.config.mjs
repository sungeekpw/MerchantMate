export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@server/(.*)$': '<rootDir>/server/$1',
  },
  testMatch: [
    '<rootDir>/client/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/client/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/server/**/__tests__/**/*.{js,ts}',
    '<rootDir>/server/**/*.{test,spec}.{js,ts}',
    '<rootDir>/shared/**/__tests__/**/*.{js,ts}',
    '<rootDir>/shared/**/*.{test,spec}.{js,ts}'
  ],
  collectCoverageFrom: [
    'client/src/**/*.{js,jsx,ts,tsx}',
    'server/**/*.{js,ts}',
    'shared/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!client/src/main.tsx',
    '!client/src/vite-env.d.ts'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node', 'mjs'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@testing-library))'
  ]
};