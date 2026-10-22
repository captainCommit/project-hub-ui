import { useEffect, useRef, useState } from 'react';

/**
 * Tracks whether a scroll container overflows vertically, so it can pad its content away from the scrollbar
 * only while the scrollbar shows. Pass what the container renders (e.g. its items) so it re-checks when that
 * changes; resizes are picked up on their own.
 */
export function useScrollGutter(content) {
  const ref = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const check = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    check();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [content]);

  return [ref, overflowing];
}
