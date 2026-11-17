'use strict';

/**
 * PostgreSQL connection pool.
 * - Uses DATABASE_URL_TEST in test env, DATABASE_URL otherwise.
 * - SSL auto-detected from connection string.
 * - Pool is created lazily so tests can mock before requiring.
 */

const { Pool } = require('pg');

let _pool = null;

function getConnectionString() {
  const isTest = process.env.NODE_ENV === 'test';
  return isTest
    ? (process.env.DATABASE_URL_TEST || process.env.DATABASE_URL)
    : process.env.DATABASE_URL;
}

function getPool() {
  if (_pool) return _pool;

  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and fill in your Neon connection string.'
    );
  }

  _pool = new Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  _pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err.message);
  });

  return _pool;
}

/**
 * Run a single query.
 * @param {string} text   SQL with $1, $2… placeholders.
 * @param {Array}  params Parameterized values.
 */
async function query(text, params) {
  const start = Date.now();
  const res = await getPool().query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[DB] query (${duration}ms): ${text.slice(0, 100)}`);
  }
  return res;
}

/** Obtain a client for transaction use. Always release() in finally. */
async function getClient() {
  return getPool().connect();
}

/**
 * Run a function inside a transaction.
 * Automatically commits on success, rolls back on error.
 */
async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Verify the connection is alive. Used by health check. */
async function healthCheck() {
  const { rows } = await getPool().query('SELECT NOW() AS now');
  return rows[0].now;
}

/** Close the pool (useful in tests). */
async function closePool() {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}

/** Expose pool for direct use if needed */
const pool = { get current() { return _pool; } };

module.exports = { pool, query, getClient, withTransaction, healthCheck, closePool, getPool };
