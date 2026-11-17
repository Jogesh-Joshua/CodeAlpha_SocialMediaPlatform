/* ==========================================================
   pages.js — Page renderers for each route
   ========================================================== */
'use strict';

const Pages = (() => {

  /* ── Helpers ─────────────────────────────────────────────── */
  function getRoot() { return document.getElementById('page-root'); }

  function renderFeedPage(posts, user, loadMore, { onNavigate } = {}) {
    const root = getRoot();
    root.innerHTML = '';

    const header = el('h2', 'page-header', 'Home');
    root.appendChild(header);

    // Composer
    const composer = Composer(user, {
      onPost: (post) => {
        const card = PostCard(post, user, {
          onNavigate,
          onComment: (p) => onNavigate(`post:${p.id}`),
        });
        feed.insertBefore(card, feed.firstChild);
      },
    });
    if (composer) root.appendChild(composer);

    const feed = el('div', 'feed');
    root.appendChild(feed);

    if (!posts.length) {
      feed.appendChild(EmptyState('📭', 'Nothing here yet', 'Be the first to post something!'));
    } else {
      posts.forEach(post => {
        feed.appendChild(PostCard(post, user, {
          onNavigate,
          onComment: (p) => onNavigate(`post:${p.id}`),
        }));
      });
    }

    if (loadMore) {
      const lmWrap = el('div', 'load-more');
      const lmBtn  = el('button', 'btn btn-ghost', 'Load more');
      lmBtn.addEventListener('click', loadMore);
      lmWrap.appendChild(lmBtn);
      root.appendChild(lmWrap);
    }
  }

  /* ── Feed page ───────────────────────────────────────────── */
  async function feed(onNavigate) {
    const root = getRoot();
    root.innerHTML = '';
    root.appendChild(LoadingSpinner());

    const user = Auth.getUser();
    let page = 1;
    let allPosts = [];

    try {
      const { posts } = await API.getFeed(page);
      allPosts = posts;
      const hasMore = posts.length === 20;

      const loadMore = hasMore ? async () => {
        page++;
        try {
          const { posts: more } = await API.getFeed(page);
          more.forEach(p => {
            root.querySelector('.feed').appendChild(
              PostCard(p, user, { onNavigate, onComment: (pp) => onNavigate(`post:${pp.id}`) })
            );
          });
          if (more.length < 20) root.querySelector('.load-more')?.remove();
        } catch (err) { toast(err.message, 'error'); }
      } : null;

      renderFeedPage(allPosts, user, loadMore, { onNavigate });
    } catch (err) {
      root.innerHTML = `<div class="error-state">Failed to load feed: ${escapeHtml(err.message)}</div>`;
    }
  }

  /* ── Following feed ──────────────────────────────────────── */
  async function following(onNavigate) {
    const root = getRoot();
    root.innerHTML = '';

    const user = Auth.getUser();
    if (!user) {
      root.innerHTML = '';
      const div = el('div', 'auth-page');
      div.appendChild(EmptyState('🔒', 'Sign in to see your following feed', 'Follow people to see their posts here.'));
      root.appendChild(div);
      return;
    }

    root.appendChild(LoadingSpinner());

    let page = 1;
    try {
      const { posts } = await API.getFollowingFeed(page);

      root.innerHTML = '';
      const header = el('h2', 'page-header', 'Following');
      root.appendChild(header);

      const feed = el('div', 'feed');
      root.appendChild(feed);

      if (!posts.length) {
        feed.appendChild(EmptyState('👥', 'No posts yet', 'Follow more people to see their posts here.'));
      } else {
        posts.forEach(post => {
          feed.appendChild(PostCard(post, user, {
            onNavigate,
            onComment: (p) => onNavigate(`post:${p.id}`),
          }));
        });

        if (posts.length === 20) {
          const lmWrap = el('div', 'load-more');
          const lmBtn  = el('button', 'btn btn-ghost', 'Load more');
          lmBtn.addEventListener('click', async () => {
            page++;
            const { posts: more } = await API.getFollowingFeed(page);
            more.forEach(p => feed.appendChild(PostCard(p, user, { onNavigate })));
            if (more.length < 20) lmWrap.remove();
          });
          lmWrap.appendChild(lmBtn);
          root.appendChild(lmWrap);
        }
      }
    } catch (err) {
      root.innerHTML = `<div class="error-state">${escapeHtml(err.message)}</div>`;
    }
  }

  /* ── Single post page ────────────────────────────────────── */
  async function postDetail(postId, onNavigate) {
    const root = getRoot();
    root.innerHTML = '';
    root.appendChild(LoadingSpinner());

    const user = Auth.getUser();

    try {
      const { post, comments } = await API.getPost(postId);
      root.innerHTML = '';

      const backBtn = el('button', 'btn btn-ghost btn-sm', '← Back');
      backBtn.style.marginBottom = '1rem';
      backBtn.addEventListener('click', () => history.back());
      root.appendChild(backBtn);

      const card = PostCard(post, user, {
        onNavigate,
        onLike: () => {},
        onDelete: () => { toast('Post deleted.', 'success'); onNavigate('feed'); },
      });
      root.appendChild(card);

      // Comments section
      const section = el('div', 'comments-section');
      const title = el('h3', '', `Comments (${comments.length})`);
      title.style.cssText = 'font-size:var(--text-sm);font-weight:600;margin-bottom:1rem;color:var(--color-text-muted)';
      section.appendChild(title);

      const commentList = el('div', 'comment-list');
      comments.forEach(c => {
        commentList.appendChild(CommentItem(c, user, {
          onDelete: async (comment) => {
            if (!confirm('Delete comment?')) return;
            try {
              await API.deleteComment(postId, comment.id);
              commentList.removeChild(commentList.querySelector(`[data-cid="${comment.id}"]`)?.closest('.comment-item') || document.createElement('span'));
              toast('Comment deleted.', 'success');
            } catch (err) { toast(err.message, 'error'); }
          },
        }));
      });
      section.appendChild(commentList);

      // Comment form
      if (user) {
        const form = el('div', 'comment-form');
        const input = el('input', 'comment-form__input');
        input.type = 'text';
        input.placeholder = 'Write a comment…';
        input.maxLength = 300;

        const btn = el('button', 'btn btn-primary btn-sm', 'Post');
        btn.addEventListener('click', async () => {
          const content = input.value.trim();
          if (!content) return;
          btn.disabled = true;
          try {
            const { comment } = await API.addComment(postId, { content });
            input.value = '';
            commentList.appendChild(CommentItem(comment, user, {
              onDelete: async (c) => {
                await API.deleteComment(postId, c.id);
                commentList.querySelector(`[data-cid]`)?.closest('.comment-item')?.remove();
              },
            }));
            title.textContent = `Comments (${commentList.children.length})`;
          } catch (err) { toast(err.message, 'error'); }
          finally { btn.disabled = false; }
        });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); btn.click(); }
        });

        form.append(input, btn);
        section.appendChild(form);
      }

      card.appendChild(section);
    } catch (err) {
      root.innerHTML = `<div class="error-state">Failed to load post: ${escapeHtml(err.message)}</div>`;
    }
  }

  /* ── Profile page ────────────────────────────────────────── */
  async function profile(username, onNavigate) {
    const root = getRoot();
    root.innerHTML = '';
    root.appendChild(LoadingSpinner());

    const user = Auth.getUser();
    const isOwnProfile = user && user.username === username;

    try {
      const [profileData, postsData] = await Promise.all([
        API.getProfile(username),
        API.getUserPosts(username, 1),
      ]);
      const p = profileData.profile;
      const posts = postsData.posts;

      root.innerHTML = '';

      // Profile header
      const header = el('div', 'profile-header');
      header.innerHTML = `
        <div class="profile-top">
          <div class="profile-avatar-slot"></div>
          <div class="profile-info">
            <div class="profile-name">${escapeHtml(p.display_name)}</div>
            <div class="profile-handle">@${escapeHtml(p.username)}</div>
            ${p.bio ? `<div class="profile-bio">${escapeHtml(p.bio)}</div>` : ''}
            <div class="profile-stats">
              <div class="profile-stat">
                <span class="profile-stat__num">${p.followers_count}</span>
                <span class="profile-stat__label">Followers</span>
              </div>
              <div class="profile-stat">
                <span class="profile-stat__num">${p.following_count}</span>
                <span class="profile-stat__label">Following</span>
              </div>
            </div>
            <div class="profile-joined">Joined ${new Date(p.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
          </div>
          <div class="profile-actions"></div>
        </div>
      `;

      header.querySelector('.profile-avatar-slot').appendChild(Avatar(p.display_name, 'lg'));

      const actionsDiv = header.querySelector('.profile-actions');

      if (isOwnProfile) {
        const editBtn = el('button', 'btn btn-ghost btn-sm', 'Edit profile');
        editBtn.addEventListener('click', () => showEditProfileModal(user, (updated) => {
          header.querySelector('.profile-name').textContent = updated.display_name;
          if (updated.bio) {
            const bioEl = header.querySelector('.profile-bio') || el('div', 'profile-bio');
            bioEl.textContent = updated.bio;
            if (!header.querySelector('.profile-bio')) header.querySelector('.profile-info').appendChild(bioEl);
          }
        }));
        actionsDiv.appendChild(editBtn);
      } else if (user) {
        let isFollowing = p.is_following;
        const followBtn = el('button', `btn ${isFollowing ? 'btn-ghost' : 'btn-primary'} btn-sm`, isFollowing ? 'Following' : 'Follow');
        followBtn.addEventListener('click', async () => {
          try {
            if (isFollowing) {
              await API.unfollowUser(username);
              isFollowing = false;
              followBtn.className = 'btn btn-primary btn-sm';
              followBtn.textContent = 'Follow';
              const stat = header.querySelectorAll('.profile-stat__num')[0];
              stat.textContent = Math.max(0, parseInt(stat.textContent) - 1);
            } else {
              await API.followUser(username);
              isFollowing = true;
              followBtn.className = 'btn btn-ghost btn-sm';
              followBtn.textContent = 'Following';
              const stat = header.querySelectorAll('.profile-stat__num')[0];
              stat.textContent = parseInt(stat.textContent) + 1;
            }
          } catch (err) { toast(err.message, 'error'); }
        });
        actionsDiv.appendChild(followBtn);
      }

      root.appendChild(header);

      // Posts section
      const postsHeader = el('h3', 'page-header', 'Posts');
      root.appendChild(postsHeader);

      const feed = el('div', 'feed');
      if (!posts.length) {
        feed.appendChild(EmptyState('✏️', 'No posts yet', isOwnProfile ? 'Share your first post!' : `${p.display_name} hasn't posted yet.`));
      } else {
        posts.forEach(post => {
          feed.appendChild(PostCard(post, user, {
            onNavigate,
            onComment: (pp) => onNavigate(`post:${pp.id}`),
            onDelete: (id) => { feed.querySelector(`[data-post-id="${id}"]`)?.remove(); },
          }));
        });
      }
      root.appendChild(feed);

    } catch (err) {
      if (err.status === 404) {
        root.innerHTML = '';
        root.appendChild(EmptyState('🔍', 'User not found', `@${username} doesn't exist.`));
      } else {
        root.innerHTML = `<div class="error-state">Failed to load profile: ${escapeHtml(err.message)}</div>`;
      }
    }
  }

  /* ── Edit profile modal ──────────────────────────────────── */
  function showEditProfileModal(user, onSave) {
    const content = document.getElementById('modal-content');
    content.innerHTML = `
      <h2 style="font-size:var(--text-xl);font-weight:700;margin-bottom:var(--space-6)">Edit Profile</h2>
      <div class="auth-form">
        <div class="form-group">
          <label class="form-label" for="edit-display-name">Display Name</label>
          <input class="form-input" id="edit-display-name" type="text" value="${escapeHtml(user.display_name)}" maxlength="64" />
        </div>
        <div class="form-group">
          <label class="form-label" for="edit-bio">Bio</label>
          <textarea class="form-textarea" id="edit-bio" maxlength="300" rows="3">${escapeHtml(user.bio || '')}</textarea>
        </div>
        <div id="edit-error" class="form-error hidden"></div>
        <button class="btn btn-primary btn-lg" id="edit-save-btn" style="width:100%">Save changes</button>
      </div>
    `;

    document.getElementById('modal-overlay').classList.remove('hidden');

    document.getElementById('edit-save-btn').addEventListener('click', async () => {
      const display_name = document.getElementById('edit-display-name').value.trim();
      const bio = document.getElementById('edit-bio').value.trim();
      const errEl = document.getElementById('edit-error');
      errEl.classList.add('hidden');

      if (!display_name) { errEl.textContent = 'Display name is required.'; errEl.classList.remove('hidden'); return; }

      try {
        const updated = await Auth.updateProfile(display_name, bio);
        document.getElementById('modal-overlay').classList.add('hidden');
        toast('Profile updated!', 'success');
        if (onSave) onSave(updated);
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      }
    });
  }

  /* ── Login page ──────────────────────────────────────────── */
  function login(onNavigate) {
    const root = getRoot();
    root.innerHTML = '';

    const page = el('div', 'auth-page');
    page.innerHTML = `
      <div class="auth-card">
        <div style="text-align:center;margin-bottom:var(--space-6)">
          <span style="font-size:2.5rem">✦</span>
          <h1 class="auth-card__title" style="margin-top:var(--space-2)">Welcome back</h1>
          <p class="auth-card__subtitle">Sign in to your Nexus account</p>
        </div>
        <form class="auth-form" id="login-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="login-login">Username or email</label>
            <input class="form-input" id="login-login" type="text" autocomplete="username" placeholder="you@example.com" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="login-password">Password</label>
            <input class="form-input" id="login-password" type="password" autocomplete="current-password" placeholder="••••••••" required />
          </div>
          <div id="login-error" class="form-error hidden"></div>
          <button class="btn btn-primary btn-lg" type="submit" style="width:100%">Sign in</button>
        </form>
        <div class="auth-footer">
          Don't have an account? <a href="#" id="goto-register">Sign up</a>
        </div>
      </div>
    `;
    root.appendChild(page);

    document.getElementById('goto-register').addEventListener('click', (e) => {
      e.preventDefault(); onNavigate('register');
    });

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const login  = document.getElementById('login-login').value.trim();
      const password = document.getElementById('login-password').value;
      const errEl = document.getElementById('login-error');
      errEl.classList.add('hidden');

      const btn = e.target.querySelector('[type=submit]');
      btn.disabled = true; btn.textContent = 'Signing in…';

      try {
        await Auth.login(login, password);
        toast('Welcome back!', 'success');
        onNavigate('feed');
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      } finally {
        btn.disabled = false; btn.textContent = 'Sign in';
      }
    });
  }

  /* ── Register page ───────────────────────────────────────── */
  function register(onNavigate) {
    const root = getRoot();
    root.innerHTML = '';

    const page = el('div', 'auth-page');
    page.innerHTML = `
      <div class="auth-card">
        <div style="text-align:center;margin-bottom:var(--space-6)">
          <span style="font-size:2.5rem">✦</span>
          <h1 class="auth-card__title" style="margin-top:var(--space-2)">Join Nexus</h1>
          <p class="auth-card__subtitle">Create your account</p>
        </div>
        <form class="auth-form" id="register-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="reg-username">Username</label>
            <input class="form-input" id="reg-username" type="text" autocomplete="username" placeholder="yourhandle" maxlength="32" required />
            <span class="form-hint">3–32 characters: letters, numbers, underscores</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-display">Display name</label>
            <input class="form-input" id="reg-display" type="text" placeholder="Your Name" maxlength="64" />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-email">Email</label>
            <input class="form-input" id="reg-email" type="email" autocomplete="email" placeholder="you@example.com" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-password">Password</label>
            <input class="form-input" id="reg-password" type="password" autocomplete="new-password" placeholder="At least 8 characters" required />
          </div>
          <div id="register-error" class="form-error hidden"></div>
          <button class="btn btn-primary btn-lg" type="submit" style="width:100%">Create account</button>
        </form>
        <div class="auth-footer">
          Already have an account? <a href="#" id="goto-login">Sign in</a>
        </div>
      </div>
    `;
    root.appendChild(page);

    document.getElementById('goto-login').addEventListener('click', (e) => {
      e.preventDefault(); onNavigate('login');
    });

    document.getElementById('register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username     = document.getElementById('reg-username').value.trim();
      const display_name = document.getElementById('reg-display').value.trim() || username;
      const email        = document.getElementById('reg-email').value.trim();
      const password     = document.getElementById('reg-password').value;
      const errEl        = document.getElementById('register-error');
      errEl.classList.add('hidden');

      const btn = e.target.querySelector('[type=submit]');
      btn.disabled = true; btn.textContent = 'Creating account…';

      try {
        await Auth.register(username, display_name, email, password);
        toast('Account created! Welcome to Nexus 🎉', 'success');
        onNavigate('feed');
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      } finally {
        btn.disabled = false; btn.textContent = 'Create account';
      }
    });
  }

  /* ── 404 ─────────────────────────────────────────────────── */
  function notFound() {
    const root = getRoot();
    root.innerHTML = '';
    root.appendChild(EmptyState('🔍', 'Page not found', 'The page you\'re looking for doesn\'t exist.'));
  }

  return { feed, following, postDetail, profile, login, register, notFound };
})();
