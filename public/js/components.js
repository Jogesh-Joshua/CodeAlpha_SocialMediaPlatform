/* ==========================================================
   components.js — Reusable UI building blocks
   ========================================================== */
'use strict';

/* ── Utilities ─────────────────────────────────────────────── */
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function formatDate(iso) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);

  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7)  return `${days}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitials(name) {
  return (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function avatarColor(str) {
  const colors = [
    '#2563eb','#7c3aed','#db2777','#dc2626',
    '#d97706','#16a34a','#0891b2','#4f46e5',
  ];
  let hash = 0;
  for (const ch of (str || '')) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function Avatar(name, size = '') {
  const div = el('div', `avatar${size ? ` avatar--${size}` : ''}`);
  div.textContent = getInitials(name);
  div.style.background = avatarColor(name);
  return div;
}

/* ── Toast ─────────────────────────────────────────────────── */
function toast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const t = el('div', `toast toast--${type}`, escapeHtml(message));
  container.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── Loading / empty states ────────────────────────────────── */
function LoadingSpinner() {
  const div = el('div', 'loading-spinner');
  div.innerHTML = '<div class="spinner"></div> Loading…';
  return div;
}

function EmptyState(icon, title, text) {
  const div = el('div', 'empty-state');
  div.innerHTML = `
    <span class="empty-state__icon">${icon}</span>
    <div class="empty-state__title">${escapeHtml(title)}</div>
    <p class="empty-state__text">${escapeHtml(text)}</p>
  `;
  return div;
}

/* ── Post card ─────────────────────────────────────────────── */
function PostCard(post, currentUser, { onLike, onDelete, onComment, onNavigate } = {}) {
  const card = el('article', 'post-card');

  const isOwn   = currentUser && currentUser.id === post.author_id;
  const isLiked = !!post.is_liked;

  card.innerHTML = `
    <div class="post-card__header">
      <div class="post-card__avatar-slot"></div>
      <div class="post-card__author">
        <a href="/profile/${escapeHtml(post.username)}" class="post-card__name" data-nav="profile:${escapeHtml(post.username)}">
          ${escapeHtml(post.display_name)}
        </a>
        <span class="post-card__handle">@${escapeHtml(post.username)}</span>
      </div>
      <span class="post-card__time" title="${new Date(post.created_at).toLocaleString()}">
        ${formatDate(post.created_at)}
      </span>
    </div>
    <div class="post-card__content">${escapeHtml(post.content)}</div>
    <div class="post-card__actions">
      <button class="action-btn action-btn--like${isLiked ? ' liked' : ''}" data-id="${post.id}" title="${isLiked ? 'Unlike' : 'Like'}">
        ${isLiked ? '❤️' : '🤍'} <span class="like-count">${post.likes_count || 0}</span>
      </button>
      <button class="action-btn action-btn--comment" data-id="${post.id}">
        💬 <span>${post.comments_count || 0}</span>
      </button>
      ${isOwn ? `<button class="action-btn action-btn--delete" data-id="${post.id}" style="margin-left:auto">🗑</button>` : ''}
    </div>
  `;

  // Avatar
  const avatarSlot = card.querySelector('.post-card__avatar-slot');
  avatarSlot.appendChild(Avatar(post.display_name));

  // Like
  card.querySelector('.action-btn--like')?.addEventListener('click', async (e) => {
    if (!currentUser) return showLoginPrompt();
    const btn = e.currentTarget;
    const liked = btn.classList.contains('liked');
    try {
      const res = liked ? await API.unlikePost(post.id) : await API.likePost(post.id);
      btn.classList.toggle('liked', !liked);
      btn.innerHTML = `${!liked ? '❤️' : '🤍'} <span class="like-count">${res.likes_count}</span>`;
      btn.title = !liked ? 'Unlike' : 'Like';
      post.is_liked = !liked;
      post.likes_count = res.likes_count;
      if (onLike) onLike(post);
    } catch (err) { toast(err.message, 'error'); }
  });

  // Comment
  card.querySelector('.action-btn--comment')?.addEventListener('click', () => {
    if (onComment) onComment(post);
    else if (onNavigate) onNavigate(`post:${post.id}`);
  });

  // Delete
  card.querySelector('.action-btn--delete')?.addEventListener('click', async () => {
    if (!confirm('Delete this post?')) return;
    try {
      await API.deletePost(post.id);
      card.remove();
      toast('Post deleted.', 'success');
      if (onDelete) onDelete(post.id);
    } catch (err) { toast(err.message, 'error'); }
  });

  // Profile link navigation
  card.querySelectorAll('[data-nav]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const [type, value] = link.dataset.nav.split(':');
      if (onNavigate) onNavigate(`${type}:${value}`);
    });
  });

  return card;
}

/* ── Comment item ──────────────────────────────────────────── */
function CommentItem(comment, currentUser, { onDelete } = {}) {
  const isOwn = currentUser && currentUser.id === comment.author_id;
  const div = el('div', 'comment-item');
  div.appendChild(Avatar(comment.display_name, 'sm'));

  const body = el('div', 'comment-body');
  body.innerHTML = `
    <div class="comment-author">
      ${escapeHtml(comment.display_name)}
      <span style="font-weight:400;color:var(--color-text-muted)"> @${escapeHtml(comment.username)}</span>
      ${isOwn ? `<button class="action-btn action-btn--delete" style="float:right;padding:0 4px" title="Delete">🗑</button>` : ''}
    </div>
    <div class="comment-text">${escapeHtml(comment.content)}</div>
    <div class="comment-time">${formatDate(comment.created_at)}</div>
  `;

  body.querySelector('.action-btn--delete')?.addEventListener('click', async () => {
    if (!confirm('Delete comment?')) return;
    if (onDelete) onDelete(comment);
  });

  div.appendChild(body);
  return div;
}

/* ── Composer ──────────────────────────────────────────────── */
function Composer(currentUser, { onPost } = {}) {
  if (!currentUser) return null;

  const wrap = el('div', 'composer');
  wrap.innerHTML = `
    <div class="composer__header">
      <div class="composer__avatar-slot"></div>
      <div class="composer__area">
        <textarea class="composer__textarea" placeholder="What's on your mind?" maxlength="500" rows="3"></textarea>
      </div>
    </div>
    <div class="composer__footer">
      <span class="char-count">0 / 500</span>
      <button class="btn btn-primary btn-sm" id="compose-btn">Post</button>
    </div>
  `;

  wrap.querySelector('.composer__avatar-slot').appendChild(Avatar(currentUser.display_name));

  const ta    = wrap.querySelector('.composer__textarea');
  const count = wrap.querySelector('.char-count');
  const btn   = wrap.querySelector('#compose-btn');

  ta.addEventListener('input', () => {
    const len = ta.value.length;
    count.textContent = `${len} / 500`;
    count.classList.toggle('warning', len > 450);
  });

  btn.addEventListener('click', async () => {
    const content = ta.value.trim();
    if (!content) return;
    btn.disabled = true;
    try {
      const { post } = await API.createPost({ content });
      ta.value = '';
      count.textContent = '0 / 500';
      count.classList.remove('warning');
      if (onPost) onPost(post);
      toast('Posted!', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  return wrap;
}

/* ── Auth modal helpers ─────────────────────────────────────── */
function showLoginPrompt() {
  toast('Please log in to do that.', 'info');
  Router.navigate('login');
}

/* ── Topbar renderer ────────────────────────────────────────── */
function renderTopbar(user) {
  const actions = document.getElementById('topbar-actions');
  if (!actions) return;

  if (user) {
    actions.innerHTML = `
      <a href="/profile/${escapeHtml(user.username)}" class="btn btn-ghost btn-sm" id="nav-profile-btn">
        ${Avatar(user.display_name, 'sm').outerHTML}
        <span>${escapeHtml(user.display_name)}</span>
      </a>
      <button class="btn btn-outline btn-sm" id="nav-logout-btn">Log out</button>
    `;
    actions.querySelector('#nav-logout-btn').addEventListener('click', async () => {
      await Auth.logout();
      toast('Logged out.', 'info');
      Router.navigate('feed');
    });
    actions.querySelector('#nav-profile-btn').addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigate(`profile:${user.username}`);
    });
  } else {
    actions.innerHTML = `
      <a href="/login" class="btn btn-ghost btn-sm" id="nav-login-btn">Log in</a>
      <a href="/register" class="btn btn-primary btn-sm" id="nav-register-btn">Sign up</a>
    `;
    actions.querySelector('#nav-login-btn').addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigate('login');
    });
    actions.querySelector('#nav-register-btn').addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigate('register');
    });
  }
}

function renderSidebarNav(user) {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;

  const links = [
    { icon: '🏠', label: 'Home',     page: 'feed' },
    { icon: '🔍', label: 'Explore',  page: 'feed' },
    ...(user ? [
      { icon: '👥', label: 'Following', page: 'following' },
      { icon: '👤', label: 'Profile',   page: `profile:${user.username}` },
    ] : []),
  ];

  nav.innerHTML = links.map(l => `
    <a href="#" class="sidebar-link" data-page="${escapeHtml(l.page)}">
      <span class="sidebar-link__icon">${l.icon}</span>
      <span>${escapeHtml(l.label)}</span>
    </a>
  `).join('');

  nav.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigate(link.dataset.page);
    });
  });
}
