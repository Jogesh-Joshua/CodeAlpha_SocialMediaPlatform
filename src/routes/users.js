'use strict';
/**
 * User / profile routes.
 * GET  /api/users/:username          — public profile
 * PUT  /api/users/me/profile         — edit own profile
 * GET  /api/users/:username/posts    — user's posts
 * POST /api/users/:username/follow   — follow user
 * DELETE /api/users/:username/follow — unfollow user
 * GET  /api/users/:username/followers
 * GET  /api/users/:username/following
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validateDisplayName, validateBio } = require('../middleware/validate');
const db = require('../db/queries');

const router = express.Router();

function parsePage(val) {
  const n = parseInt(val, 10);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

// GET /api/users/me — alias for current user info
router.get('/me', requireAuth, (req, res) => {
  const { id, username, display_name, email, bio } = req.user;
  res.json({ user: { id, username, display_name, email, bio } });
});

// GET /api/users/suggestions — discover people suggestions
router.get('/suggestions', async (req, res, next) => {
  try {
    const viewerId = req.user?.id || null;
    const suggestions = await db.getSuggestedUsers({ viewerId, limit: 5 });
    res.json({ suggestions });
  } catch (err) { next(err); }
});

// PUT /api/users/me/profile — MUST be before /:username to avoid "me" being treated as a username
router.put('/me/profile', requireAuth, async (req, res, next) => {
  try {
    const { display_name, bio } = req.body || {};
    const errors = [
      validateDisplayName(display_name),
      validateBio(bio || ''),
    ].filter(Boolean);
    if (errors.length) return res.status(400).json({ error: errors[0] });

    const updated = await db.updateProfile(req.user.id, {
      display_name: display_name.trim(),
      bio: (bio || '').trim(),
    });
    if (!updated) return res.status(404).json({ error: 'User not found.' });
    res.json({ profile: updated });
  } catch (err) { next(err); }
});

// GET /api/users/:username — public profile with counts
router.get('/:username', async (req, res, next) => {
  try {
    const viewerId = req.user?.id || null;
    const profile = await db.getUserProfile(req.params.username, viewerId);
    if (!profile) return res.status(404).json({ error: 'User not found.' });
    res.json({ profile });
  } catch (err) { next(err); }
});

// (me/profile handled above)

// GET /api/users/:username/posts
router.get('/:username/posts', async (req, res, next) => {
  try {
    const viewerId = req.user?.id || null;
    const user = await db.findUserByUsername(req.params.username);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const page   = parsePage(req.query.page);
    const limit  = 20;
    const offset = (page - 1) * limit;

    const posts = await db.getUserPosts({ authorId: user.id, limit, offset, viewerId });
    res.json({ posts, page, limit });
  } catch (err) { next(err); }
});

// POST /api/users/:username/follow
router.post('/:username/follow', requireAuth, async (req, res, next) => {
  try {
    const target = await db.findUserByUsername(req.params.username);
    if (!target) return res.status(404).json({ error: 'User not found.' });

    const result = await db.followUser(req.user.id, target.id);
    if (result.error === 'self_follow') {
      return res.status(400).json({ error: 'You cannot follow yourself.' });
    }
    if (result.error === 'already_following') {
      return res.status(409).json({ error: 'Already following.' });
    }
    res.json({ message: `Now following @${target.username}.` });
  } catch (err) { next(err); }
});

// DELETE /api/users/:username/follow
router.delete('/:username/follow', requireAuth, async (req, res, next) => {
  try {
    const target = await db.findUserByUsername(req.params.username);
    if (!target) return res.status(404).json({ error: 'User not found.' });

    const ok = await db.unfollowUser(req.user.id, target.id);
    if (!ok) return res.status(404).json({ error: 'Not following this user.' });
    res.json({ message: `Unfollowed @${target.username}.` });
  } catch (err) { next(err); }
});

// GET /api/users/:username/followers
router.get('/:username/followers', async (req, res, next) => {
  try {
    const user = await db.findUserByUsername(req.params.username);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const followers = await db.getFollowers(user.id);
    res.json({ followers });
  } catch (err) { next(err); }
});

// GET /api/users/:username/following
router.get('/:username/following', async (req, res, next) => {
  try {
    const user = await db.findUserByUsername(req.params.username);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const following = await db.getFollowing(user.id);
    res.json({ following });
  } catch (err) { next(err); }
});

module.exports = router;
