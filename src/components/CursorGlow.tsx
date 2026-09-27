import { useEffect, useRef, useState } from "react";

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

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

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
  }, []);

  if (coarse) return null;

  return (
    <div
      ref={blobRef}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: SIZE,
        height: SIZE,
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: -1,
        opacity: 0,
        willChange: "transform",
        background:
          "radial-gradient(circle, rgba(180,50,255,0.15) 0%, rgba(120,20,180,0.06) 50%, transparent 70%)",
        border: "1px solid rgba(180,50,255,0.2)",
      }}
    />
  );
};

export default CursorGlow;
