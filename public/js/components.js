/* ==========================================================
   components.js — Reusable UI building blocks for Nexus
   ========================================================== */
'use strict';

/* ── Avatar Mapping for Demo Profiles ─────────────────────── */
const DEMO_AVATARS = {
  alex: '/images/avatars/alex.jpg',
  elena: '/images/avatars/elena.jpg',
  marcus: '/images/avatars/marcus.jpg',
  sophia: '/images/avatars/sophia.jpg',
  david: '/images/avatars/david.jpg',
  maya: '/images/avatars/maya.jpg',
  liam: '/images/avatars/liam.jpg',
  chloe: '/images/avatars/chloe.jpg',
};

function resolveAvatarUrl(username, explicitUrl) {
  if (explicitUrl) return explicitUrl;
  if (!username) return null;
  const key = username.toLowerCase().replace(/^nexus_demo_/, '').trim();
  return DEMO_AVATARS[key] || null;
}

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
    '#6575E8','#9B7CF6','#AF5E59','#B5A2B5',
    '#4ade80','#38bdf8','#fb923c','#f472b6',
  ];
  let hash = 0;
  for (const ch of (str || '')) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function Avatar(name, size = '', avatarUrl = null, username = null) {
  const div = el('div', `avatar${size ? ` avatar--${size}` : ''}`);
  div.style.background = avatarColor(name || username || '?');
  div.style.color = '#ffffff';

  const resolved = resolveAvatarUrl(username, avatarUrl);
  if (resolved) {
    const img = document.createElement('img');
    img.className = 'avatar__img';
    img.src = resolved;
    img.alt = name || 'Avatar';
    img.loading = 'lazy';
    img.onerror = () => {
      img.remove();
      div.textContent = getInitials(name || username);
    };
    div.appendChild(img);
  } else {
    div.textContent = getInitials(name || username);
  }
  return div;
}

/* ── Content & Hashtag Formatter ───────────────────────────── */
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatPostText(text) {
  const escaped = escapeHtml(text);
  // Match hashtags (#word) and convert to interactive pills
  return escaped.replace(/(^|\s)#([a-zA-Z0-9_]{2,30})/g, (match, prefix, tag) => {
    return `${prefix}<span class="post-hashtag" data-tag="${tag}">#${tag}</span>`;
  });
}

/* ── Toast Notifications ───────────────────────────────────── */
function toast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = el('div', `toast toast--${type}`, escapeHtml(message));
  container.appendChild(t);
  setTimeout(() => t.remove(), duration);
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

/* ── Lightbox viewer for photos ────────────────────────────── */
function openLightbox(imageUrl, caption = '') {
  let lightbox = document.getElementById('nexus-lightbox');
  if (!lightbox) {
    lightbox = el('div', 'lightbox-overlay hidden');
    lightbox.id = 'nexus-lightbox';
    lightbox.innerHTML = `
      <div class="lightbox-modal">
        <button class="lightbox-close" aria-label="Close photo">✕</button>
        <div class="lightbox-image-wrap">
          <img class="lightbox-img" src="" alt="Photo preview" />
        </div>
        <div class="lightbox-caption"></div>
      </div>
    `;
    document.body.appendChild(lightbox);

    lightbox.querySelector('.lightbox-close').addEventListener('click', () => {
      lightbox.classList.add('hidden');
    });
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) lightbox.classList.add('hidden');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !lightbox.classList.contains('hidden')) {
        lightbox.classList.add('hidden');
      }
    });
  }

  const img = lightbox.querySelector('.lightbox-img');
  img.src = imageUrl;
  const cap = lightbox.querySelector('.lightbox-caption');
  cap.textContent = caption || '';
  lightbox.classList.remove('hidden');
}

/* ── Inline SVG Icon Set (Lucide-compatible, 18×18) ─────────── */
const ICONS = {
  heartEmpty: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
  heartFill:  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
  comment:    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
  share:      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>',
  trash:      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>',
};

