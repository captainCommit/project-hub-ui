import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useTourStore } from '@/lib/tours';

const NAVY = '#002046';
const ORANGE = '#c87b14';
const CARD_WIDTH = 320;
const GAP = 12;
const PAD = 6;
// How long to wait for a page's data (and so its tour targets) to appear before giving up until the next visit.
const FIND_TRIES = 20;
const FIND_EVERY_MS = 300;
const SETTLE_TRIES = 7;

/** The first visible element marked data-tour="name". */
function findTarget(name) {
  return Array.from(document.querySelectorAll(`[data-tour="${name}"]`)).find((el) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }) || null;
}

/** Where the step card goes: beside a tall target, otherwise below it (or above when there's no room), kept on screen. */
function placeCard(rect, cardHeight) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampX = (x) => Math.min(Math.max(x, 12), vw - CARD_WIDTH - 12);
  const clampY = (y) => Math.min(Math.max(y, 12), vh - cardHeight - 12);
  if (!rect) return { left: (vw - CARD_WIDTH) / 2, top: Math.max(12, (vh - cardHeight) / 2) };
  if (rect.height > vh * 0.45) {
    if (rect.right + GAP + CARD_WIDTH < vw) return { left: rect.right + GAP, top: clampY(rect.top + 24) };
    if (rect.left - GAP - CARD_WIDTH > 0) return { left: rect.left - GAP - CARD_WIDTH, top: clampY(rect.top + 24) };
    return { left: clampX(rect.left + 24), top: clampY(rect.top + 24) };
  }
  const below = rect.bottom + PAD + GAP;
  const top = below + cardHeight < vh ? below : rect.top - PAD - GAP - cardHeight;
  return { left: clampX(rect.left), top: clampY(top) };
}

/**
 * Shows a module's first-time tour once per person (see src/lib/tours.js).
 * tour: { id, steps: [{ target?, title, body }] }. Steps whose target isn't on the page are left out;
 * a step without a target is a centred card. enabled: false while the page isn't ready for it.
 */
export default function Tour({ tour, enabled = true }) {
  const { user } = useAuth();
  const store = useTourStore();
  const [steps, setSteps] = useState(/** @type {any[] | null} */ (null));
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(/** @type {DOMRect | null} */ (null));
  const [cardPos, setCardPos] = useState({ left: -9999, top: -9999 });
  const cardRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  const seen = !user || store.isSeen(user, tour.id);
  const waiting = enabled && !seen && !steps && (!store.active || store.active === tour.id);

  // Wait for the page to draw the targets, then take the tour slot.
  useEffect(() => {
    if (!waiting) return undefined;
    let tries = 0;
    let firstFoundAt = 0;
    const timer = setInterval(() => {
      tries += 1;
      const present = tour.steps.filter(step => !step.target || findTarget(step.target));
      const anyTargeted = present.some(step => step.target);
      if (anyTargeted && !firstFoundAt) firstFoundAt = tries;
      // Cards that wait for data appear a moment after the page; give them a little longer before starting without them.
      const settled = present.length === tour.steps.length || (firstFoundAt && tries - firstFoundAt >= SETTLE_TRIES);
      if (settled || tries >= FIND_TRIES) {
        clearInterval(timer);
        if (anyTargeted && store.claim(tour.id)) { setIndex(0); setSteps(present); }
      }
    }, FIND_EVERY_MS);
    return () => clearInterval(timer);
  }, [waiting, tour, store]);

  const step = steps?.[index];
  const close = useCallback(() => {
    setSteps(null);
    store.finish(tour.id);
  }, [store, tour.id]);

  // Follow the target as the page scrolls, resizes or reflows.
  useEffect(() => {
    if (!step) return undefined;
    const target = step.target ? findTarget(step.target) : null;
    target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const measure = () => setRect(target ? target.getBoundingClientRect() : null);
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    const timer = setInterval(measure, 400);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      clearInterval(timer);
    };
  }, [step]);

  useLayoutEffect(() => {
    if (step) setCardPos(placeCard(rect, cardRef.current?.offsetHeight || 180));
  }, [step, rect]);

  useEffect(() => {
    if (!step) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight' || e.key === 'Enter') setIndex(i => Math.min(i + 1, steps.length - 1));
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, steps, close]);

  if (!step || store.active !== tour.id) return null;
  const last = index === steps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={step.title}>
      {/* Blocks clicks on the page while the tour is open; the spotlight's shadow dims everything but the target. */}
      <div className="absolute inset-0" style={rect ? undefined : { background: 'rgba(0,32,70,0.55)' }} />
      {rect && (
        <div className="absolute rounded-xl pointer-events-none transition-all duration-200"
          style={{
            left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2,
            boxShadow: `0 0 0 9999px rgba(0,32,70,0.55), 0 0 0 2px ${ORANGE}`,
          }} />
      )}
      <div ref={cardRef} className="absolute bg-white rounded-xl shadow-2xl border border-slate-200 p-4"
        style={{ width: CARD_WIDTH, left: cardPos.left, top: cardPos.top }}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] font-semibold leading-snug" style={{ color: NAVY }}>{step.title}</p>
          <button type="button" onClick={close} className="text-slate-400 hover:text-slate-600 -mr-1 -mt-0.5" aria-label="Close tour">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{step.body}</p>
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-slate-400">{steps.length > 1 ? `${index + 1} of ${steps.length}` : ''}</span>
          <div className="flex items-center gap-2">
            {!last && <button type="button" onClick={close} className="text-xs text-slate-500 hover:text-slate-700 px-1">Skip tour</button>}
            {index > 0 && (
              <button type="button" onClick={() => setIndex(i => i - 1)}
                className="h-8 px-3 rounded-md border border-slate-200 text-sm text-slate-700 hover:bg-slate-50">Back</button>
            )}
            <button type="button" onClick={() => (last ? close() : setIndex(i => i + 1))}
              className="h-8 px-3 rounded-md text-sm font-semibold text-white hover:opacity-90" style={{ backgroundColor: ORANGE }}>
              {last ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
