export default {
  testEnvironment: 'jsdom',
  transform: {},
  moduleNameMapper: {
    '^https://cdn\\.jsdelivr\\.net/npm/@supabase/supabase-js/\\+esm$': '<rootDir>/__mocks__/supabase.js',
    '^../assets/js/config\\.js$': '<rootDir>/__mocks__/config.js'
  },
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'modules/**/*.js',
    '!modules/**/*.test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};