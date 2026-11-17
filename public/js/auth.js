/* ==========================================================
   auth.js — Auth state management (currentUser, login, logout)
   ========================================================== */
'use strict';

const Auth = (() => {
  let _user = null;
  const _listeners = [];

  function onChange(fn) { _listeners.push(fn); }
  function _notify() { _listeners.forEach(fn => fn(_user)); }

  function getUser() { return _user; }
  function isLoggedIn() { return _user !== null; }

  async function init() {
    try {
      const { user } = await API.me();
      _user = user;
    } catch {
      _user = null;
    }
    _notify();
  }

  async function login(login, password) {
    const { user } = await API.login({ login, password });
    _user = user;
    _notify();
    return user;
  }

  async function register(username, display_name, email, password) {
    const { user } = await API.register({ username, display_name, email, password });
    _user = user;
    _notify();
    return user;
  }

  async function logout() {
    await API.logout();
    _user = null;
    _notify();
  }

  async function updateProfile(display_name, bio) {
    const { profile } = await API.updateProfile({ display_name, bio });
    _user = { ..._user, display_name: profile.display_name, bio: profile.bio };
    _notify();
    return _user;
  }

  return { init, login, register, logout, updateProfile, getUser, isLoggedIn, onChange };
})();
