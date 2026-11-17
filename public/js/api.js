/* ==========================================================
   api.js — Thin fetch wrapper for all backend API calls
   ========================================================== */
'use strict';

const API = (() => {
  const BASE = '/api';

  async function request(method, path, body) {
    const opts = {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(`${BASE}${path}`, opts);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(data.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  return {
    // Auth
    register: (body) => request('POST', '/auth/register', body),
    login   : (body) => request('POST', '/auth/login', body),
    logout  : ()     => request('POST', '/auth/logout'),
    me      : ()     => request('GET',  '/auth/me'),

    // Posts
    getFeed        : (page = 1)       => request('GET', `/posts?page=${page}`),
    getFollowingFeed: (page = 1)      => request('GET', `/posts/following?page=${page}`),
    createPost     : (body)           => request('POST', '/posts', body),
    getPost        : (id)             => request('GET', `/posts/${id}`),
    deletePost     : (id)             => request('DELETE', `/posts/${id}`),
    likePost       : (id)             => request('POST', `/posts/${id}/like`),
    unlikePost     : (id)             => request('DELETE', `/posts/${id}/like`),
    getComments    : (id)             => request('GET', `/posts/${id}/comments`),
    addComment     : (id, body)       => request('POST', `/posts/${id}/comments`, body),
    deleteComment  : (postId, cid)    => request('DELETE', `/posts/${postId}/comments/${cid}`),

    // Users
    getProfile    : (username)         => request('GET', `/users/${username}`),
    updateProfile : (body)             => request('PUT', '/users/me/profile', body),
    getUserPosts  : (username, page=1) => request('GET', `/users/${username}/posts?page=${page}`),
    followUser    : (username)         => request('POST', `/users/${username}/follow`),
    unfollowUser  : (username)         => request('DELETE', `/users/${username}/follow`),
    getFollowers  : (username)         => request('GET', `/users/${username}/followers`),
    getFollowing  : (username)         => request('GET', `/users/${username}/following`),

    // Health
    health: () => request('GET', '/health'),
  };
})();
