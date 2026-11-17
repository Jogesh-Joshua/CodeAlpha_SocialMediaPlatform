'use strict';

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['./tests/setup.js'],
  testTimeout: 20000,
  // Reset modules between test files so mocks don't bleed across
  resetModules: true,
  // Collect coverage from src
  collectCoverageFrom: ['src/**/*.js'],
};
