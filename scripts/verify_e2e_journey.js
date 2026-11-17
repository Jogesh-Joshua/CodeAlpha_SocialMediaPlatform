// scripts/verify_e2e_journey.js
// Complete End-to-End User Journey Audit Script for Nexus Social Media Platform
'use strict';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function extractCookie(res) {
  const raw = res.headers.get('set-cookie');
  if (!raw) return null;
  const match = raw.match(/session_token=([^;]+)/);
  return match ? `session_token=${match[1]}` : null;
}

async function request(path, options = {}, cookie = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (cookie) {
    headers['Cookie'] = cookie;
  }
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, { ...options, headers });
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, headers: res.headers, data, cookie: extractCookie(res) };
}

async function run() {
  console.log(`\n======================================================`);
  console.log(`  NEXUS SOCIAL PLATFORM — E2E JOURNEY & AUDIT VERIFICATION`);
  console.log(`  Target: ${BASE_URL}`);
  console.log(`======================================================\n`);

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  const ts = Date.now().toString().slice(-6);
  const userA = {
    username: `alice_${ts}`,
    email: `alice_${ts}@test.com`,
    password: `Password123!`,
    display_name: `Alice Audit ${ts}`
  };
  const userB = {
    username: `bob_${ts}`,
    email: `bob_${ts}@test.com`,
    password: `Password123!`,
    display_name: `Bob Tester ${ts}`
  };

  let cookieA = null;
  let cookieB = null;
  let postId = null;
  let commentId = null;

  // 1. Health check
  console.log('--- 1. System Health & Database Connectivity ---');
  const healthRes = await request('/api/health');
  assert(healthRes.status === 200, 'Health endpoint returns HTTP 200');
  assert(healthRes.data.status === 'ok', 'Health status is ok');
  assert(healthRes.data.db && healthRes.data.db.status === 'ok', 'PostgreSQL database status is ok');

  // 2. Frontend HTML & Asset Shell
  console.log('\n--- 2. Frontend Asset & HTML Shell Delivery ---');
  const htmlRes = await request('/');
  assert(htmlRes.status === 200, 'GET / returns HTTP 200');
  assert(typeof htmlRes.data === 'string' && htmlRes.data.includes('Nexus'), 'HTML contains Nexus brand');
  assert(htmlRes.data.includes('id="page-root"'), 'HTML contains #page-root mounting container');
  assert(htmlRes.data.includes('/js/app.js'), 'HTML references /js/app.js');

  // 3. User Registration (User A)
  console.log('\n--- 3. User Registration (User A: Alice) ---');
  const regARes = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userA)
  });
  assert(regARes.status === 201, 'User A registered with HTTP 201');
  assert(regARes.data.user.username === userA.username, 'User A response has correct username');
  assert(!regARes.data.user.password_hash, 'Password hash is NOT exposed in response');
  cookieA = regARes.cookie;
  assert(!!cookieA, 'Session cookie (session_token) issued upon registration');

  // 4. Duplicate Registration Handling
  console.log('\n--- 4. Duplicate Registration Prevention ---');
  const dupUserRes = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...userA, email: `different_${ts}@test.com` })
  });
  assert(dupUserRes.status === 409, 'Duplicate username returns HTTP 409 Conflict');

  const dupEmailRes = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...userA, username: `different_${ts}` })
  });
  assert(dupEmailRes.status === 409, 'Duplicate email returns HTTP 409 Conflict');

  // 5. Current User Session Verification
  console.log('\n--- 5. Authentication & Session Persistence ---');
  const meRes = await request('/api/auth/me', { method: 'GET' }, cookieA);
  assert(meRes.status === 200, 'GET /api/auth/me returns HTTP 200 with session cookie');
  assert(meRes.data.user.username === userA.username, 'Current user correctly identified from session');

  const unauthRes = await request('/api/auth/me', { method: 'GET' });
  assert(unauthRes.status === 401, 'GET /api/auth/me without cookie returns HTTP 401 Unauthorized');

  // 6. Post Creation (User A)
  console.log('\n--- 6. Post Creation ---');
  const postContent = `Excited to showcase the Nexus platform for CodeAlpha internship! #CodeAlpha #${ts}`;
  const createPostRes = await request('/api/posts', {
    method: 'POST',
    body: JSON.stringify({ content: postContent })
  }, cookieA);
  assert(createPostRes.status === 201, 'Post created with HTTP 201');
  assert(createPostRes.data.post.content === postContent, 'Post content matches submitted text');
  assert(createPostRes.data.post.username === userA.username, 'Post author matches User A');
  postId = createPostRes.data.post.id;
  assert(!!postId, 'Post ID assigned by database');

  // 7. Global Feed
  console.log('\n--- 7. Global News Feed ---');
  const feedRes = await request('/api/posts?page=1');
  assert(feedRes.status === 200, 'GET /api/posts returns HTTP 200');
  assert(Array.isArray(feedRes.data.posts), 'Feed contains posts array');
  const foundPost = feedRes.data.posts.find(p => p.id === postId);
  assert(!!foundPost, 'Created post appears in Global Feed');
  assert(parseInt(foundPost.likes_count, 10) === 0, 'Initial likes_count is 0');
  assert(parseInt(foundPost.comments_count, 10) === 0, 'Initial comments_count is 0');

  // 8. Register User B
  console.log('\n--- 8. User Registration (User B: Bob) ---');
  const regBRes = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userB)
  });
  assert(regBRes.status === 201, 'User B registered with HTTP 201');
  cookieB = regBRes.cookie;
  assert(!!cookieB, 'Session cookie issued for User B');

  // 9. Liking and Unliking Posts (User B likes User A's post)
  console.log('\n--- 9. Like & Unlike System ---');
  const likeRes = await request(`/api/posts/${postId}/like`, { method: 'POST' }, cookieB);
  assert(likeRes.status === 200, 'Like added with HTTP 200');
  assert(likeRes.data.liked === true, 'Response confirms liked: true');
  assert(likeRes.data.likes_count === 1, 'Likes count updated to 1');

  // Unlike
  const unlikeRes = await request(`/api/posts/${postId}/like`, { method: 'DELETE' }, cookieB);
  assert(unlikeRes.status === 200, 'Like removed with HTTP 200');
  assert(unlikeRes.data.liked === false, 'Response confirms liked: false');
  assert(unlikeRes.data.likes_count === 0, 'Likes count updated back to 0');

  // Re-like for comment and feed tests
  const relikeRes = await request(`/api/posts/${postId}/like`, { method: 'POST' }, cookieB);
  assert(relikeRes.status === 200, 'Post re-liked with HTTP 200');
  assert(relikeRes.data.likes_count === 1, 'Likes count is 1');

  // 10. Comment System (User B comments on User A's post)
  console.log('\n--- 10. Comment System (Create, View, Delete) ---');
  const commentContent = `Awesome progress, Alice! Thorough verification underway.`;
  const addCommentRes = await request(`/api/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content: commentContent })
  }, cookieB);
  assert(addCommentRes.status === 201, 'Comment added with HTTP 201');
  assert(addCommentRes.data.comment.content === commentContent, 'Comment text verified');
  assert(addCommentRes.data.comment.username === userB.username, 'Comment author is User B');
  commentId = addCommentRes.data.comment.id;
  assert(!!commentId, 'Comment ID assigned');

  // Fetch comments
  const getCommentsRes = await request(`/api/posts/${postId}/comments`);
  assert(getCommentsRes.status === 200, 'GET /api/posts/:id/comments returns HTTP 200');
  assert(getCommentsRes.data.comments.some(c => c.id === commentId), 'Added comment exists in comments list');

  // 11. Follow / Unfollow System & Counts
  console.log('\n--- 11. Follow / Unfollow System & Profile Counters ---');
  // Check initial profile counts
  const profAliceInit = await request(`/api/users/${userA.username}`);
  assert(profAliceInit.status === 200, 'GET User A profile returns HTTP 200');
  assert(parseInt(profAliceInit.data.profile.followers_count, 10) === 0, 'Alice initial followers_count is 0');

  // Bob follows Alice
  const followRes = await request(`/api/users/${userA.username}/follow`, { method: 'POST' }, cookieB);
  assert(followRes.status === 200, 'Follow request returns HTTP 200');
  assert(followRes.data.message.includes('Now following'), 'Response confirms following');

  // Check Alice's profile reflects 1 follower
  const profAliceFollowed = await request(`/api/users/${userA.username}`, {}, cookieB);
  assert(parseInt(profAliceFollowed.data.profile.followers_count, 10) === 1, 'Alice followers_count increments to 1');
  assert(profAliceFollowed.data.profile.is_following === true, 'Bob viewing Alice shows is_following: true');

  // Check Bob's profile reflects 1 following
  const profBob = await request(`/api/users/${userB.username}`, {}, cookieB);
  assert(parseInt(profBob.data.profile.following_count, 10) === 1, 'Bob following_count increments to 1');

  // 12. Following-Only Feed
  console.log('\n--- 12. Following-Only Feed Verification ---');
  const bobFollowingFeed = await request('/api/posts/following?page=1', {}, cookieB);
  assert(bobFollowingFeed.status === 200, 'Bob following feed returns HTTP 200');
  assert(bobFollowingFeed.data.posts.some(p => p.id === postId), 'Alice post appears in Bob following feed');

  const aliceFollowingFeed = await request('/api/posts/following?page=1', {}, cookieA);
  assert(aliceFollowingFeed.status === 200, 'Alice following feed returns HTTP 200');
  assert(aliceFollowingFeed.data.posts.length === 0, 'Alice following feed is empty (follows no one yet)');

  // 13. Profile Editing & Persistence
  console.log('\n--- 13. Profile Editing & Persistence ---');
  const updatedBio = 'CodeAlpha Task 2 Verified Submission Engineer';
  const updatedName = `Alice Verified ${ts}`;
  const updateProfRes = await request('/api/users/me/profile', {
    method: 'PUT',
    body: JSON.stringify({ display_name: updatedName, bio: updatedBio })
  }, cookieA);
  assert(updateProfRes.status === 200, 'PUT /api/users/me/profile returns HTTP 200');
  assert(updateProfRes.data.profile.display_name === updatedName, 'Display name updated in response');
  assert(updateProfRes.data.profile.bio === updatedBio, 'Bio updated in response');

  // Verify persistence via public profile endpoint
  const pubProfCheck = await request(`/api/users/${userA.username}`);
  assert(pubProfCheck.data.profile.display_name === updatedName, 'Updated display name persisted in database');
  assert(pubProfCheck.data.profile.bio === updatedBio, 'Updated bio persisted in database');

  // 14. Authorization & Comment Deletion
  console.log('\n--- 14. Resource Authorization & Deletion ---');
  // Alice tries to delete Bob's comment -> Should fail (unless post owner can or comment author can; let's check comment author Bob)
  const delCommentRes = await request(`/api/posts/${postId}/comments/${commentId}`, { method: 'DELETE' }, cookieB);
  assert(delCommentRes.status === 200, 'Comment author (Bob) successfully deletes comment with HTTP 200');

  const verifyCommentsAfterDel = await request(`/api/posts/${postId}/comments`);
  assert(!verifyCommentsAfterDel.data.comments.some(c => c.id === commentId), 'Deleted comment no longer in list');

  // 15. Authorization & Post Deletion
  console.log('\n--- 15. Post Deletion & Access Controls ---');
  // Bob tries to delete Alice's post -> 403 Forbidden
  const bobDelPost = await request(`/api/posts/${postId}`, { method: 'DELETE' }, cookieB);
  assert(bobDelPost.status === 403, 'Unauthorized user deleting post returns HTTP 403 Forbidden');

  // Alice deletes her own post -> 200 OK
  const aliceDelPost = await request(`/api/posts/${postId}`, { method: 'DELETE' }, cookieA);
  assert(aliceDelPost.status === 200, 'Post owner successfully deletes post with HTTP 200');

  // Post should be 404 now
  const checkDeletedPost = await request(`/api/posts/${postId}`);
  assert(checkDeletedPost.status === 404, 'Deleted post returns HTTP 404 Not Found');

  // 16. Logout & Relogin Session Lifecycle
  console.log('\n--- 16. Logout & Login Lifecycle ---');
  const logoutRes = await request('/api/auth/logout', { method: 'POST' }, cookieB);
  assert(logoutRes.status === 200, 'POST /api/auth/logout returns HTTP 200');

  const checkMeLoggedOut = await request('/api/auth/me', {}, cookieB);
  assert(checkMeLoggedOut.status === 401, 'Logged out cookie rejected with HTTP 401 Unauthorized');

  // Re-login with Bob's credentials
  const reloginRes = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: userB.username, password: userB.password })
  });
  assert(reloginRes.status === 200, 'Login with valid credentials returns HTTP 200');
  const newCookieB = reloginRes.cookie;
  assert(!!newCookieB, 'New session cookie issued upon login');

  const checkMeLoggedIn = await request('/api/auth/me', {}, newCookieB);
  assert(checkMeLoggedIn.status === 200, 'Session restored and validated after login');
  assert(checkMeLoggedIn.data.user.username === userB.username, 'Restored session belongs to Bob');

  console.log(`\n======================================================`);
  console.log(`  ALL E2E AUDIT CHECKS PASSED: ${passed}/${total}`);
  console.log(`======================================================\n`);

  // Safe cleanup of test accounts
  try {
    const { getPool } = require('../src/db/pool');
    const pool = getPool();
    await pool.query('DELETE FROM users WHERE username IN ($1, $2)', [userA.username, userB.username]);
    console.log('✓ Cleaned up test audit accounts (Alice & Bob).\n');
  } catch {
    // Non-fatal if running remotely
  }
}

run().catch(err => {
  console.error('\nE2E Verification Error:', err);
  process.exit(1);
});
