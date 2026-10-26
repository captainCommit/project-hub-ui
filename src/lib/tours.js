import { useSyncExternalStore } from 'react';
import { authApi } from '@/api/auth';

// First-time tours. Each module defines its own tour next to its page (Home.tour.js, RiskLog.tour.js, ...) as
// { id, steps: [{ target?, title, body }] }, where target is a data-tour="..." name on an element of that page.
// Which tours a person has seen is kept on their user record (seen_tours), so a tour shows once per person, not
// once per browser. Only one tour runs at a time; the others wait until it's done.

let activeTourId = null;
// Marked here straight away, so a tour doesn't come back before the API answers.
let seenHere = new Set();
let version = 0;
const listeners = new Set();

const emit = () => {
  version += 1;
  listeners.forEach(listener => listener());
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const tourStore = {
  get active() { return activeTourId; },
  isSeen: (user, tourId) => seenHere.has(tourId) || (user?.seen_tours || []).includes(tourId),
  /** Take the one tour slot; false while another tour is showing. */
  claim(tourId) {
    if (activeTourId && activeTourId !== tourId) return false;
    if (activeTourId !== tourId) { activeTourId = tourId; emit(); }
    return true;
  },
  /** The tour was finished or skipped: remember it and let the next waiting tour start. */
  finish(tourId) {
    seenHere.add(tourId);
    if (activeTourId === tourId) activeTourId = null;
    emit();
    authApi.markTourSeen(tourId).catch(() => {});
  },
  /** Show every tour again (Help Center). refreshUser reloads seen_tours afterwards. */
  async reset(refreshUser) {
    await authApi.resetTours();
    seenHere = new Set();
    activeTourId = null;
    await refreshUser?.();
    emit();
  },
};

/** Re-renders when a tour starts, finishes or the tours are reset. */
export function useTourStore() {
  useSyncExternalStore(subscribe, () => version);
  return tourStore;
}
