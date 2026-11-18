'use strict';
/**
 * Post routes.
 * GET  /api/posts              — global feed (paginated)
 * GET  /api/posts/following    — following feed
 * POST /api/posts              — create post
 * GET  /api/posts/:id          — single post + comments
 * DELETE /api/posts/:id        — delete own post
 * POST /api/posts/:id/like     — like post
 * DELETE /api/posts/:id/like   — unlike post
 * GET  /api/posts/:id/comments — get comments
 * POST /api/posts/:id/comments — add comment
 * DELETE /api/posts/:id/comments/:cid — delete own comment
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validatePostContent, validateCommentContent, validateImageUrl } = require('../middleware/validate');
const db = require('../db/queries');

const router = express.Router();

function parsePage(val) {
  const n = parseInt(val, 10);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

// GET /api/posts/explore — explore & discovery feed with search and filter
router.get('/explore', async (req, res, next) => {
  try {
    const viewerId = req.user?.id || null;
    const page     = parsePage(req.query.page);
    const limit    = 24;
    const offset   = (page - 1) * limit;
    const filter   = req.query.filter || null; // e.g. 'photos'
    const search   = req.query.q || null;
    const posts    = await db.getExplorePosts({ limit, offset, viewerId, filter, search });
    res.json({ posts, page, limit });
  } catch (err) { next(err); }
});

// GET /api/posts/trending — trending hashtags
router.get('/trending', async (req, res, next) => {
  try {
    const topics = await db.getTrendingHashtags({ limit: 6 });
    res.json({ topics });
  } catch (err) { next(err); }
});

// GET /api/posts/activity — recent community activity
router.get('/activity', async (req, res, next) => {
  try {
    const activity = await db.getRecentActivity({ limit: 5 });
    res.json({ activity });
  } catch (err) { next(err); }
});

// GET /api/posts — global feed
router.get('/', async (req, res, next) => {
  try {
    const viewerId = req.user?.id || null;
    const page     = parsePage(req.query.page);
    const limit    = 20;
    const offset   = (page - 1) * limit;
    const posts = await db.getFeed({ limit, offset, viewerId });
    res.json({ posts, page, limit });
  } catch (err) { next(err); }
});

// GET /api/posts/following — authenticated following feed
router.get('/following', requireAuth, async (req, res, next) => {
  try {
    const page   = parsePage(req.query.page);
    const limit  = 20;
    const offset = (page - 1) * limit;
    const posts = await db.getFollowingFeed({ viewerId: req.user.id, limit, offset });
    res.json({ posts, page, limit });
  } catch (err) { next(err); }
});

// POST /api/posts — create post
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { content, image_url } = req.body || {};
    const err = validatePostContent(content);
    if (err) return res.status(400).json({ error: err });

    const imgErr = validateImageUrl(image_url);
    if (imgErr) return res.status(400).json({ error: imgErr });

    const post = await db.createPost({
      authorId: req.user.id,
      content : content.trim(),
      imageUrl: image_url ? image_url.trim() : null,
    });
    // Return enriched data
    const full = await db.getPostById(post.id, req.user.id);
    res.status(201).json({ post: full });
  } catch (err) { next(err); }
});

// GET /api/posts/:id
router.get('/:id', async (req, res, next) => {
  try {
    const viewerId = req.user?.id || null;
    const post = await db.getPostById(req.params.id, viewerId);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    const comments = await db.getComments(req.params.id);
    res.json({ post, comments });
  } catch (err) { next(err); }
});

// DELETE /api/posts/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const ok = await db.deletePost(req.params.id, req.user.id);
    if (!ok) return res.status(403).json({ error: 'Post not found or not yours.' });
    res.json({ message: 'Post deleted.' });
  } catch (err) { next(err); }
});

// POST /api/posts/:id/like
router.post('/:id/like', requireAuth, async (req, res, next) => {
  try {
    const liked = await db.likePost(req.params.id, req.user.id);
    const count = await db.getLikeCount(req.params.id);
    res.json({ liked, likes_count: count });
  } catch (err) { next(err); }
});

// DELETE /api/posts/:id/like
router.delete('/:id/like', requireAuth, async (req, res, next) => {
  try {
    await db.unlikePost(req.params.id, req.user.id);
    const count = await db.getLikeCount(req.params.id);
    res.json({ liked: false, likes_count: count });
  } catch (err) { next(err); }
});

// GET /api/posts/:id/comments
router.get('/:id/comments', async (req, res, next) => {
  try {
    const comments = await db.getComments(req.params.id);
    res.json({ comments });
  } catch (err) { next(err); }
});

// POST /api/posts/:id/comments
router.post('/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const { content } = req.body || {};
    const err = validateCommentContent(content);
    if (err) return res.status(400).json({ error: err });

    const comment = await db.createComment({
      postId  : req.params.id,
      authorId: req.user.id,
      content : content.trim(),
    });
    // Enrich with author info
    const enriched = {
      ...comment,
      username    : req.user.username,
      display_name: req.user.display_name,
      author_id   : req.user.id,
    };
    res.status(201).json({ comment: enriched });
  } catch (err) { next(err); }
});

// DELETE /api/posts/:id/comments/:cid
router.delete('/:id/comments/:cid', requireAuth, async (req, res, next) => {
  try {
    const ok = await db.deleteComment(req.params.cid, req.user.id);
    if (!ok) return res.status(403).json({ error: 'Comment not found or not yours.' });
    res.json({ message: 'Comment deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
