/* ==========================================================
   app.js — Client-side router and application bootstrap
   ========================================================== */
'use strict';

const Router = (() => {
  function navigate(page) {
    const root = document.getElementById('page-root');

    // Update active nav links
    document.querySelectorAll('.nav-link, .sidebar-link').forEach(l => {
      l.classList.toggle('active', l.dataset.page === page || l.dataset.page === page.split(':')[0]);
    });

    // Route
    if (page === 'feed') {
      Pages.feed(navigate);
    } else if (page === 'following') {
      Pages.following(navigate);
    } else if (page === 'login') {
      Pages.login(navigate);
    } else if (page === 'register') {
      Pages.register(navigate);
    } else if (page.startsWith('profile:')) {
      const username = page.slice(8);
      Pages.profile(username, navigate);
    } else if (page.startsWith('post:')) {
      const postId = page.slice(5);
      Pages.postDetail(postId, navigate);
    } else {
      Pages.notFound();
    }
  }

  return { navigate };
})();

/* ── Bootstrap ───────────────────────────────────────────── */
(async function init() {
  // Wire modal close
  const overlay = document.getElementById('modal-overlay');
  const closeBtn = document.getElementById('modal-close');
  closeBtn?.addEventListener('click', () => overlay?.classList.add('hidden'));
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });

  // Load session
  await Auth.init();

  // Re-render nav on auth state change
  Auth.onChange((user) => {
    renderTopbar(user);
    renderSidebarNav(user);
  });

  // Initial render
  renderTopbar(Auth.getUser());
  renderSidebarNav(Auth.getUser());

  // Initial route based on current path
  const path = window.location.pathname;
  if (path.startsWith('/profile/')) {
    Router.navigate(`profile:${path.slice(9)}`);
  } else if (path === '/following') {
    Router.navigate('following');
  } else if (path === '/login') {
    Router.navigate('login');
  } else if (path === '/register') {
    Router.navigate('register');
  } else {
    Router.navigate('feed');
  }
})();
