import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

// Per-person UI preferences, kept in this browser's localStorage under the signed-in user's id
// so people sharing a machine don't inherit each other's settings.

const CHANGE_EVENT = 'user-prefs-changed';
const storageKey = (userId, key) => `user_pref:${userId || 'anon'}:${key}`;

export function readUserPref(userId, key, fallback) {
  try {
    const raw = localStorage.getItem(storageKey(userId, key));
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeUserPref(userId, key, value) {
  try { localStorage.setItem(storageKey(userId, key), JSON.stringify(value)); } catch {}
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { userId, key } }));
}

export function useUserPref(key, fallback) {
  const { user } = useAuth();
  const userId = /** @type {any} */ (user)?.id;
  const [value, setValue] = useState(() => readUserPref(userId, key, fallback));

  useEffect(() => {
    setValue(readUserPref(userId, key, fallback));
    const onChange = (/** @type {any} */ e) => {
      if (e.type === 'storage' || (e.detail?.userId === userId && e.detail?.key === key)) {
        setValue(readUserPref(userId, key, fallback));
      }
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
    // fallback is a default, not an input; re-reading on its identity would loop for object literals.
  }, [userId, key]);

  const update = useCallback((next) => {
    const resolved = typeof next === 'function' ? next(readUserPref(userId, key, fallback)) : next;
    writeUserPref(userId, key, resolved);
  }, [userId, key]);

  return [value, update];
}
