'use strict';
/**
 * Global error-handling middleware.
 * Must have 4 parameters so Express identifies it as error handler.
 */

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // PostgreSQL invalid UUID input → 404 instead of 500
  if (err.code === '22P02') {
    return res.status(404).json({ error: 'Resource not found.' });
  }

  const status = err.status || err.statusCode || 500;
  const message = status < 500
    ? err.message
    : 'An unexpected error occurred. Please try again.';

  if (status >= 500) {
    console.error('[Error]', err.message, err.code || '');
  }

  res.status(status).json({ error: message });
}

function notFound(req, res) {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
}

module.exports = { errorHandler, notFound };
