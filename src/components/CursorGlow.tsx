import { useEffect, useRef } from "react";

const SIZE = 200;

const CursorGlow = () => {
  const blobRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: -SIZE, y: -SIZE });
  const glow = useRef({ x: -SIZE, y: -SIZE });
  const raf = useRef(0);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      if (blobRef.current) blobRef.current.style.opacity = "1";
    };

    const handleLeave = () => {
      if (blobRef.current) blobRef.current.style.opacity = "0";
    };

    let prev = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - prev) / 16.667, 3);
      prev = now;

      const g = glow.current;
      const m = mouse.current;

      g.x += (m.x - g.x) * 0.08 * dt;
      g.y += (m.y - g.y) * 0.08 * dt;

      if (blobRef.current) {
        blobRef.current.style.transform = `translate(${g.x - SIZE / 2}px, ${g.y - SIZE / 2}px)`;
      }
      raf.current = requestAnimationFrame(tick);
    };

    document.addEventListener("pointermove", handleMove, { passive: true });
    document.addEventListener("pointerleave", handleLeave);
    raf.current = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerleave", handleLeave);
      cancelAnimationFrame(raf.current);
    };
  }, []);

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
