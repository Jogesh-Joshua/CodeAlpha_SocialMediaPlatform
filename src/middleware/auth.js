'use strict';
/**
 * Authentication middleware.
 * Reads the session token from the signed cookie and attaches
 * req.user if valid. Never throws — just sets req.user = null.
 */

const crypto = require('crypto');
const { findSession } = require('../db/queries');

/**
 * Hash a raw token with HMAC-SHA256 for safe storage.
 */
function hashToken(raw) {
  return crypto
    .createHmac('sha256', process.env.SESSION_SECRET || 'dev-secret')
    .update(raw)
    .digest('hex');
}

/**
 * Optional auth — populates req.user if cookie is valid.
 */
async function authenticate(req, res, next) {
  const raw = req.cookies?.session_token;
  if (!raw) {
    req.user = null;
    return next();
  }
  try {
    const tokenHash = hashToken(raw);
    const session   = await findSession(tokenHash);
    req.user = session
      ? { id: session.user_id, username: session.username,
          display_name: session.display_name, email: session.email,
          bio: session.bio }
      : null;
  } catch {
    req.user = null;
  }
  next();
}

/**
 * Required auth — returns 401 if not logged in.
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  next();
}

module.exports = { authenticate, requireAuth, hashToken };
