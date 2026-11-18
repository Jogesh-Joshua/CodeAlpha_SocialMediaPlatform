/* ==========================================================
   app.js — Client-side router and application bootstrap
   ========================================================== */
'use strict';

const Router = (() => {
  function pageToUrl(page) {
    if (page === 'feed') return '/';
    if (page === 'explore') return '/explore';
    if (page.startsWith('explore:')) return `/explore?q=${encodeURIComponent(page.slice(8))}`;
    if (page === 'following') return '/following';
    if (page === 'login') return '/login';
    if (page === 'register') return '/register';
    if (page.startsWith('profile:')) return `/profile/${page.slice(8)}`;
    if (page.startsWith('post:')) return `/post/${page.slice(5)}`;
    return '/';
  }

  function navigate(page, { updateHistory = true } = {}) {
    // Sync browser URL bar without page refresh
    if (updateHistory) {
      const url = pageToUrl(page);
      if (window.location.pathname + window.location.search !== url) {
        window.history.pushState({ page }, '', url);
      }
    }

    // Update active nav links across topbar and sidebar
    const basePage = page.split(':')[0];
    document.querySelectorAll('.nav-link, .sidebar-link').forEach(l => {
      const linkPage = (l.dataset.page || '').split(':')[0];
      const isActive = (l.dataset.page === page || linkPage === basePage);
      l.classList.toggle('active', isActive);
    });
    // Update mobile bottom nav active state
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
      const btnPage = (btn.dataset.page || '').split(':')[0];
      btn.classList.toggle('active', btnPage === basePage || btn.dataset.page === page);
    });

    // Populate right sidebar with live database content
    renderRightSidebar(Auth.getUser(), navigate);

    // Route view rendering
    if (page === 'feed') {
      Pages.feed(navigate);
    } else if (page === 'explore' || page.startsWith('explore:')) {
      const query = page.startsWith('explore:') ? page.slice(8) : '';
      Pages.explore(navigate, query);
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

    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return { navigate };
})();

function renderMobileNav(user) {
  let nav = document.getElementById('mobile-bottom-nav');
  if (!nav) {
    nav = document.createElement('nav');
    nav.className = 'mobile-bottom-nav';
    nav.id = 'mobile-bottom-nav';
    document.body.appendChild(nav);
  }

  const homeIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
  const exploreIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  const followingIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
  const profileIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

  const isDark = (typeof Theme !== 'undefined' ? Theme.get() : 'dark') === 'dark';
  const themeIcon = isDark ? (typeof ICONS !== 'undefined' ? ICONS.sun : '☀️') : (typeof ICONS !== 'undefined' ? ICONS.moon : '🌙');

  nav.innerHTML = '';
  const items = [
    { icon: homeIcon, label: 'Home', page: 'feed' },
    { icon: exploreIcon, label: 'Explore', page: 'explore' },
    { icon: themeIcon, label: isDark ? 'Light' : 'Dark', isTheme: true },
    { icon: followingIcon, label: 'Following', page: 'following' },
    { icon: profileIcon, label: 'Profile', page: user ? `profile:${user.username}` : 'login' },
  ];

  items.forEach(item => {
    const btn = document.createElement('button');
    btn.className = `mobile-nav-btn${item.isTheme ? ' mobile-nav-btn--theme' : ''}`;
    if (item.page) btn.dataset.page = item.page;
    btn.innerHTML = `${item.icon}<span>${item.label}</span>`;
    if (item.isTheme) {
      btn.addEventListener('click', () => {
        if (typeof Theme !== 'undefined') {
          Theme.toggle();
        }
      });
    } else {
      btn.addEventListener('click', () => Router.navigate(item.page));
    }
    nav.appendChild(btn);
  });
}

function renderMobileNavState(user) {
  const nav = document.getElementById('mobile-bottom-nav');
  if (!nav) return;
  const isDark = (typeof Theme !== 'undefined' ? Theme.get() : 'dark') === 'dark';
  const themeBtn = nav.querySelector('.mobile-nav-btn--theme');
  if (themeBtn) {
    const icon = isDark ? (typeof ICONS !== 'undefined' ? ICONS.sun : '☀️') : (typeof ICONS !== 'undefined' ? ICONS.moon : '🌙');
    themeBtn.innerHTML = `${icon}<span>${isDark ? 'Light' : 'Dark'}</span>`;
  }
  const profileBtn = nav.querySelector('[data-page^="profile"], [data-page="login"]');
  if (profileBtn) {
    profileBtn.dataset.page = user ? `profile:${user.username}` : 'login';
    profileBtn.onclick = () => Router.navigate(profileBtn.dataset.page);
  }
}

/* ── Bootstrap ───────────────────────────────────────────── */
(async function init() {
  // Wire modal overlay close button
  const overlay = document.getElementById('modal-overlay');
  const closeBtn = document.getElementById('modal-close');
  closeBtn?.addEventListener('click', () => overlay?.classList.add('hidden'));
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });

  // Wire topbar brand and links
  document.getElementById('nav-home')?.addEventListener('click', (e) => {
    e.preventDefault();
    Router.navigate('feed');
  });
  document.getElementById('nav-feed')?.addEventListener('click', (e) => {
    e.preventDefault();
    Router.navigate('feed');
  });
  document.getElementById('nav-explore')?.addEventListener('click', (e) => {
    e.preventDefault();
    Router.navigate('explore');
  });
  document.getElementById('nav-following')?.addEventListener('click', (e) => {
    e.preventDefault();
    Router.navigate('following');
  });

  // Handle browser back and forward buttons
  window.addEventListener('popstate', (e) => {
    const page = e.state?.page || pathToPage(window.location.pathname, window.location.search);
    Router.navigate(page, { updateHistory: false });
  });

  // Helper to parse current path to route
  function pathToPage(pathname, search) {
    if (pathname.startsWith('/profile/')) {
      return `profile:${pathname.slice(9)}`;
    }
    if (pathname.startsWith('/post/')) {
      return `post:${pathname.slice(6)}`;
    }
    if (pathname === '/explore') {
      const params = new URLSearchParams(search);
      const q = params.get('q');
      return q ? `explore:${q}` : 'explore';
    }
    if (pathname === '/following') return 'following';
    if (pathname === '/login') return 'login';
    if (pathname === '/register') return 'register';
    return 'feed';
  }

  // Load session from server
  await Auth.init();

  // Initialize theme from storage
  if (typeof Theme !== 'undefined') {
    Theme.set(Theme.get());
  }

  // Sync theme changes across desktop and mobile navs
  window.addEventListener('nexus-theme-change', () => {
    renderSidebarNav(Auth.getUser());
    renderMobileNavState(Auth.getUser());
  });

  // Re-render nav and right sidebar on auth state change
  Auth.onChange((user) => {
    renderTopbar(user);
    renderSidebarNav(user);
    renderMobileNavState(user);
    renderRightSidebar(user, Router.navigate);
  });

  // Initial navigation elements
  renderTopbar(Auth.getUser());
  renderSidebarNav(Auth.getUser());
  // Mobile bottom nav (visible only on small screens via CSS)
  renderMobileNav(Auth.getUser());

  // Initial route
  const initialPage = pathToPage(window.location.pathname, window.location.search);
  Router.navigate(initialPage, { updateHistory: false });
})();
