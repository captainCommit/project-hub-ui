import { useEffect, useState } from 'react';

// Light or dark appearance, chosen per browser in Settings > Appearance. (An old "system" choice reads as light.)
// index.html applies the saved choice before the app loads, so dark mode doesn't flash white first.

const STORAGE_KEY = 'app_theme';
const CHANGE_EVENT = 'app-theme-changed';
export const THEME_OPTIONS = ['light', 'dark'];

export function getThemePreference() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return THEME_OPTIONS.includes(saved) ? saved : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(preference = getThemePreference()) {
  document.documentElement.classList.toggle('dark', preference === 'dark');
}

export function setThemePreference(preference) {
  try { localStorage.setItem(STORAGE_KEY, preference); } catch {}
  applyTheme(preference);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Keeps this tab in step when the choice changes in another tab. Call once at startup. */
export function watchSystemTheme() {
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
