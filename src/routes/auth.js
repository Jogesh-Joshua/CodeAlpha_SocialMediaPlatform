'use strict';
/**
 * Auth routes — registration, login, logout, session status.
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/logout
 * GET  /api/auth/me
 */

const express  = require('express');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const rateLimit = require('express-rate-limit');

const { requireAuth, hashToken } = require('../middleware/auth');
const {
  validateUsername, validateEmail, validatePassword, validateDisplayName,
} = require('../middleware/validate');
const db = require('../db/queries');

const router = express.Router();

const BCRYPT_ROUNDS = process.env.NODE_ENV === 'test' ? 4 : parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Auth rate limiter — 10 attempts per 15 minutes (skipped in tests)
const authLimiter = rateLimit({
  windowMs : parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10),
  max      : parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
  message  : { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders  : false,
  skip     : () => process.env.NODE_ENV === 'test',
});

function setSessionCookie(res, token) {
  res.cookie('session_token', token, {
    httpOnly: true,
    secure  : process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge  : COOKIE_MAX_AGE,
    path    : '/',
  });
}

// ── Register ───────────────────────────────────────────────
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const { username, display_name, email, password } = req.body || {};

    const errors = [
      validateUsername(username),
      validateDisplayName(display_name || username),
      validateEmail(email),
      validatePassword(password),
    ].filter(Boolean);

    if (errors.length) return res.status(400).json({ error: errors[0] });

    // Check duplicates
    const [existingEmail, existingUsername] = await Promise.all([
      db.findUserByEmail(email.trim().toLowerCase()),
      db.findUserByUsername(username.trim()),
    ]);
    if (existingEmail)    return res.status(409).json({ error: 'Email is already registered.' });
    if (existingUsername) return res.status(409).json({ error: 'Username is already taken.' });

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await db.createUser({
      username    : username.trim(),
      display_name: (display_name || username).trim(),
      email       : email.trim().toLowerCase(),
      password_hash,
    });

    // Create session
    const rawToken   = crypto.randomBytes(32).toString('hex');
    const tokenHash  = hashToken(rawToken);
    const expiresAt  = new Date(Date.now() + COOKIE_MAX_AGE);
    await db.createSession({ userId: user.id, tokenHash, expiresAt });

    setSessionCookie(res, rawToken);
    return res.status(201).json({
      user: {
        id: user.id, username: user.username,
        display_name: user.display_name, email: user.email, bio: user.bio,
      },
    });
  } catch (err) { next(err); }
});

// ── Login ──────────────────────────────────────────────────
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { login, password } = req.body || {};
    if (!login || !password) {
      return res.status(400).json({ error: 'Username/email and password are required.' });
    }

    // Allow login by email or username
    const isEmail = login.includes('@');
    const user = isEmail
      ? await db.findUserByEmail(login.trim().toLowerCase())
      : await db.findUserByUsername(login.trim());

    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + COOKIE_MAX_AGE);
    await db.createSession({ userId: user.id, tokenHash, expiresAt });

    setSessionCookie(res, rawToken);
    return res.json({
      user: {
        id: user.id, username: user.username,
        display_name: user.display_name, email: user.email, bio: user.bio,
      },
    });
  } catch (err) { next(err); }
});

// ── Logout ─────────────────────────────────────────────────
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const raw = req.cookies?.session_token;
    if (raw) {
      const tokenHash = hashToken(raw);
      await db.deleteSession(tokenHash);
    }
    res.clearCookie('session_token', { path: '/' });
    return res.json({ message: 'Logged out.' });
  } catch (err) { next(err); }
});

// ── Me ─────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  const { id, username, display_name, email, bio } = req.user;
  res.json({ user: { id, username, display_name, email, bio } });
});

module.exports = router;
