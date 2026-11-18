/* ==========================================================
   pages.js — Page renderers for Nexus routes
   ========================================================== */
'use strict';

const Pages = (() => {

  /* ── Helpers ─────────────────────────────────────────────── */
  function getRoot() { return document.getElementById('page-root'); }

  /* ── Feed page (For You) ─────────────────────────────────── */
  async function feed(onNavigate) {
    const root = getRoot();
    root.innerHTML = '';
    root.appendChild(LoadingSpinner());

    const user = Auth.getUser();
    let page = 1;

    try {
      const [feedRes, suggRes] = await Promise.allSettled([
        API.getFeed(page),
        API.getSuggestions(),
      ]);
      const posts = feedRes.status === 'fulfilled' ? (feedRes.value.posts || []) : [];
      const suggestions = suggRes.status === 'fulfilled' ? (suggRes.value.suggestions || []) : [];
      root.innerHTML = '';

      // Guest Hero Banner if not logged in
      if (!user) {
        root.appendChild(HeroWelcomeBanner({ onNavigate }));
      }

      // Creator Discovery Avatar Strip
      if (suggestions && suggestions.length > 0) {
        const strip = AvatarStrip(suggestions, onNavigate);
        if (strip) root.appendChild(strip);
      }

      // Top Feed Tabs: [ For You ] [ Following ]
      const tabContainer = el('div', 'feed-tabs-container');
      tabContainer.innerHTML = `
        <div class="feed-tabs">
          <button class="feed-tab active" id="tab-for-you">For You</button>
          <button class="feed-tab" id="tab-following">Following</button>
        </div>
      `;
      tabContainer.querySelector('#tab-following').addEventListener('click', () => {
        onNavigate('following');
      });
      root.appendChild(tabContainer);

      // Composer (when logged in)
      if (user) {
        const composer = Composer(user, {
          onPost: (newPost) => {
            const feedEl = root.querySelector('.feed');
            const emptyEl = feedEl.querySelector('.empty-state');
            if (emptyEl) emptyEl.remove();

            const card = PostCard(newPost, user, {
              onNavigate,
              onComment: (p) => onNavigate(`post:${p.id}`),
            });
            feedEl.insertBefore(card, feedEl.firstChild);
          },
        });
        if (composer) root.appendChild(composer);
      }

      // Feed container
      const feedEl = el('div', 'feed');
      root.appendChild(feedEl);

      if (!posts.length) {
        feedEl.appendChild(EmptyState('📭', 'Nothing in your feed yet', 'Be the first to share something with the community!'));
      } else {
        posts.forEach(post => {
          feedEl.appendChild(PostCard(post, user, {
            onNavigate,
            onComment: (p) => onNavigate(`post:${p.id}`),
          }));
        });
      }

      // Load More pagination
      if (posts.length === 20) {
        const lmWrap = el('div', 'load-more');
        const lmBtn  = el('button', 'btn btn-ghost', 'Load more posts');
        lmBtn.addEventListener('click', async () => {
          page++;
          try {
            const { posts: more } = await API.getFeed(page);
            more.forEach(p => {
              feedEl.appendChild(
                PostCard(p, user, { onNavigate, onComment: (pp) => onNavigate(`post:${pp.id}`) })
              );
            });
            if (more.length < 20) lmWrap.remove();
          } catch (err) { toast(err.message, 'error'); }
        });
        lmWrap.appendChild(lmBtn);
        root.appendChild(lmWrap);
      }

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
      const loginBtn = el('button', 'btn btn-primary', 'Log In to Nexus');
      loginBtn.style.marginTop = '1rem';
      loginBtn.addEventListener('click', () => onNavigate('login'));
      div.querySelector('.empty-state')?.appendChild(loginBtn);
      root.appendChild(div);
      return;
    }

    root.appendChild(LoadingSpinner());

    let page = 1;
    try {
      const { posts } = await API.getFollowingFeed(page);

      root.innerHTML = '';

      // Feed Tabs
      const tabContainer = el('div', 'feed-tabs-container');
      tabContainer.innerHTML = `
        <div class="feed-tabs">
          <button class="feed-tab" id="tab-for-you">For You</button>
          <button class="feed-tab active" id="tab-following">Following</button>
        </div>
      `;
      tabContainer.querySelector('#tab-for-you').addEventListener('click', () => {
        onNavigate('feed');
      });
      root.appendChild(tabContainer);

      const feedEl = el('div', 'feed');
      root.appendChild(feedEl);

      if (!posts.length) {
        feedEl.appendChild(EmptyState('👥', 'No posts from people you follow yet', 'Follow more creators to see their updates here! Check out the Explore page or Discover People in the right sidebar.'));
      } else {
        posts.forEach(post => {
          feedEl.appendChild(PostCard(post, user, {
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
            more.forEach(p => feedEl.appendChild(PostCard(p, user, { onNavigate })));
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

  /* ── Explore Page ────────────────────────────────────────── */
  async function explore(onNavigate, initialSearch = '') {
    const root = getRoot();
    root.innerHTML = '';
    root.appendChild(LoadingSpinner());

    const user = Auth.getUser();
    let currentFilter = ''; // '' (all), 'photos'
    let currentQuery = initialSearch || '';

    async function loadExploreContent(container, q, filter) {
      container.innerHTML = '';
      container.appendChild(LoadingSpinner());

      try {
        const { posts } = await API.getExplore(1, filter, q);
        container.innerHTML = '';

        if (!posts || !posts.length) {
          container.appendChild(EmptyState(
            '🔍',
            'No matching posts found',
            q ? `No results for "${escapeHtml(q)}". Try a different search term or hashtag.` : 'Be the first to share content in this topic!'
          ));
          return;
        }

        // If 'photos' filter is selected, render a modern photo grid
        if (filter === 'photos') {
          const grid = el('div', 'explore-photo-grid');
          posts.forEach(post => {
            if (!post.image_url) return;
            const tile = el('div', 'photo-tile');
            tile.innerHTML = `
              <img src="${escapeHtml(post.image_url)}" class="photo-tile__img" alt="Photo post" loading="lazy" />
              <div class="photo-tile__overlay">
                <div class="photo-tile__meta">
                  <span class="photo-tile__author">@${escapeHtml(post.username)}</span>
                  <div class="photo-tile__stats">
                    <span>❤️ ${post.likes_count || 0}</span>
                    <span>💬 ${post.comments_count || 0}</span>
                  </div>
                </div>
                <p class="photo-tile__snippet">${escapeHtml((post.content || '').slice(0, 80))}</p>
              </div>
            `;
            tile.addEventListener('click', () => {
              onNavigate(`post:${post.id}`);
            });
            grid.appendChild(tile);
          });
          container.appendChild(grid);
        } else {
          // Standard explore feed
          const feedEl = el('div', 'feed');
          posts.forEach(post => {
            feedEl.appendChild(PostCard(post, user, {
              onNavigate,
              onComment: (p) => onNavigate(`post:${p.id}`),
            }));
          });
          container.appendChild(feedEl);
        }
      } catch (err) {
        container.innerHTML = `<div class="error-state">Failed to load explore content: ${escapeHtml(err.message)}</div>`;
      }
    }

    try {
      root.innerHTML = '';

      // Explore Page Header
      const header = el('div', 'explore-header');
      header.innerHTML = `
        <h2 class="page-header" style="border:none;margin-bottom:var(--space-3)">Explore</h2>
        
        <!-- Search bar -->
        <div class="explore-search-bar">
          <span class="explore-search-icon">🔍</span>
          <input type="text" class="explore-search-input" id="explore-search-input"
                 placeholder="Search posts, hashtags (#webdev), or people..."
                 value="${escapeHtml(currentQuery)}" />
          ${currentQuery ? `<button class="explore-search-clear" id="explore-search-clear">✕</button>` : ''}
        </div>

        <!-- Filter tabs -->
        <div class="explore-filters">
          <button class="filter-chip ${currentFilter === '' ? 'active' : ''}" data-filter="">All Posts</button>
          <button class="filter-chip ${currentFilter === 'photos' ? 'active' : ''}" data-filter="photos">📸 Photos</button>
        </div>
      `;

      root.appendChild(header);

      const contentContainer = el('div', 'explore-content');
      root.appendChild(contentContainer);

      const searchInput = header.querySelector('#explore-search-input');
      const clearBtn   = header.querySelector('#explore-search-clear');

      // Debounced search
      let debounceTimer = null;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        currentQuery = searchInput.value.trim();
        debounceTimer = setTimeout(() => {
          loadExploreContent(contentContainer, currentQuery, currentFilter);
        }, 300);
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          clearTimeout(debounceTimer);
          currentQuery = searchInput.value.trim();
          loadExploreContent(contentContainer, currentQuery, currentFilter);
        }
      });

      clearBtn?.addEventListener('click', () => {
        searchInput.value = '';
        currentQuery = '';
        clearBtn.remove();
        loadExploreContent(contentContainer, '', currentFilter);
      });

      // Filter chips click
      header.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          header.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          currentFilter = chip.dataset.filter;
          loadExploreContent(contentContainer, currentQuery, currentFilter);
        });
      });

      // Initial load
      await loadExploreContent(contentContainer, currentQuery, currentFilter);

    } catch (err) {
      root.innerHTML = `<div class="error-state">Failed to initialize explore: ${escapeHtml(err.message)}</div>`;
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

      const backBtn = el('button', 'btn btn-ghost btn-sm', '← Back to Feed');
      backBtn.style.marginBottom = '1.25rem';
      backBtn.addEventListener('click', () => {
        if (window.history.length > 1) {
          history.back();
        } else {
          onNavigate('feed');
        }
      });
      root.appendChild(backBtn);

      const card = PostCard(post, user, {
        onNavigate,
        onLike: () => {},
        onDelete: () => {
          toast('Post deleted.', 'success');
          onNavigate('feed');
        },
      });
      root.appendChild(card);

      // Comments section
      const section = el('div', 'comments-section');
      const title = el('h3', 'comments-title', `Comments (${comments.length})`);
      section.appendChild(title);

      const commentList = el('div', 'comment-list');
      comments.forEach(c => {
        commentList.appendChild(CommentItem(c, user, {
          onDelete: async (comment) => {
            try {
              await API.deleteComment(postId, comment.id);
              commentList.querySelector(`[data-cid="${comment.id}"]`)?.remove();
              title.textContent = `Comments (${commentList.children.length})`;
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
        input.placeholder = 'Write a thoughtful comment…';
        input.maxLength = 300;

        const btn = el('button', 'btn btn-primary btn-sm', 'Reply');
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
                commentList.querySelector(`[data-cid="${c.id}"]`)?.remove();
                title.textContent = `Comments (${commentList.children.length})`;
              },
            }));
            title.textContent = `Comments (${commentList.children.length})`;
            toast('Comment added!', 'success');
          } catch (err) { toast(err.message, 'error'); }
          finally { btn.disabled = false; }
        });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); btn.click(); }
        });

        form.append(input, btn);
        section.appendChild(form);
      } else {
        const prompt = el('div', 'comment-login-prompt');
        prompt.innerHTML = `
          <span>Join the conversation. <a href="#" id="comment-login-link">Sign in</a> to leave a comment.</span>
        `;
        prompt.querySelector('#comment-login-link')?.addEventListener('click', (e) => {
          e.preventDefault();
          onNavigate('login');
        });
        section.appendChild(prompt);
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
              <div class="profile-stat">
                <span class="profile-stat__num">${posts.length}</span>
                <span class="profile-stat__label">Posts</span>
              </div>
            </div>
            <div class="profile-joined">📅 Joined ${new Date(p.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
          </div>
          <div class="profile-actions"></div>
        </div>
      `;

      header.querySelector('.profile-avatar-slot').appendChild(
        Avatar(p.display_name, 'lg', null, p.username)
      );

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
              toast(`Unfollowed @${username}`, 'info');
            } else {
              await API.followUser(username);
              isFollowing = true;
              followBtn.className = 'btn btn-ghost btn-sm';
              followBtn.textContent = 'Following';
              const stat = header.querySelectorAll('.profile-stat__num')[0];
              stat.textContent = parseInt(stat.textContent) + 1;
              toast(`Following @${username}!`, 'success');
            }
          } catch (err) { toast(err.message, 'error'); }
        });
        actionsDiv.appendChild(followBtn);
      } else {
        const followBtn = el('button', 'btn btn-primary btn-sm', 'Follow');
        followBtn.addEventListener('click', showLoginPrompt);
        actionsDiv.appendChild(followBtn);
      }

      root.appendChild(header);

      // User's Posts section
      const postsHeader = el('h3', 'page-header', 'Posts');
      root.appendChild(postsHeader);

      const feedEl = el('div', 'feed');
      if (!posts.length) {
        feedEl.appendChild(EmptyState('✏️', 'No posts yet', isOwnProfile ? 'Share your first post with the community!' : `${p.display_name} hasn't posted yet.`));
      } else {
        posts.forEach(post => {
          feedEl.appendChild(PostCard(post, user, {
            onNavigate,
            onComment: (pp) => onNavigate(`post:${pp.id}`),
            onDelete: (id) => { feedEl.querySelector(`[data-post-id="${id}"]`)?.remove(); },
          }));
        });
      }
      root.appendChild(feedEl);

    } catch (err) {
      if (err.status === 404) {
        root.innerHTML = '';
        root.appendChild(EmptyState('🔍', 'User not found', `@${username} doesn't exist on Nexus.`));
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
          <textarea class="form-textarea" id="edit-bio" maxlength="300" rows="3" placeholder="Tell the community about yourself...">${escapeHtml(user.bio || '')}</textarea>
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

      if (!display_name) {
        errEl.textContent = 'Display name is required.';
        errEl.classList.remove('hidden');
        return;
      }

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
          <span style="font-size:2.5rem;color:var(--color-accent)">✦</span>
          <h1 class="auth-card__title" style="margin-top:var(--space-2)">Welcome back</h1>
          <p class="auth-card__subtitle">Sign in to your Nexus account</p>
        </div>
        <form class="auth-form" id="login-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="login-login">Username or email</label>
            <input class="form-input" id="login-login" type="text" autocomplete="username" placeholder="you@example.com or username" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="login-password">Password</label>
            <input class="form-input" id="login-password" type="password" autocomplete="current-password" placeholder="••••••••" required />
          </div>
          <div id="login-error" class="form-error hidden"></div>
          <button class="btn btn-primary btn-lg" type="submit" style="width:100%">Sign in</button>
        </form>
        <div class="auth-footer">
          Don't have an account? <a href="#" id="goto-register">Create one free</a>
        </div>
      </div>
    `;
    root.appendChild(page);

    document.getElementById('goto-register').addEventListener('click', (e) => {
      e.preventDefault(); onNavigate('register');
    });

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const loginVal  = document.getElementById('login-login').value.trim();
      const password = document.getElementById('login-password').value;
      const errEl = document.getElementById('login-error');
      errEl.classList.add('hidden');

      const btn = e.target.querySelector('[type=submit]');
      btn.disabled = true; btn.textContent = 'Signing in…';

      try {
        await Auth.login(loginVal, password);
        toast('Welcome back to Nexus! ✨', 'success');
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
          <span style="font-size:2.5rem;color:var(--color-accent)">✦</span>
          <h1 class="auth-card__title" style="margin-top:var(--space-2)">Join Nexus</h1>
          <p class="auth-card__subtitle">Create your personal creator account</p>
        </div>
        <form class="auth-form" id="register-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="reg-username">Username</label>
            <input class="form-input" id="reg-username" type="text" autocomplete="username" placeholder="yourhandle" maxlength="32" required />
            <span class="form-hint">3–32 characters: letters, numbers, underscores</span>
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-display">Display name</label>
            <input class="form-input" id="reg-display" type="text" placeholder="Your Name or Studio" maxlength="64" />
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

  return { feed, following, explore, postDetail, profile, login, register, notFound };
})();
