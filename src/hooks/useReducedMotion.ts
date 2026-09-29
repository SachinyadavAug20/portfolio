import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

/**
 * Reactive prefers-reduced-motion flag. Unlike a one-shot
 * `matchMedia(...).matches` read inside useMemo/useEffect, this stays
 * correct when the OS setting flips while the app is running.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

/** Sync read for non-React contexts (gsap callbacks, rAF loops). */
export function isReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(QUERY).matches;
}
