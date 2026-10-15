import { useEffect, useState } from 'react';

// Light or dark appearance, chosen per browser in Settings > Appearance. "system" follows the OS setting.
// index.html applies the saved choice before the app loads, so dark mode doesn't flash white first.

const STORAGE_KEY = 'app_theme';
const CHANGE_EVENT = 'app-theme-changed';
export const THEME_OPTIONS = ['light', 'dark', 'system'];

const systemQuery = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null);

export function getThemePreference() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return THEME_OPTIONS.includes(saved) ? saved : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(preference = getThemePreference()) {
  const dark = preference === 'dark' || (preference === 'system' && Boolean(systemQuery()?.matches));
  document.documentElement.classList.toggle('dark', dark);
}

export function setThemePreference(preference) {
  try { localStorage.setItem(STORAGE_KEY, preference); } catch {}
  applyTheme(preference);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Keeps the page in step with the OS when the choice is "system". Call once at startup. */
export function watchSystemTheme() {
  const query = systemQuery();
  if (!query) return;
  query.addEventListener('change', () => { if (getThemePreference() === 'system') applyTheme('system'); });
  window.addEventListener('storage', (event) => { if (event.key === STORAGE_KEY) applyTheme(); });
}

export function useThemePreference() {
  const [preference, setPreference] = useState(getThemePreference);
  useEffect(() => {
    const onChange = () => setPreference(getThemePreference());
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);
  return [preference, setThemePreference];
}
