// Navigation entre les écrans (compatible avec le bouton « retour » d'Android).
import { stopSpeaking } from './speech.js';

const screens = {};
let current = null;
let app = null;

export function register(name, fn) {
  screens[name] = fn;
}

export function init(root) {
  app = root;
  window.addEventListener('popstate', (e) => {
    const st = e.state || { name: 'profiles', params: {} };
    render(st.name, st.params || {});
  });
}

function render(name, params) {
  if (current && current.destroy) {
    try {
      current.destroy();
    } catch (err) {
      console.error(err);
    }
  }
  stopSpeaking();
  document.querySelectorAll('.modal-back').forEach((m) => m.remove());
  app.innerHTML = '';
  app.className = 'screen-' + name;
  const fn = screens[name] || screens.profiles;
  const res = fn(app, params) || {};
  current = { name, params, destroy: res.destroy };
  window.scrollTo(0, 0);
}

export function go(name, params = {}, { replace = false } = {}) {
  const st = { name, params };
  if (replace) history.replaceState(st, '');
  else history.pushState(st, '');
  render(name, params);
}

// Retour arrière (ou vers `fallback` si on est arrivé directement sur l'écran).
export function back(fallback = 'hub', params = {}) {
  if (history.state && history.length > 1 && history.state.name !== 'profiles') history.back();
  else go(fallback, params, { replace: true });
}

export function start(name, params = {}) {
  history.replaceState({ name, params }, '');
  render(name, params);
}
