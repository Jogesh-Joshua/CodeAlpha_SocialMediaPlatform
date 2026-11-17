'use strict';
/**
 * Unit tests (mocked DB) — health, validation, auth guards.
 * Does NOT require a live database.
 */

// Mock pool before app is required
jest.mock('../src/db/pool', () => ({
  query        : jest.fn(),
  getClient    : jest.fn(),
  withTransaction: jest.fn(),
  healthCheck  : jest.fn().mockResolvedValue('2024-01-01T00:00:00.000Z'),
  closePool    : jest.fn(),
  getPool      : jest.fn(),
  pool         : {},
}));

jest.mock('../src/db/queries', () => ({
  findSession          : jest.fn().mockResolvedValue(null),
  createUser           : jest.fn(),
  findUserByEmail      : jest.fn().mockResolvedValue(null),
  findUserByUsername   : jest.fn().mockResolvedValue(null),
  createSession        : jest.fn(),
  deleteSession        : jest.fn(),
  getFeed              : jest.fn().mockResolvedValue([]),
  getFollowingFeed     : jest.fn().mockResolvedValue([]),
  createPost           : jest.fn(),
  getPostById          : jest.fn(),
  deletePost           : jest.fn(),
  likePost             : jest.fn(),
  unlikePost           : jest.fn(),
  getLikeCount         : jest.fn().mockResolvedValue(0),
  getComments          : jest.fn().mockResolvedValue([]),
  createComment        : jest.fn(),
  deleteComment        : jest.fn(),
  getUserProfile       : jest.fn(),
  updateProfile        : jest.fn(),
  getUserPosts         : jest.fn().mockResolvedValue([]),
  followUser           : jest.fn(),
  unfollowUser         : jest.fn(),
  getFollowers         : jest.fn().mockResolvedValue([]),
  getFollowing         : jest.fn().mockResolvedValue([]),
  deleteExpiredSessions: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/app');

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toContain('Social Media');
    expect(res.body.db).toBeDefined();
  });
});

describe('API — 404 for unknown routes', () => {
  it('returns 404 JSON for unknown API route', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});

describe('GET /api/posts (global feed)', () => {
  it('returns 200 with posts array', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.posts)).toBe(true);
  });
});

describe('POST /api/auth/register — validation', () => {
  it('rejects missing fields with 400', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects invalid username with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'a!', display_name: 'Test', email: 'a@b.com', password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('rejects short password with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'validuser', display_name: 'Valid', email: 'v@v.com', password: 'short' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login — validation', () => {
  it('rejects empty body with 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});

describe('Protected routes — 401 without auth', () => {
  it('POST /api/posts returns 401', async () => {
    const res = await request(app).post('/api/posts').send({ content: 'Hello' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/logout returns 401', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });

  it('PUT /api/users/me/profile returns 401', async () => {
    const res = await request(app).put('/api/users/me/profile').send({ display_name: 'X' });
    expect(res.status).toBe(401);
  });

  it('POST /api/posts/fakeid/like returns 401', async () => {
    const res = await request(app).post('/api/posts/fakeid/like');
    expect(res.status).toBe(401);
  });
});
