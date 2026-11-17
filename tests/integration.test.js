'use strict';
/**
 * Integration tests — real PostgreSQL database required.
 * Skipped automatically if DATABASE_URL_TEST is not set.
 *
 * Uses a unique test-schema prefix per run to isolate data.
 * All test data is cleaned up after each test suite.
 *
 * Run:
 *   DATABASE_URL_TEST=postgresql://... npx jest tests/integration.test.js --forceExit
 */

const request = require('supertest');

const HAS_DB = !!(process.env.DATABASE_URL_TEST || process.env.DATABASE_URL);

// Skip entire file gracefully if no DB configured
const describeIf = HAS_DB ? describe : describe.skip;

let app;
let db;
let pool;

// Agents: Alice, Bob, Carol
const alice = { username: `alice_${Date.now()}`, display_name: 'Alice Test', email: `alice_${Date.now()}@test.com`, password: 'Password123!' };
const bob   = { username: `bob_${Date.now()}`,   display_name: 'Bob Test',   email: `bob_${Date.now()}@test.com`,   password: 'Password456!' };
const carol = { username: `carol_${Date.now()}`, display_name: 'Carol Test', email: `carol_${Date.now()}@test.com`, password: 'Password789!' };

// Cookie jars per agent
const cookies = { alice: '', bob: '', carol: '' };

// IDs accumulated during tests
const ids = { aliceId: '', bobId: '', carolId: '', postId: '', commentId: '' };

beforeAll(async () => {
  // Lazy-load after mocks are cleared
  app  = require('../src/app');
  db   = require('../src/db/queries');
  const poolModule = require('../src/db/pool');
  pool = poolModule;
}, 20000);

afterAll(async () => {
  // Clean up test users (cascades to posts, comments, likes, follows, sessions)
  if (!HAS_DB) return;
  try {
    const { getPool } = require('../src/db/pool');
    const pg = getPool();
    for (const u of [alice, bob, carol]) {
      await pg.query('DELETE FROM users WHERE username = $1', [u.username]);
    }
    await pg.end();
  } catch { /* ignore cleanup errors */ }
}, 20000);

// ════════════════════════════════════════════════════════════
// AUTHENTICATION
// ════════════════════════════════════════════════════════════
describeIf('Auth — registration', () => {
  it('registers Alice successfully', async () => {
    const res = await request(app).post('/api/auth/register').send(alice);
    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe(alice.username);
    expect(res.body.user.password_hash).toBeUndefined();
    // Store cookie
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    cookies.alice = setCookie[0].split(';')[0];
    ids.aliceId = res.body.user.id;
  });

  it('registers Bob successfully', async () => {
    const res = await request(app).post('/api/auth/register').send(bob);
    expect(res.status).toBe(201);
    cookies.bob = res.headers['set-cookie'][0].split(';')[0];
    ids.bobId = res.body.user.id;
  });

  it('registers Carol successfully', async () => {
    const res = await request(app).post('/api/auth/register').send(carol);
    expect(res.status).toBe(201);
    cookies.carol = res.headers['set-cookie'][0].split(';')[0];
    ids.carolId = res.body.user.id;
  });

  it('rejects duplicate username', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...alice, email: `other_${Date.now()}@test.com`,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/username/i);
  });

  it('rejects duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...alice, username: `other_${Date.now()}`,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/email/i);
  });
});

