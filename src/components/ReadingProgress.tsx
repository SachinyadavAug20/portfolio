import { useEffect, useRef, useState } from "react";

const ReadingProgress = () => {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(0);
  const lastRef = useRef(-1);

  useEffect(() => {
    const update = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const el = document.querySelector(".blog-content");
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const total = el.scrollHeight - window.innerHeight;
        if (total <= 0) return;
        const scrolled = -rect.top;
        const pct = Math.round(Math.min(100, Math.max(0, (scrolled / total) * 100)));
        if (pct !== lastRef.current) {
          lastRef.current = pct;
          setProgress(pct);
        }
      });
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[115] h-[3px] bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-blue-500/80 to-cyan-400/80 transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default ReadingProgress;
