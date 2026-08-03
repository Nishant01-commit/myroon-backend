module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/env.setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/db.setup.ts', '<rootDir>/tests/mocks.setup.ts'],
  testTimeout: 30000, // mongodb-memory-server's first binary download can be slow
  clearMocks: true,
};
