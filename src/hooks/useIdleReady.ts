import { useEffect, useState } from "react";

/**
 * True once the browser has had a moment after first paint — use it to
 * defer heavy mounts (3D scenes, the cat companion) off the critical path.
 * Falls back to a short timeout where requestIdleCallback is missing.
 */
export const useIdleReady = (timeout = 1200): boolean => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let done = false;
    const mark = () => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };
    const w = window as Window & {
      requestIdleCallback?: (
        cb: () => void,
        opts?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let id: number;
    if (w.requestIdleCallback) {
      id = w.requestIdleCallback(mark, { timeout });
    } else {
      id = window.setTimeout(mark, Math.min(timeout, 600));
    }
    return () => {
      done = true;
      w.cancelIdleCallback?.(id);
      window.clearTimeout(id);
    };
  }, [timeout]);
  return ready;
};