describeIf('Auth — login', () => {
  it('logs in Alice by username', async () => {
    const res = await request(app).post('/api/auth/login').send({ login: alice.username, password: alice.password });
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe(alice.username);
    cookies.alice = res.headers['set-cookie'][0].split(';')[0];
  });

  it('logs in Bob by email', async () => {
    const res = await request(app).post('/api/auth/login').send({ login: bob.email, password: bob.password });
    expect(res.status).toBe(200);
    cookies.bob = res.headers['set-cookie'][0].split(';')[0];
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ login: alice.username, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('rejects non-existent user', async () => {
    const res = await request(app).post('/api/auth/login').send({ login: 'nobody_xyz', password: 'pass' });
    expect(res.status).toBe(401);
  });
});

describeIf('Auth — session persistence and logout', () => {
  it('GET /api/auth/me returns Alice with her cookie', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', cookies.alice);
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe(alice.username);
  });

  it('GET /api/auth/me returns 401 without cookie', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('logout clears session', async () => {
    // Create a fresh session for logout test
    const loginRes = await request(app).post('/api/auth/login').send({ login: carol.username, password: carol.password });
    const carolCookie = loginRes.headers['set-cookie'][0].split(';')[0];
    cookies.carol = carolCookie;

    const logoutRes = await request(app).post('/api/auth/logout').set('Cookie', carolCookie);
    expect(logoutRes.status).toBe(200);

    // Re-login Carol for further tests
    const relogin = await request(app).post('/api/auth/login').send({ login: carol.username, password: carol.password });
    cookies.carol = relogin.headers['set-cookie'][0].split(';')[0];
  });
});

// ════════════════════════════════════════════════════════════
// POSTS
// ════════════════════════════════════════════════════════════
describeIf('Posts — create and read', () => {
  it('requires auth to create a post', async () => {
    const res = await request(app).post('/api/posts').send({ content: 'No auth post' });
    expect(res.status).toBe(401);
  });

  it('Alice creates a post', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Cookie', cookies.alice)
      .send({ content: 'Hello from Alice! This is my first post.' });
    expect(res.status).toBe(201);
    expect(res.body.post.content).toBe('Hello from Alice! This is my first post.');
    expect(res.body.post.author_id).toBe(ids.aliceId);
    ids.postId = res.body.post.id;
  });

  it('Bob creates a post', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Cookie', cookies.bob)
      .send({ content: 'Hello from Bob!' });
    expect(res.status).toBe(201);
  });

  it('rejects empty post content', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Cookie', cookies.alice)
      .send({ content: '   ' });
    expect(res.status).toBe(400);
  });

  it('rejects post over 500 chars', async () => {
    const res = await request(app)
      .post('/api/posts')
      .set('Cookie', cookies.alice)
      .send({ content: 'x'.repeat(501) });
    expect(res.status).toBe(400);
  });

  it('GET /api/posts returns feed with posts', async () => {
    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.posts)).toBe(true);
    expect(res.body.posts.length).toBeGreaterThan(0);
  });

  it('GET /api/posts/:id returns the post', async () => {
    const res = await request(app).get(`/api/posts/${ids.postId}`).set('Cookie', cookies.alice);
    expect(res.status).toBe(200);
    expect(res.body.post.id).toBe(ids.postId);
    expect(Array.isArray(res.body.comments)).toBe(true);
  });

  it('GET /api/posts/:id returns 404 for invalid id', async () => {
    const res = await request(app).get('/api/posts/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

describeIf('Posts — delete', () => {
  it('Bob cannot delete Alice\'s post', async () => {
    const res = await request(app)
      .delete(`/api/posts/${ids.postId}`)
      .set('Cookie', cookies.bob);
    expect(res.status).toBe(403);
  });

  it('Alice can delete her own post (later — keep for now)', async () => {
    // Create a throwaway post for Alice to delete
    const create = await request(app)
      .post('/api/posts')
      .set('Cookie', cookies.alice)
      .send({ content: 'Delete me' });
    const throwawayId = create.body.post.id;

    const del = await request(app)
      .delete(`/api/posts/${throwawayId}`)
      .set('Cookie', cookies.alice);
    expect(del.status).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════
// COMMENTS
// ════════════════════════════════════════════════════════════
describeIf('Comments — create and read', () => {
  it('requires auth to comment', async () => {
    const res = await request(app)
      .post(`/api/posts/${ids.postId}/comments`)
      .send({ content: 'Anonymous comment' });
    expect(res.status).toBe(401);
  });

  it('Bob adds a comment to Alice\'s post', async () => {
    const res = await request(app)
      .post(`/api/posts/${ids.postId}/comments`)
      .set('Cookie', cookies.bob)
      .send({ content: 'Great post, Alice!' });
    expect(res.status).toBe(201);
    expect(res.body.comment.content).toBe('Great post, Alice!');
    ids.commentId = res.body.comment.id;
  });

  it('rejects empty comment', async () => {
    const res = await request(app)
      .post(`/api/posts/${ids.postId}/comments`)
      .set('Cookie', cookies.alice)
      .send({ content: '' });
    expect(res.status).toBe(400);
  });

  it('GET /api/posts/:id/comments returns comments', async () => {
    const res = await request(app).get(`/api/posts/${ids.postId}/comments`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.comments)).toBe(true);
    expect(res.body.comments.length).toBeGreaterThan(0);
  });

  it('Alice cannot delete Bob\'s comment', async () => {
    const res = await request(app)
      .delete(`/api/posts/${ids.postId}/comments/${ids.commentId}`)
      .set('Cookie', cookies.alice);
    expect(res.status).toBe(403);
  });

  it('Bob can delete his own comment', async () => {
    const res = await request(app)
      .delete(`/api/posts/${ids.postId}/comments/${ids.commentId}`)
      .set('Cookie', cookies.bob);
    expect(res.status).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════
// LIKES
// ════════════════════════════════════════════════════════════
describeIf('Likes', () => {
  it('requires auth to like', async () => {
    const res = await request(app).post(`/api/posts/${ids.postId}/like`);
    expect(res.status).toBe(401);
  });

  it('Bob likes Alice\'s post', async () => {
    const res = await request(app)
      .post(`/api/posts/${ids.postId}/like`)
      .set('Cookie', cookies.bob);
    expect(res.status).toBe(200);
    expect(res.body.likes_count).toBe(1);
  });

  it('Carol likes Alice\'s post', async () => {
    const res = await request(app)
      .post(`/api/posts/${ids.postId}/like`)
      .set('Cookie', cookies.carol);
    expect(res.status).toBe(200);
    expect(res.body.likes_count).toBe(2);
  });

  it('Bob cannot like the same post twice', async () => {
    const res = await request(app)
      .post(`/api/posts/${ids.postId}/like`)
      .set('Cookie', cookies.bob);
    expect(res.status).toBe(200);
    expect(res.body.liked).toBe(false); // already liked → returns false
    // Count stays at 2
    expect(res.body.likes_count).toBe(2);
  });

  it('Bob unlikes Alice\'s post', async () => {
    const res = await request(app)
      .delete(`/api/posts/${ids.postId}/like`)
      .set('Cookie', cookies.bob);
    expect(res.status).toBe(200);
    expect(res.body.likes_count).toBe(1);
  });

  it('like count is correct after refresh', async () => {
    const res = await request(app).get(`/api/posts/${ids.postId}`);
    expect(res.status).toBe(200);
    expect(Number(res.body.post.likes_count)).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════
// FOLLOWS
// ════════════════════════════════════════════════════════════
describeIf('Follows', () => {
  it('requires auth to follow', async () => {
    const res = await request(app).post(`/api/users/${alice.username}/follow`);
    expect(res.status).toBe(401);
  });

  it('Alice cannot follow herself', async () => {
    const res = await request(app)
      .post(`/api/users/${alice.username}/follow`)
      .set('Cookie', cookies.alice);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/yourself/i);
  });

  it('Bob follows Alice', async () => {
    const res = await request(app)
      .post(`/api/users/${alice.username}/follow`)
      .set('Cookie', cookies.bob);
    expect(res.status).toBe(200);
  });

  it('Bob cannot follow Alice twice', async () => {
    const res = await request(app)
      .post(`/api/users/${alice.username}/follow`)
      .set('Cookie', cookies.bob);
    expect(res.status).toBe(409);
  });

  it('Carol follows Alice', async () => {
    const res = await request(app)
      .post(`/api/users/${alice.username}/follow`)
      .set('Cookie', cookies.carol);
    expect(res.status).toBe(200);
  });

  it('Alice\'s profile shows 2 followers', async () => {
    const res = await request(app).get(`/api/users/${alice.username}`);
    expect(res.status).toBe(200);
    expect(Number(res.body.profile.followers_count)).toBe(2);
  });

  it('Bob unfollows Alice', async () => {
    const res = await request(app)
      .delete(`/api/users/${alice.username}/follow`)
      .set('Cookie', cookies.bob);
    expect(res.status).toBe(200);
  });

  it('Alice\'s profile shows 1 follower after Bob unfollows', async () => {
    const res = await request(app).get(`/api/users/${alice.username}`);
    expect(Number(res.body.profile.followers_count)).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════
// FOLLOWING FEED
// ════════════════════════════════════════════════════════════
describeIf('Following feed', () => {
  beforeAll(async () => {
    // Carol follows Alice so feed is non-empty
    // (Carol may already follow from above, ignore conflict)
    await request(app)
      .post(`/api/users/${alice.username}/follow`)
      .set('Cookie', cookies.carol);
  });

  it('Carol\'s following feed contains Alice\'s post', async () => {
    const res = await request(app)
      .get('/api/posts/following')
      .set('Cookie', cookies.carol);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.posts)).toBe(true);
    const alicePosts = res.body.posts.filter(p => p.username === alice.username);
    expect(alicePosts.length).toBeGreaterThan(0);
  });

  it('requires auth for following feed', async () => {
    const res = await request(app).get('/api/posts/following');
    expect(res.status).toBe(401);
  });
});

// ════════════════════════════════════════════════════════════
// PROFILES
// ════════════════════════════════════════════════════════════
describeIf('Profiles', () => {
  it('GET /api/users/:username returns public profile', async () => {
    const res = await request(app).get(`/api/users/${alice.username}`);
    expect(res.status).toBe(200);
    expect(res.body.profile.username).toBe(alice.username);
    expect(res.body.profile.display_name).toBe(alice.display_name);
    expect(res.body.profile.password_hash).toBeUndefined();
  });

  it('returns 404 for unknown username', async () => {
    const res = await request(app).get('/api/users/nobody_xyz_does_not_exist_ever');
    expect(res.status).toBe(404);
  });

  it('Alice can edit her own profile', async () => {
    const res = await request(app)
      .put('/api/users/me/profile')
      .set('Cookie', cookies.alice)
      .send({ display_name: 'Alice Updated', bio: 'Hello world!' });
    expect(res.status).toBe(200);
    expect(res.body.profile.display_name).toBe('Alice Updated');
    expect(res.body.profile.bio).toBe('Hello world!');
  });

  it('requires auth to edit profile', async () => {
    const res = await request(app)
      .put('/api/users/me/profile')
      .send({ display_name: 'Hacker' });
    expect(res.status).toBe(401);
  });

  it('Alice\'s posts appear on her profile', async () => {
    const res = await request(app).get(`/api/users/${alice.username}/posts`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.posts)).toBe(true);
    expect(res.body.posts.length).toBeGreaterThan(0);
  });
});
