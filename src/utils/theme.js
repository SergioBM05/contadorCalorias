import { useSyncExternalStore } from 'react';

// Preferencia de tema: 'system' | 'light' | 'dark' (index.html aplica la inicial sin parpadeo)
const KEY = 'theme';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

export const getThemePref = () => localStorage.getItem(KEY) || 'system';

export const applyTheme = (pref = getThemePref()) => {
  const dark = pref === 'dark' || (pref === 'system' && media().matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#090a0f' : '#f6f5f8');
};

export const setThemePref = (pref) => {
  localStorage.setItem(KEY, pref);
  applyTheme(pref);
};

/** Sigue los cambios del sistema mientras la preferencia sea 'system'. */
export const watchSystemTheme = () => {
  const mq = media();
  const onChange = () => getThemePref() === 'system' && applyTheme('system');
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};

// ---- Hook: tema resuelto actual ('light' | 'dark'), reactivo a cambios de data-theme ----

const subscribe = (cb) => {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => obs.disconnect();
};

export const useResolvedTheme = () =>
  useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme || 'light');
