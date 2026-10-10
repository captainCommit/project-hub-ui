import { useEffect, useState, useSyncExternalStore } from 'react';
import { Loader2 } from 'lucide-react';
import { getApiActivity, subscribeApiActivity } from '@/api/client';

// Wait before showing anything so fast requests don't flash the indicators.
const SHOW_DELAY_MS = 200;

const useDelayedFlag = (active) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!active) {
      setVisible(false);
      return undefined;
    }
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active]);
  return visible;
};

/** App-wide loading feedback: a top progress bar for any API call and a "Saving…" pill for writes. */
export default function GlobalLoader() {
  const { reads, writes } = useSyncExternalStore(subscribeApiActivity, getApiActivity);
  const showBar = useDelayedFlag(reads + writes > 0);
  const showSaving = useDelayedFlag(writes > 0);

  return (
    <>
      {showBar && (
        <div className="fixed top-0 inset-x-0 z-[100] h-0.5 overflow-hidden bg-[#c87b14]/20 pointer-events-none" role="progressbar" aria-label="Loading">
          <div className="h-full w-1/3 bg-[#c87b14] animate-global-loader" />
        </div>
      )}
      {showSaving && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-full bg-[#002046] px-4 py-2 text-xs font-medium text-white shadow-lg pointer-events-none" role="status" aria-live="polite">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
        </div>
      )}
    </>
  );
}
