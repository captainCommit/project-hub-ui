import { useState, useEffect } from 'react';

const KEY = 'sidebar_favorites';

export const FAVORITE_CATEGORIES = [
  { type: 'portfolio', label: 'Portfolios', link: '/Projects' },
  { type: 'program', label: 'Programs', link: '/Projects' },
  { type: 'project', label: 'Projects', link: '/Projects' },
  { type: 'requirement', label: 'Requirements', link: '/Requirements' },
  { type: 'testcase', label: 'Testing', link: '/Testing' },
  { type: 'sprint', label: 'Sprint Management', link: '/SprintManagement' },
];

export function getFavorites() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function isFavorite(type, id) {
  return getFavorites().some(f => f.type === type && f.id === id);
}

export function toggleFavorite(item) {
  const current = getFavorites();
  const exists = current.some(f => f.type === item.type && f.id === item.id);
  const next = exists
    ? current.filter(f => !(f.type === item.type && f.id === item.id))
    : [...current, { id: item.id, name: item.name, type: item.type, color: item.color }];
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('favorites-changed'));
  return !exists;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(getFavorites);
  useEffect(() => {
    const onChange = () => setFavorites(getFavorites());
    window.addEventListener('favorites-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('favorites-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);
  const isFav = (type, id) => favorites.some(f => f.type === type && f.id === id);
  const toggle = (item) => toggleFavorite(item);
  return { favorites, isFav, toggle };
}