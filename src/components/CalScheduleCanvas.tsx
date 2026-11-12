import { useEffect, useRef, useState, useCallback } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  alpha: number;
  color: string;
}

interface PulseWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

interface CalScheduleCanvasProps {
  accentColor?: string;
  pulseTrigger?: number;
  className?: string;
}

export const CalScheduleCanvas = ({
  accentColor = "#22d3ee",
  pulseTrigger = 0,
  className = "",
}: CalScheduleCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : true,
  );

  const particlesRef = useRef<Particle[]>([]);
  const wavesRef = useRef<PulseWave[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -1000,
    y: -1000,
    active: false,
  });
  const inViewRef = useRef(true);

  // Sync theme
  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Trigger pulse wave on active meeting change
  useEffect(() => {
    if (reduced || pulseTrigger === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = mouseRef.current.active && mouseRef.current.x > 0
      ? mouseRef.current.x - rect.left
      : rect.width / 2;
    const cy = mouseRef.current.active && mouseRef.current.y > 0
      ? mouseRef.current.y - rect.top
      : rect.height / 2;

    wavesRef.current.push({
      x: cx,
      y: cy,
      radius: 5,
      maxRadius: Math.max(rect.width, rect.height) * 0.9,
      alpha: 0.55,
      color: accentColor,
    });
  }, [pulseTrigger, accentColor, reduced]);

  // Viewport intersection observer to avoid rendering offscreen
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
      },
      { threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const initParticles = useCallback(
    (width: number, height: number) => {
      const count = Math.min(Math.floor((width * height) / 18000), 45);
      const colors = isDark
        ? ["#22d3ee", "#38bdf8", "#a855f7", "#34d399", "#818cf8"]
        : ["#6366f1", "#0284c7", "#7c3aed", "#059669"];

      const pts: Particle[] = [];
      for (let i = 0; i < count; i++) {
        const c = colors[Math.floor(Math.random() * colors.length)];
        pts.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: Math.random() * 1.8 + 0.8,
          baseAlpha: Math.random() * 0.35 + 0.15,
          alpha: Math.random() * 0.35 + 0.15,
          color: c,
        });
      }
      particlesRef.current = pts;
    },
    [isDark],
  );

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId = 0;
    let width = 0;
    let height = 0;
    let time = 0;

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles(width, height);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    handleResize();

    const onPointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
    };

    const onPointerLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("mousemove", onPointerMove, { passive: true });
    document.addEventListener("mouseleave", onPointerLeave);

    const render = () => {
      animId = requestAnimationFrame(render);
      if (!inViewRef.current) return;

      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const hasMouse = mouseRef.current.active;

      // 1. Ambient concentric calendar/time pulse rings in center
      const cx = width / 2;
      const cy = height * 0.38;
      const ringCount = 3;
      for (let r = 0; r < ringCount; r++) {
        const progress = (time * 0.2 + r / ringCount) % 1;
        const currentRadius = 60 + progress * Math.min(width, height) * 0.55;
        const ringAlpha = (1 - progress) * (isDark ? 0.08 : 0.04);
        ctx.beginPath();
        ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = ringAlpha;
        ctx.stroke();
      }

      // 2. Dynamic shockwave pulses from meeting changes
      for (let i = wavesRef.current.length - 1; i >= 0; i--) {
        const w = wavesRef.current[i];
        w.radius += 5;
        w.alpha *= 0.95;
        if (w.alpha < 0.01 || w.radius > w.maxRadius) {
          wavesRef.current.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
        ctx.strokeStyle = w.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = w.alpha;
        ctx.stroke();
        ctx.restore();
      }

      // 3. Update & render constellation particles
      const pts = particlesRef.current;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx;
        p.y += p.vy;

        // Bounce at boundaries
        if (p.x < 0) {
          p.x = 0;
          p.vx *= -1;
        } else if (p.x > width) {
          p.x = width;
          p.vx *= -1;
        }
        if (p.y < 0) {
          p.y = 0;
          p.vy *= -1;
        } else if (p.y > height) {
          p.y = height;
          p.vy *= -1;
        }

        // Mouse interaction: soft attraction / repulsion
        if (hasMouse) {
          const dx = mx - p.x;
          const dy = my - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130 && dist > 1) {
            const force = (130 - dist) / 130;
            p.x -= (dx / dist) * force * 1.5;
            p.y -= (dy / dist) * force * 1.5;

            // Connective arc to cursor
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mx, my);
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = force * (isDark ? 0.35 : 0.2);
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // Particle connections
        for (let j = i + 1; j < pts.length; j++) {
          const p2 = pts[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 95) {
            const alpha = (1 - d / 95) * (isDark ? 0.12 : 0.06);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = isDark ? "#38bdf8" : "#94a3b8";
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }

        // Render particle dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = isDark ? p.baseAlpha : p.baseAlpha * 0.7;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener("mousemove", onPointerMove);
      document.removeEventListener("mouseleave", onPointerLeave);
    };
  }, [initParticles, isDark, reduced, accentColor]);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="block size-full"
      />
      {/* Subtle radial vignette gradient to blend seamlessly into container */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.5)_100%)] dark:block hidden" />
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_50%,rgba(255,255,255,0.6)_100%)] dark:hidden block" />
    </div>
  );
};

export default CalScheduleCanvas;
