import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useReducedMotion } from "./useReducedMotion";

const MAX_PULL = 9;

/**
 * Magnetic hover: the element leans a few pixels toward the cursor and
 * springs back on leave. Fine pointers only (no effect on touch), and
 * fully disabled under prefers-reduced-motion. Returns a ref to attach.
 */
export function useMagnetic<T extends HTMLElement>(strength = 0.18) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;

    const xTo = gsap.quickTo(el, "x", { duration: 0.45, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.45, ease: "power3.out" });

    const clamp = (v: number) => Math.max(-MAX_PULL, Math.min(MAX_PULL, v));

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      xTo(clamp(dx * strength));
      yTo(clamp(dy * strength));
    };
    const leave = () => {
      xTo(0);
      yTo(0);
    };

    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);

    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      gsap.set(el, { x: 0, y: 0 });
    };
  }, [reduced, strength]);

  return ref;
}
