/**
 * Jest configuration for MedTranslate AI
 * Enhanced with coverage thresholds and project organization
 */

module.exports = {
  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: 'v8',

  // A list of paths to directories that Jest should use to search for files in
  roots: [
    '<rootDir>/tests'
  ],

  // The test environment that will be used for testing
  testEnvironment: 'node',

  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[tj]s?(x)'
  ],

  // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/'
  ],

  // A map from regular expressions to paths to transformers
  transform: {},

  // Indicates whether each individual test should be reported during the run
  verbose: true,

  // Setup files to run before each test
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],

  // Test timeout
  testTimeout: 30000, // 30 seconds

  // Module name mapper for imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },

  // Collect coverage from these directories
  collectCoverageFrom: [
    'backend/**/*.js',
    'edge/**/*.js',
    'frontend/**/*.js',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/coverage/**'
  ],

  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: ['json', 'lcov', 'text', 'clover', 'html'],

  // The threshold for coverage results
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70
    },
    './backend/': {
      statements: 75,
      branches: 65,
      functions: 75,
      lines: 75
    },
    './edge/': {
      statements: 75,
      branches: 65,
      functions: 75,
      lines: 75
    }
  },

  // Projects configuration for monorepo setup
  projects: [
    {
      displayName: 'backend',
      testMatch: [
        '<rootDir>/tests/unit/**/backend*.test.js',
        '<rootDir>/tests/integration/**/backend*.test.js',
        '<rootDir>/tests/unit/translation*.test.js',
        '<rootDir>/tests/unit/auth*.test.js',
        '<rootDir>/tests/unit/websocket*.test.js'
      ],
      testEnvironment: 'node'
    },
    {
      displayName: 'edge',
      testMatch: [
        '<rootDir>/tests/unit/**/edge*.test.js',
        '<rootDir>/tests/integration/**/edge*.test.js',
        '<rootDir>/tests/unit/cache*.test.js',
        '<rootDir>/tests/unit/sync*.test.js',
        '<rootDir>/tests/performance/edge*.test.js'
      ],
      testEnvironment: 'node'
    },
    {
      displayName: 'frontend',
      testMatch: [
        '<rootDir>/tests/unit/**/provider*.test.js',
        '<rootDir>/tests/unit/**/patient*.test.js',
        '<rootDir>/tests/unit/**/admin*.test.js',
        '<rootDir>/tests/integration/**/frontend*.test.js'
      ],
      testEnvironment: 'jsdom'
    },
    {
      displayName: 'e2e',
      testMatch: [
        '<rootDir>/tests/e2e/**/*.test.js',
        '<rootDir>/tests/integration/complete-*.test.js'
      ],
      testEnvironment: 'node',
      testTimeout: 60000 // 60 seconds for E2E tests
    }
  ]
};
