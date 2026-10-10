import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap, ScrollTrigger } from "./gsapSetup";
import { isReducedMotion } from "../hooks/useReducedMotion";

let lenis: Lenis | null = null;
let mql: MediaQueryList | null = null;

function onPrefChange() {
  if (isReducedMotion()) destroySmoothScroll();
  else initSmoothScroll();
}

/** Idempotent. Skipped under reduced motion; tracks OS flips live. */
export function initSmoothScroll() {
  if (lenis || typeof window === "undefined") return;
  if (isReducedMotion()) {
    mql ??= window.matchMedia("(prefers-reduced-motion: reduce)");
    mql.addEventListener("change", onPrefChange);
    return;
  }
  lenis = new Lenis({ duration: 1.1 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
}

function raf(time: number) {
  lenis?.raf(time * 1000);
}

export function destroySmoothScroll() {
  gsap.ticker.remove(raf);
  lenis?.destroy();
  lenis = null;
}

/** Re-measure the page. Call after a route swap: Lenis caches its scroll
 *  limit, so navigating from a short page (e.g. /links) to a tall one
 *  would otherwise clamp scrollTo targets to the old limit. */
export function refreshSmoothScroll() {
  lenis?.resize();
}

/** Smooth scroll to a Y offset (falls back to native when Lenis is off). */
export function scrollToY(top: number, immediate = false) {
  if (lenis) {
    lenis.scrollTo(top, { immediate, duration: immediate ? undefined : 0.9 });
    return;
  }
  window.scrollTo({ top, behavior: immediate || isReducedMotion() ? "auto" : "smooth" });
}
