import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

const SIZE = 200;

const CursorGlow = () => {
  const blobRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: -SIZE, y: -SIZE });
  const glow = useRef({ x: -SIZE, y: -SIZE });
  const raf = useRef(0);
  const running = useRef(false);
  const prev = useRef(0);
  const [coarse] = useState(() =>
    window.matchMedia("(pointer: coarse)").matches,
  );
  const reduced = useReducedMotion();

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches || reduced) return;

    const tick = (now: number) => {
      const dt = Math.min((now - prev.current) / 16.667, 3);
      prev.current = now;

      const g = glow.current;
      const m = mouse.current;

      g.x += (m.x - g.x) * 0.08 * dt;
      g.y += (m.y - g.y) * 0.08 * dt;

      if (blobRef.current) {
        blobRef.current.style.transform = `translate(${g.x - SIZE / 2}px, ${g.y - SIZE / 2}px)`;
      }

      // Idle early-out: stop rAF once converged to free the main thread.
      if (Math.abs(m.x - g.x) < 0.5 && Math.abs(m.y - g.y) < 0.5) {
        running.current = false;
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running.current) return;
      running.current = true;
      prev.current = performance.now();
      raf.current = requestAnimationFrame(tick);
    };

    const handleMove = (e: PointerEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      if (blobRef.current) blobRef.current.style.opacity = "1";
      start();
    };

    const handleLeave = () => {
      if (blobRef.current) blobRef.current.style.opacity = "0";
    };

    document.addEventListener("pointermove", handleMove, { passive: true });
    document.addEventListener("pointerleave", handleLeave);

    return () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerleave", handleLeave);
      if (raf.current) cancelAnimationFrame(raf.current);
      running.current = false;
    };
  }, [reduced]);

  if (coarse || reduced) return null;

  /* SIZE must stay in sync with --glow-size: the translate math centers
     the blob; visuals (color/alpha) come from the themeable tokens. */
  return (
    <div ref={blobRef} aria-hidden className="cursor-glow" />
  );
};

export default CursorGlow;
