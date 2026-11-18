'use strict';

const { query } = require('../db/pool');

// ── Users ──────────────────────────────────────────────────

async function createUser({ username, display_name, email, password_hash }) {
  const { rows } = await query(
    `INSERT INTO users (username, display_name, email, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, display_name, email, bio, created_at`,
    [username, display_name, email, password_hash]
  );
  return rows[0];
}

async function findUserById(id) {
  const { rows } = await query(
    `SELECT id, username, display_name, email, bio, created_at, updated_at
     FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findUserByUsername(username) {
  const { rows } = await query(
    `SELECT id, username, display_name, email, password_hash, bio, created_at
     FROM users WHERE username = $1`,
    [username]
  );
  return rows[0] || null;
}

async function findUserByEmail(email) {
  const { rows } = await query(
    `SELECT id, username, display_name, email, password_hash, bio, created_at
     FROM users WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
}

async function updateProfile(userId, { display_name, bio }) {
  const { rows } = await query(
    `UPDATE users SET display_name = $1, bio = $2
     WHERE id = $3
     RETURNING id, username, display_name, bio, updated_at`,
    [display_name, bio, userId]
  );
  return rows[0] || null;
}

async function getUserProfile(username, viewerId = null) {
  const { rows } = await query(
    `SELECT
       u.id, u.username, u.display_name, u.bio, u.created_at,
       COUNT(DISTINCT f1.follower_id)  AS followers_count,
       COUNT(DISTINCT f2.following_id) AS following_count,
       CASE WHEN $2::uuid IS NOT NULL
            THEN EXISTS (
              SELECT 1 FROM follows
              WHERE follower_id = $2 AND following_id = u.id
            )
            ELSE false
       END AS is_following
     FROM users u
     LEFT JOIN follows f1 ON f1.following_id = u.id
     LEFT JOIN follows f2 ON f2.follower_id  = u.id
     WHERE u.username = $1
     GROUP BY u.id`,
    [username, viewerId]
  );
  return rows[0] || null;
}

// ── Sessions ───────────────────────────────────────────────

async function createSession({ userId, tokenHash, expiresAt }) {
  const { rows } = await query(
    `INSERT INTO sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, tokenHash, expiresAt]
  );
  return rows[0];
}

async function findSession(tokenHash) {
  const { rows } = await query(
    `SELECT s.id, s.user_id, s.expires_at,
            u.id AS uid, u.username, u.display_name, u.email, u.bio
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function deleteSession(tokenHash) {
  await query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
}

async function deleteExpiredSessions() {
  await query('DELETE FROM sessions WHERE expires_at <= NOW()');
}

// ── Posts ──────────────────────────────────────────────────

async function createPost({ authorId, content, imageUrl = null }) {
  const { rows } = await query(
    `INSERT INTO posts (author_id, content, image_url)
     VALUES ($1, $2, $3)
     RETURNING id, author_id, content, image_url, created_at`,
    [authorId, content, imageUrl || null]
  );
  return rows[0];
}

async function getPostById(postId, viewerId = null) {
  const { rows } = await query(
    `SELECT
       p.id, p.content, p.image_url, p.created_at, p.updated_at,
       u.id AS author_id, u.username, u.display_name,
       COUNT(DISTINCT l.user_id)  AS likes_count,
       COUNT(DISTINCT c.id)       AS comments_count,
       CASE WHEN $2::uuid IS NOT NULL
            THEN EXISTS (SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $2)
            ELSE false
       END AS is_liked
     FROM posts p
     JOIN users u ON u.id = p.author_id
     LEFT JOIN likes    l ON l.post_id = p.id
     LEFT JOIN comments c ON c.post_id = p.id
     WHERE p.id = $1
     GROUP BY p.id, u.id`,
    [postId, viewerId]
  );
  return rows[0] || null;
}

async function getFeed({ limit = 20, offset = 0, viewerId = null }) {
  const { rows } = await query(
    `SELECT
       p.id, p.content, p.image_url, p.created_at,
       u.id AS author_id, u.username, u.display_name,
       COUNT(DISTINCT l.user_id)  AS likes_count,
       COUNT(DISTINCT c.id)       AS comments_count,
       CASE WHEN $3::uuid IS NOT NULL
            THEN EXISTS (SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $3)
            ELSE false
       END AS is_liked
     FROM posts p
     JOIN users u ON u.id = p.author_id
     LEFT JOIN likes    l ON l.post_id = p.id
     LEFT JOIN comments c ON c.post_id = p.id
     GROUP BY p.id, u.id
     ORDER BY p.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset, viewerId]
  );
  return rows;
}

async function getFollowingFeed({ viewerId, limit = 20, offset = 0 }) {
  const { rows } = await query(
    `SELECT
       p.id, p.content, p.image_url, p.created_at,
       u.id AS author_id, u.username, u.display_name,
       COUNT(DISTINCT l.user_id)  AS likes_count,
       COUNT(DISTINCT c.id)       AS comments_count,
       EXISTS (SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) AS is_liked
     FROM posts p
     JOIN users u ON u.id = p.author_id
     JOIN follows f ON f.following_id = p.author_id AND f.follower_id = $1
     LEFT JOIN likes    l ON l.post_id = p.id
     LEFT JOIN comments c ON c.post_id = p.id
     GROUP BY p.id, u.id
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [viewerId, limit, offset]
  );
  return rows;
}

async function getUserPosts({ authorId, limit = 20, offset = 0, viewerId = null }) {
  const { rows } = await query(
    `SELECT
       p.id, p.content, p.image_url, p.created_at,
       u.id AS author_id, u.username, u.display_name,
       COUNT(DISTINCT l.user_id)  AS likes_count,
       COUNT(DISTINCT c.id)       AS comments_count,
       CASE WHEN $4::uuid IS NOT NULL
            THEN EXISTS (SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $4)
            ELSE false
       END AS is_liked
     FROM posts p
     JOIN users u ON u.id = p.author_id
     LEFT JOIN likes    l ON l.post_id = p.id
     LEFT JOIN comments c ON c.post_id = p.id
     WHERE p.author_id = $1
     GROUP BY p.id, u.id
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [authorId, limit, offset, viewerId]
  );
  return rows;
}

async function deletePost(postId, authorId) {
  const { rowCount } = await query(
    'DELETE FROM posts WHERE id = $1 AND author_id = $2',
    [postId, authorId]
  );
  return rowCount > 0;
}

// ── Comments ───────────────────────────────────────────────

async function createComment({ postId, authorId, content }) {
  const { rows } = await query(
    `INSERT INTO comments (post_id, author_id, content)
     VALUES ($1, $2, $3)
     RETURNING id, post_id, author_id, content, created_at`,
    [postId, authorId, content]
  );
  return rows[0];
}

async function getComments(postId) {
  const { rows } = await query(
    `SELECT
       c.id, c.content, c.created_at,
       u.id AS author_id, u.username, u.display_name
     FROM comments c
     JOIN users u ON u.id = c.author_id
     WHERE c.post_id = $1
     ORDER BY c.created_at ASC`,
    [postId]
  );
  return rows;
}

async function deleteComment(commentId, authorId) {
  const { rowCount } = await query(
    'DELETE FROM comments WHERE id = $1 AND author_id = $2',
    [commentId, authorId]
  );
  return rowCount > 0;
}

// ── Likes ──────────────────────────────────────────────────

async function likePost(postId, userId) {
  try {
    await query(
      'INSERT INTO likes (post_id, user_id) VALUES ($1, $2)',
      [postId, userId]
    );
    return true;
  } catch (err) {
    if (err.code === '23505') return false; // already liked
    throw err;
  }
}

async function unlikePost(postId, userId) {
  const { rowCount } = await query(
    'DELETE FROM likes WHERE post_id = $1 AND user_id = $2',
    [postId, userId]
  );
  return rowCount > 0;
}

async function getLikeCount(postId) {
  const { rows } = await query(
    'SELECT COUNT(*) AS count FROM likes WHERE post_id = $1',
    [postId]
  );
  return parseInt(rows[0].count, 10);
}

// ── Follows ────────────────────────────────────────────────

async function followUser(followerId, followingId) {
  if (followerId === followingId) return { error: 'self_follow' };
  try {
    await query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
      [followerId, followingId]
    );
    return { ok: true };
  } catch (err) {
    if (err.code === '23505') return { error: 'already_following' };
    throw err;
  }
}

async function unfollowUser(followerId, followingId) {
  const { rowCount } = await query(
    'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
    [followerId, followingId]
  );
  return rowCount > 0;
}

async function getFollowers(userId) {
  const { rows } = await query(
    `SELECT u.id, u.username, u.display_name
     FROM follows f
     JOIN users u ON u.id = f.follower_id
     WHERE f.following_id = $1
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return rows;
}

async function getFollowing(userId) {
  const { rows } = await query(
    `SELECT u.id, u.username, u.display_name
     FROM follows f
     JOIN users u ON u.id = f.following_id
     WHERE f.follower_id = $1
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return rows;
}

async function getSuggestedUsers({ viewerId = null, limit = 5 }) {
  const { rows } = await query(
    `SELECT
       u.id, u.username, u.display_name, u.bio,
       COUNT(DISTINCT f.follower_id) AS followers_count,
       CASE WHEN $1::uuid IS NOT NULL
            THEN EXISTS (SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = u.id)
            ELSE false
       END AS is_following
     FROM users u
     LEFT JOIN follows f ON f.following_id = u.id
     WHERE ($1::uuid IS NULL OR u.id != $1)
       AND ($1::uuid IS NULL OR NOT EXISTS (
         SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = u.id
       ))
     GROUP BY u.id
     ORDER BY followers_count DESC, u.created_at DESC
     LIMIT $2`,
    [viewerId, limit]
  );
  return rows;
}

async function getExplorePosts({ limit = 30, offset = 0, viewerId = null, filter = null, search = null }) {
  const whereClauses = [];
  const params = [];
  let idx = 1;

  if (filter === 'photos') {
    whereClauses.push('p.image_url IS NOT NULL');
  }

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    whereClauses.push(`(p.content ILIKE $${idx} OR u.username ILIKE $${idx} OR u.display_name ILIKE $${idx})`);
    idx++;
  }

  params.push(viewerId);
  const viewerParamIdx = idx++;

  const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  params.push(limit);
  const limitIdx = idx++;
  params.push(offset);
  const offsetIdx = idx++;

  const sql = `
    SELECT
      p.id, p.content, p.image_url, p.created_at,
      u.id AS author_id, u.username, u.display_name,
      COUNT(DISTINCT l.user_id)  AS likes_count,
      COUNT(DISTINCT c.id)       AS comments_count,
      CASE WHEN $${viewerParamIdx}::uuid IS NOT NULL
           THEN EXISTS (SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $${viewerParamIdx})
           ELSE false
      END AS is_liked
    FROM posts p
    JOIN users u ON u.id = p.author_id
    LEFT JOIN likes    l ON l.post_id = p.id
    LEFT JOIN comments c ON c.post_id = p.id
    ${whereStr}
    GROUP BY p.id, u.id
    ORDER BY (COUNT(DISTINCT l.user_id) * 2 + COUNT(DISTINCT c.id)) DESC, p.created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

  const { rows } = await query(sql, params);
  return rows;
}

async function getRecentActivity({ limit = 5 }) {
  const { rows } = await query(
    `SELECT
       c.id, c.content, c.created_at,
       u.username, u.display_name,
       p.id AS post_id, p.content AS post_content
     FROM comments c
     JOIN users u ON u.id = c.author_id
     JOIN posts p ON p.id = c.post_id
     ORDER BY c.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function getTrendingHashtags({ limit = 6 }) {
  const { rows } = await query(
    `SELECT p.content FROM posts p ORDER BY p.created_at DESC LIMIT 60`
  );
  const tagCounts = {};
  for (const row of rows) {
    const tags = row.content.match(/#[a-zA-Z0-9_]+/g) || [];
    for (const t of tags) {
      const lower = t.toLowerCase();
      tagCounts[lower] = (tagCounts[lower] || 0) + 1;
    }
  }
  const sorted = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
  return sorted;
}

module.exports = {
  // Users
  createUser, findUserById, findUserByUsername, findUserByEmail,
  updateProfile, getUserProfile, getSuggestedUsers,
  // Sessions
  createSession, findSession, deleteSession, deleteExpiredSessions,
  // Posts
  createPost, getPostById, getFeed, getFollowingFeed, getUserPosts, deletePost,
  getExplorePosts, getRecentActivity, getTrendingHashtags,
  // Comments
  createComment, getComments, deleteComment,
  // Likes
  likePost, unlikePost, getLikeCount,
  // Follows
  followUser, unfollowUser, getFollowers, getFollowing,
};