/* ── Guest Hero Welcome Banner ─────────────────────────────── */
function HeroWelcomeBanner({ onNavigate } = {}) {
  const banner = el('section', 'hero-welcome');
  banner.innerHTML = `
    <div class="hero-welcome__glow"></div>
    <div class="hero-welcome__content">
      <div class="hero-welcome__badge">✦ Welcome to Nexus</div>
      <h1 class="hero-welcome__title">Share your world.<br/>Discover your people.</h1>
      <p class="hero-welcome__subtitle">
        Connect with creators, share moments with photo posts, explore trending ideas, and join vibrant conversations on Nexus.
      </p>
      <div class="hero-welcome__actions">
        <button class="btn btn-primary btn-lg" id="hero-signup-btn">Get Started — Free</button>
        <button class="btn btn-outline btn-lg" id="hero-login-btn">Sign In</button>
      </div>
      <div class="hero-welcome__features">
        <span>📸 Photo &amp; text posts</span>
        <span>🔥 Trending topics</span>
        <span>👥 Active creator community</span>
      </div>
    </div>
  `;

  banner.querySelector('#hero-signup-btn').addEventListener('click', () => {
    if (onNavigate) onNavigate('register');
  });
  banner.querySelector('#hero-login-btn').addEventListener('click', () => {
    if (onNavigate) onNavigate('login');
  });

  return banner;
}

/* ── Avatar Creator Strip ──────────────────────────────────── */
function AvatarStrip(users = [], onNavigate) {
  if (!users || !users.length) return null;
  const strip = el('div', 'avatar-strip');
  users.slice(0, 10).forEach(u => {
    const item = el('div', 'avatar-strip__item');
    const avatarWrap = el('div', 'avatar-strip__avatar');
    avatarWrap.appendChild(Avatar(u.display_name, 'sm', null, u.username));
    const name = el('span', 'avatar-strip__name', escapeHtml(u.display_name || u.username));
    item.append(avatarWrap, name);
    item.addEventListener('click', () => {
      if (onNavigate) onNavigate(`profile:${u.username}`);
    });
    strip.appendChild(item);
  });
  return strip;
}

