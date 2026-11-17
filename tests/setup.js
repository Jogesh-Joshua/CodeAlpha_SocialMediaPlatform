'use strict';
/**
 * Jest global setup.
 * Loaded before every test file via setupFiles in jest.config.js.
 * Sets NODE_ENV=test and routes DATABASE_URL_TEST if configured.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

process.env.NODE_ENV = 'test';

// If a dedicated test DB URL is set, use it; otherwise fall back to DATABASE_URL
if (!process.env.DATABASE_URL_TEST && process.env.DATABASE_URL) {
  process.env.DATABASE_URL_TEST = process.env.DATABASE_URL;
}

// Ensure SESSION_SECRET has a value for unit tests
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'test-secret-do-not-use-in-production-32ch';
}
