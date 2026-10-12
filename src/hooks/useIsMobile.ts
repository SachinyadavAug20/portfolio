import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 767px)";

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

/**
 * Reactive mobile-viewport flag (<768px — same breakpoint as the bottom
 * tab bar and the vertical timeline). Stays correct on rotate/resize.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

/** Sync read for non-React contexts. */
export function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia(QUERY).matches;
}
