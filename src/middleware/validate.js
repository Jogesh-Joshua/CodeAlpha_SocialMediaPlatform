'use strict';
/**
 * Input validation helpers.
 */

const USERNAME_RE = /^[a-zA-Z0-9_]{3,32}$/;

function validateUsername(username) {
  if (!username || typeof username !== 'string') return 'Username is required.';
  if (!USERNAME_RE.test(username)) {
    return 'Username must be 3–32 characters: letters, numbers, underscores only.';
  }
  return null;
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') return 'Email is required.';
  const trimmed = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Invalid email address.';
  if (trimmed.length > 254) return 'Email is too long.';
  return null;
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') return 'Password is required.';
  if (password.length < 8)  return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password is too long.';
  return null;
}

function validatePostContent(content) {
  if (!content || typeof content !== 'string') return 'Post content is required.';
  const trimmed = content.trim();
  if (trimmed.length === 0)  return 'Post cannot be empty.';
  if (trimmed.length > 500)  return 'Post cannot exceed 500 characters.';
  return null;
}

function validateCommentContent(content) {
  if (!content || typeof content !== 'string') return 'Comment content is required.';
  const trimmed = content.trim();
  if (trimmed.length === 0)  return 'Comment cannot be empty.';
  if (trimmed.length > 300)  return 'Comment cannot exceed 300 characters.';
  return null;
}

function validateDisplayName(name) {
  if (!name || typeof name !== 'string') return 'Display name is required.';
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'Display name cannot be empty.';
  if (trimmed.length > 64)  return 'Display name cannot exceed 64 characters.';
  return null;
}

function validateBio(bio) {
  if (bio && bio.length > 300) return 'Bio cannot exceed 300 characters.';
  return null;
}

module.exports = {
  validateUsername,
  validateEmail,
  validatePassword,
  validatePostContent,
  validateCommentContent,
  validateDisplayName,
  validateBio,
};