/* ── Post card ─────────────────────────────────────────────── */
function PostCard(post, currentUser, { onLike, onDelete, onComment, onNavigate } = {}) {
  const card = el('article', 'post-card');
  card.dataset.postId = post.id;

  const isOwn   = currentUser && currentUser.id === post.author_id;
  const isLiked = !!post.is_liked;

  const hasImage = !!post.image_url;

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

    <div class="post-card__content">${formatPostText(post.content)}</div>

    ${hasImage ? `
      <div class="post-card__image-container">
        <img src="${escapeHtml(post.image_url)}" class="post-card__image" alt="Post attachment" loading="lazy" />
        <span class="post-card__zoom-hint">🔍 Click to zoom</span>
      </div>
    ` : ''}

    <div class="post-card__actions">
      <button class="action-btn action-btn--like${isLiked ? ' liked' : ''}" data-id="${post.id}" title="${isLiked ? 'Unlike' : 'Like'}">
        <span class="action-btn__icon">${isLiked ? ICONS.heartFill : ICONS.heartEmpty}</span>
        <span class="like-count">${post.likes_count || 0}</span>
      </button>

      <button class="action-btn action-btn--comment" data-id="${post.id}" title="Comments">
        <span class="action-btn__icon">${ICONS.comment}</span>
        <span>${post.comments_count || 0}</span>
      </button>

      <button class="action-btn action-btn--share" title="Share post">
        <span class="action-btn__icon">${ICONS.share}</span>
        <span class="action-btn__label">Share</span>
      </button>

      ${isOwn ? `
        <button class="action-btn action-btn--delete" data-id="${post.id}" title="Delete post" style="margin-left:auto">
          <span class="action-btn__icon">${ICONS.trash}</span>
        </button>
      ` : ''}
    </div>
  `;

  // Avatar with image fallback
  const avatarSlot = card.querySelector('.post-card__avatar-slot');
  avatarSlot.appendChild(Avatar(post.display_name, '', null, post.username));

  // Lightbox click for post image
  if (hasImage) {
    const imgContainer = card.querySelector('.post-card__image-container');
    imgContainer?.addEventListener('click', () => {
      openLightbox(post.image_url, post.content);
    });
  }

  // Hashtag clicks navigate to Explore with tag
  card.querySelectorAll('.post-hashtag').forEach(tagEl => {
    tagEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const tag = tagEl.dataset.tag;
      if (onNavigate) onNavigate(`explore:${tag}`);
    });
  });

  // Like action
  card.querySelector('.action-btn--like')?.addEventListener('click', async (e) => {
    if (!currentUser) return showLoginPrompt();
    const btn = e.currentTarget;
    const liked = btn.classList.contains('liked');
    try {
      const res = liked ? await API.unlikePost(post.id) : await API.likePost(post.id);
      btn.classList.toggle('liked', !liked);
      btn.querySelector('.action-btn__icon').innerHTML = !liked ? ICONS.heartFill : ICONS.heartEmpty;
      btn.querySelector('.like-count').textContent = res.likes_count;
      btn.title = !liked ? 'Unlike' : 'Like';
      post.is_liked = !liked;
      post.likes_count = res.likes_count;
      if (onLike) onLike(post);
    } catch (err) { toast(err.message, 'error'); }
  });

  // Comment action
  card.querySelector('.action-btn--comment')?.addEventListener('click', () => {
    if (onComment) onComment(post);
    else if (onNavigate) onNavigate(`post:${post.id}`);
  });

  // Share action (copies direct post URL)
  card.querySelector('.action-btn--share')?.addEventListener('click', async () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(postUrl);
      }
      toast('Post link copied to clipboard! 📋', 'success');
    } catch (err) {
      toast('Post link: ' + postUrl, 'info');
    }
  });

  // Delete action
  card.querySelector('.action-btn--delete')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;
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
  div.dataset.cid = comment.id;
  div.appendChild(Avatar(comment.display_name, 'sm', null, comment.username));

  const body = el('div', 'comment-body');
  body.innerHTML = `
    <div class="comment-author">
      ${escapeHtml(comment.display_name)}
      <span style="font-weight:400;color:var(--color-text-muted)"> @${escapeHtml(comment.username)}</span>
      ${isOwn ? `<button class="action-btn action-btn--delete" style="float:right;padding:0 4px" title="Delete"><span class="action-btn__icon">${ICONS.trash}</span></button>` : ''}
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

/* ── Composer with Photo Support ───────────────────────────── */
const SAMPLE_PHOTOS = [
  { label: '💻 Workspace', url: '/images/demo/tech-workspace.jpg' },
  { label: '🎨 UI Design', url: '/images/demo/ui-design.jpg' },
  { label: '🌄 Sunset',    url: '/images/demo/mountain-sunset.jpg' },
  { label: '☕ Coffee',    url: '/images/demo/coffee-art.jpg' },
  { label: '🌲 Nature',    url: '/images/demo/hiking-trail.jpg' },
  { label: '🏛 City',      url: '/images/demo/urban-architecture.jpg' },
  { label: '🤖 Tech',      url: '/images/demo/robotics-project.jpg' },
  { label: '👥 Team',      url: '/images/demo/team-collaboration.jpg' },
];

function Composer(currentUser, { onPost } = {}) {
  if (!currentUser) return null;

  const cameraIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>';

  const wrap = el('div', 'composer');
  wrap.innerHTML = `
    <div class="composer__header">
      <div class="composer__avatar-slot"></div>
      <div class="composer__area">
        <textarea class="composer__textarea" placeholder="What's happening? Share thoughts, updates, or #hashtags..." maxlength="500" rows="3"></textarea>
      </div>
    </div>

    <!-- Photo Drawer (collapsible) -->
    <div class="composer__photo-drawer hidden" id="photo-drawer">
      <div class="composer__photo-input-row">
        <input type="text" class="composer__photo-input" id="photo-url-input" placeholder="Paste image URL (https://... or select below)" />
        <button class="btn btn-ghost btn-sm" id="btn-cancel-photo" type="button">Cancel</button>
      </div>
      <div class="composer__photo-samples">
        <span class="composer__samples-label">Quick samples:</span>
        <div class="composer__samples-chips" id="photo-samples-chips">
          ${SAMPLE_PHOTOS.map(p => `
            <button class="photo-chip" type="button" data-url="${p.url}">
              ${p.label}
            </button>
          `).join('')}
        </div>
      </div>
      <div class="composer__preview hidden" id="photo-preview-wrap">
        <img class="composer__preview-img" id="photo-preview-img" src="" alt="Photo preview" />
        <button class="composer__preview-remove" id="btn-remove-preview" title="Remove photo" type="button">✕</button>
      </div>
    </div>

    <div class="composer__footer">
      <div class="composer__tools">
        <button class="btn btn-ghost btn-sm composer__tool-btn" id="btn-toggle-photo" type="button" title="Add photo">
          <span class="action-btn__icon">${cameraIcon}</span> <span class="tool-label">Add Photo</span>
        </button>
      </div>
      <div class="composer__actions">
        <span class="char-count">0 / 500</span>
        <button class="btn btn-primary btn-sm" id="compose-btn">Post</button>
      </div>
    </div>
  `;

  // Avatar
  wrap.querySelector('.composer__avatar-slot').appendChild(
    Avatar(currentUser.display_name, '', null, currentUser.username)
  );

  const ta           = wrap.querySelector('.composer__textarea');
  const count        = wrap.querySelector('.char-count');
  const btn          = wrap.querySelector('#compose-btn');
  const photoToggle  = wrap.querySelector('#btn-toggle-photo');
  const photoDrawer  = wrap.querySelector('#photo-drawer');
  const photoInput   = wrap.querySelector('#photo-url-input');
  const photoCancel  = wrap.querySelector('#btn-cancel-photo');
  const previewWrap  = wrap.querySelector('#photo-preview-wrap');
  const previewImg   = wrap.querySelector('#photo-preview-img');
  const removePhoto  = wrap.querySelector('#btn-remove-preview');
  const chipsContainer = wrap.querySelector('#photo-samples-chips');

  let selectedImageUrl = null;

  function setPhoto(url) {
    if (!url) {
      selectedImageUrl = null;
      photoInput.value = '';
      previewWrap.classList.add('hidden');
      previewImg.src = '';
      photoToggle.classList.remove('active');
    } else {
      selectedImageUrl = url.trim();
      photoInput.value = selectedImageUrl;
      previewImg.src = selectedImageUrl;
      previewWrap.classList.remove('hidden');
      photoToggle.classList.add('active');
    }
  }

  photoToggle.addEventListener('click', () => {
    photoDrawer.classList.toggle('hidden');
    if (!photoDrawer.classList.contains('hidden')) {
      photoInput.focus();
    }
  });

  photoCancel.addEventListener('click', () => {
    setPhoto(null);
    photoDrawer.classList.add('hidden');
  });

  photoInput.addEventListener('input', () => {
    const val = photoInput.value.trim();
    if (val) {
      previewImg.src = val;
      previewWrap.classList.remove('hidden');
      selectedImageUrl = val;
    } else {
      setPhoto(null);
    }
  });

  removePhoto.addEventListener('click', () => {
    setPhoto(null);
  });

  chipsContainer.querySelectorAll('.photo-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      setPhoto(chip.dataset.url);
    });
  });

  ta.addEventListener('input', () => {
    const len = ta.value.length;
    count.textContent = `${len} / 500`;
    count.classList.toggle('warning', len > 450);
  });

  btn.addEventListener('click', async () => {
    const content = ta.value.trim();
    if (!content && !selectedImageUrl) return;
    btn.disabled = true;
    try {
      const payload = { content };
      if (selectedImageUrl) payload.image_url = selectedImageUrl;

      const { post } = await API.createPost(payload);
      ta.value = '';
      setPhoto(null);
      photoDrawer.classList.add('hidden');
      count.textContent = '0 / 500';
      count.classList.remove('warning');
      if (onPost) onPost(post);
      toast('Post published! 🎉', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  return wrap;
}

/* ── Auth Prompt Helper ────────────────────────────────────── */
function showLoginPrompt() {
  toast('Please log in or sign up to do that.', 'info');
  Router.navigate('login');
}

/* ── Right Sidebar Widgets ─────────────────────────────────── */

function DiscoverPeopleCard(suggestions = [], currentUser = null, { onFollowChange, onNavigate } = {}) {
  const card = el('div', 'sidebar-card discover-card');
  card.innerHTML = `
    <div class="sidebar-card__header">
      <span class="sidebar-card__title">People You May Know</span>
    </div>
    <div class="sidebar-card__list" id="discover-list"></div>
  `;

  const list = card.querySelector('#discover-list');

  if (!suggestions.length) {
    list.innerHTML = `<div class="sidebar-card__empty">No suggestions available right now.</div>`;
    return card;
  }

  suggestions.slice(0, 5).forEach(user => {
    const row = el('div', 'user-suggestion');
    row.innerHTML = `
      <div class="user-suggestion__avatar-slot"></div>
      <div class="user-suggestion__info">
        <a href="/profile/${escapeHtml(user.username)}" class="user-suggestion__name" data-username="${escapeHtml(user.username)}">
          ${escapeHtml(user.display_name)}
        </a>
        <span class="user-suggestion__handle">@${escapeHtml(user.username)}</span>
      </div>
      <button class="btn btn-outline btn-sm user-suggestion__follow-btn" data-username="${escapeHtml(user.username)}">
        Follow
      </button>
    `;

    // Avatar
    row.querySelector('.user-suggestion__avatar-slot').appendChild(
      Avatar(user.display_name, 'sm', null, user.username)
    );

    // Profile link
    row.querySelector('.user-suggestion__name').addEventListener('click', (e) => {
      e.preventDefault();
      if (onNavigate) onNavigate(`profile:${user.username}`);
    });

    // Follow action
    const btn = row.querySelector('.user-suggestion__follow-btn');
    let isFollowing = false;
    btn.addEventListener('click', async () => {
      if (!currentUser) return showLoginPrompt();
      try {
        if (!isFollowing) {
          await API.followUser(user.username);
          isFollowing = true;
          btn.className = 'btn btn-ghost btn-sm user-suggestion__follow-btn';
          btn.textContent = 'Following';
          toast(`Following @${user.username}`, 'success');
        } else {
          await API.unfollowUser(user.username);
          isFollowing = false;
          btn.className = 'btn btn-outline btn-sm user-suggestion__follow-btn';
          btn.textContent = 'Follow';
          toast(`Unfollowed @${user.username}`, 'info');
        }
        if (onFollowChange) onFollowChange(user, isFollowing);
      } catch (err) {
        toast(err.message, 'error');
      }
    });

    list.appendChild(row);
  });

  return card;
}

function TrendingCard(trending = [], { onTagClick } = {}) {
  const card = el('div', 'sidebar-card trending-card');
  card.innerHTML = `
    <div class="sidebar-card__header">
      <span class="sidebar-card__title">Trending Topics</span>
    </div>
    <div class="sidebar-card__list" id="trending-list"></div>
  `;

  const list = card.querySelector('#trending-list');

  // Fallback defaults if few posts in database yet
  const tags = trending.length > 0 ? trending : [
    { tag: 'NexusLaunch', count: 8 },
    { tag: 'WebDev', count: 6 },
    { tag: 'Photography', count: 5 },
    { tag: 'UIUX', count: 4 },
    { tag: 'TechCommunity', count: 3 },
  ];

  tags.slice(0, 6).forEach((item, idx) => {
    const row = el('div', 'trending-item');
    row.innerHTML = `
      <div class="trending-item__rank">#${idx + 1}</div>
      <div class="trending-item__info">
        <span class="trending-item__tag">#${escapeHtml(item.tag)}</span>
        <span class="trending-item__count">${item.count} post${item.count === 1 ? '' : 's'}</span>
      </div>
      <span class="trending-item__arrow">›</span>
    `;

    row.addEventListener('click', () => {
      if (onTagClick) onTagClick(item.tag);
    });

    list.appendChild(row);
  });

  return card;
}

function CommunityActivityCard(activities = [], { onNavigate } = {}) {
  const card = el('div', 'sidebar-card activity-card');
  card.innerHTML = `
    <div class="sidebar-card__header">
      <span class="sidebar-card__title">💬 Community Activity</span>
    </div>
    <div class="sidebar-card__list" id="activity-list"></div>
  `;

  const list = card.querySelector('#activity-list');

  if (!activities.length) {
    list.innerHTML = `<div class="sidebar-card__empty">No recent activity. Join the conversation!</div>`;
    return card;
  }

  activities.slice(0, 4).forEach(act => {
    const row = el('div', 'activity-item');
    row.innerHTML = `
      <div class="activity-item__avatar-slot"></div>
      <div class="activity-item__body">
        <div class="activity-item__header">
          <span class="activity-item__author">${escapeHtml(act.display_name)}</span>
          <span class="activity-item__time">${formatDate(act.created_at)}</span>
        </div>
        <p class="activity-item__text">${escapeHtml(act.comment_preview)}</p>
        <span class="activity-item__on">on: "${escapeHtml((act.post_preview || '').slice(0, 45))}…"</span>
      </div>
    `;

    row.querySelector('.activity-item__avatar-slot').appendChild(
      Avatar(act.display_name, 'sm', null, act.username)
    );

    row.addEventListener('click', () => {
      if (onNavigate) onNavigate(`post:${act.post_id}`);
    });

    list.appendChild(row);
  });

  return card;
}

function AboutNexusCard() {
  const card = el('div', 'sidebar-card about-nexus-card');
  card.innerHTML = `
    <div class="about-nexus-card__badge">✦ Nexus Platform</div>
    <p class="about-nexus-card__desc">
      A modern, open social space for creators, engineers, and thinkers. Connect, share ideas, and build your network.
    </p>
    <div class="about-nexus-card__meta">
      <span>Vanilla Stack • Neon PostgreSQL</span>
      <span>CodeAlpha Full Stack Project</span>
    </div>
  `;
  return card;
}

/* ── Render Right Sidebar Helper ───────────────────────────── */
async function renderRightSidebar(currentUser, onNavigate) {
  const container = document.getElementById('sidebar-right');
  if (!container) return;

  try {
    const [suggRes, trendRes, actRes] = await Promise.allSettled([
      API.getSuggestions(),
      API.getTrending(),
      API.getActivity(),
    ]);

    const suggestions = suggRes.status === 'fulfilled' ? (suggRes.value.suggestions || []) : [];
    const trending    = trendRes.status === 'fulfilled' ? (trendRes.value.trending || []) : [];
    const activity    = actRes.status === 'fulfilled' ? (actRes.value.activity || []) : [];

    container.innerHTML = '';

    // 1. Discover People
    container.appendChild(
      DiscoverPeopleCard(suggestions, currentUser, {
        onNavigate,
        onFollowChange: () => {},
      })
    );

    // 2. Trending Topics
    container.appendChild(
      TrendingCard(trending, {
        onTagClick: (tag) => onNavigate(`explore:${tag}`),
      })
    );

    // 3. Community Activity
    if (activity.length > 0) {
      container.appendChild(
        CommunityActivityCard(activity, { onNavigate })
      );
    }

    // 4. About Nexus Info
    container.appendChild(AboutNexusCard());

  } catch (err) {
    console.error('Failed to load right sidebar widgets:', err);
  }
}

/* ── Topbar Renderer ────────────────────────────────────────── */
function renderTopbar(user) {
  const actions = document.getElementById('topbar-actions');
  if (!actions) return;

  if (user) {
    actions.innerHTML = `
      <a href="/profile/${escapeHtml(user.username)}" class="btn btn-ghost btn-sm topbar__user-btn" id="nav-profile-btn">
        <span class="topbar__avatar-slot"></span>
        <span class="topbar__user-name">${escapeHtml(user.display_name)}</span>
      </a>
      <button class="btn btn-outline btn-sm" id="nav-logout-btn">Log out</button>
    `;
    actions.querySelector('.topbar__avatar-slot').appendChild(
      Avatar(user.display_name, 'sm', null, user.username)
    );
    actions.querySelector('#nav-logout-btn').addEventListener('click', async () => {
      await Auth.logout();
      toast('Logged out successfully.', 'info');
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

/* ── Sidebar Navigation ─────────────────────────────────────── */
function renderSidebarNav(user) {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;

  const homeIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>';
  const exploreIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
  const followingIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>';
  const profileIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';

  const links = [
    { icon: homeIcon,      label: 'Home',      page: 'feed' },
    { icon: exploreIcon,   label: 'Explore',   page: 'explore' },
    ...(user ? [
      { icon: followingIcon, label: 'Following', page: 'following' },
      { icon: profileIcon,   label: 'Profile',   page: `profile:${user.username}` },
    ] : []),
  ];

  nav.innerHTML = `
    <div class="sidebar-brand">
      <div class="sidebar-brand-icon">✦</div>
      <span class="sidebar-brand-name">Nexus</span>
    </div>
    <div class="sidebar-nav__links">
      ${links.map(l => `
        <a href="#" class="sidebar-link" data-page="${escapeHtml(l.page)}">
          <span class="sidebar-link__icon">${l.icon}</span>
          <span class="sidebar-link__label">${escapeHtml(l.label)}</span>
        </a>
      `).join('')}
    </div>
    ${user ? `
      <div class="sidebar-user-card" id="sidebar-user-card">
        <div class="sidebar-user-card__avatar"></div>
        <div class="sidebar-user-card__info">
          <div class="sidebar-user-card__name">${escapeHtml(user.display_name)}</div>
          <div class="sidebar-user-card__handle">@${escapeHtml(user.username)}</div>
        </div>
      </div>
    ` : ''}
  `;

  if (user) {
    nav.querySelector('.sidebar-user-card__avatar')?.appendChild(
      Avatar(user.display_name, 'sm', null, user.username)
    );
    nav.querySelector('#sidebar-user-card')?.addEventListener('click', () => {
      Router.navigate(`profile:${user.username}`);
    });
  }

  nav.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigate(link.dataset.page);
    });
  });
}
