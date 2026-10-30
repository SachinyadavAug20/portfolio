import { useEffect, useRef, useState, useCallback } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { tap } from "../lib/haptics";

export type CanvasMode = "constellation" | "cyber-mesh" | "particle-swarm";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  color: string;
  alpha: number;
  angle?: number;
  speed?: number;
  orbitRadius?: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  speed: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
  decay: number;
}

export const InteractiveLinksCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<CanvasMode>("constellation");
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : true,
  );

  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const mouseRef = useRef<{ x: number; y: number; active: boolean; moved: boolean }>({
    x: -1000,
    y: -1000,
    active: false,
    moved: false,
  });
  const animFrameId = useRef<number>(0);
  const dimensionsRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 0,
    height: 0,
    dpr: 1,
  });

  // Track dark mode changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Initialize particles based on canvas size and current mode
  const initParticles = useCallback(
    (w: number, h: number, currentMode: CanvasMode, dark: boolean) => {
      const particles: Particle[] = [];
      const count =
        currentMode === "particle-swarm"
          ? Math.min(100, Math.floor((w * h) / 10000))
          : Math.min(75, Math.floor((w * h) / 14000));

      const colors = dark
        ? ["#38bdf8", "#34d399", "#818cf8", "#f472b6", "#e2e8f0"]
        : ["#2563eb", "#059669", "#7c3aed", "#db2777", "#475569"];

      for (let i = 0; i < count; i++) {
        const radius = Math.random() * 1.8 + 1.2;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.7 + 0.3;
        const orbitRadius = Math.random() * Math.min(w, h) * 0.45 + 40;

        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.9,
          vy: (Math.random() - 0.5) * 0.9,
          radius,
          baseRadius: radius,
          color,
          alpha: Math.random() * 0.55 + 0.35,
          angle,
          speed,
          orbitRadius,
        });
      }
      particlesRef.current = particles;
    },
    [],
  );

  // Trigger shockwave & sparks on click or touch
  const triggerBurst = useCallback(
    (x: number, y: number) => {
      tap(10);
      const primaryColor = isDark ? "#38bdf8" : "#2563eb";
      const accentColor = isDark ? "#34d399" : "#059669";

      // Add 2 concentric shockwave rings
      shockwavesRef.current.push(
        {
          x,
          y,
          radius: 4,
          maxRadius: Math.min(window.innerWidth, window.innerHeight) * 0.42,
          alpha: 0.85,
          color: primaryColor,
          speed: 7.5,
        },
        {
          x,
          y,
          radius: 2,
          maxRadius: Math.min(window.innerWidth, window.innerHeight) * 0.3,
          alpha: 0.65,
          color: accentColor,
          speed: 5.5,
        },
      );

      // Add sparks explosion
      const sparkCount = 18;
      const sparkColors = isDark
        ? ["#38bdf8", "#34d399", "#a78bfa", "#fbcfe8", "#ffffff"]
        : ["#2563eb", "#059669", "#7c3aed", "#be185d", "#1e293b"];

      for (let i = 0; i < sparkCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2.5;
        sparksRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          size: Math.random() * 2.5 + 1.2,
          color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
          decay: Math.random() * 0.025 + 0.015,
        });
      }
    },
    [isDark],
  );

  // Main canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dimensionsRef.current = { width: w, height: h, dpr };

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      initParticles(w, h, mode, isDark);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const onPointerMove = (e: PointerEvent) => {
      mouseRef.current = {
        x: e.clientX,
        y: e.clientY,
        active: true,
        moved: true,
      };
    };

    const onPointerLeave = () => {
      mouseRef.current.active = false;
    };

    const onPointerDown = (e: PointerEvent) => {
      // If clicking directly on an active button or link, let it bubble, but still burst on backdrop
      triggerBurst(e.clientX, e.clientY);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("pointerdown", onPointerDown, { passive: true });

    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const { width: w, height: h } = dimensionsRef.current;
      ctx.clearRect(0, 0, w, h);

      if (reduced) {
        // Render calm stationary dots if reduced motion preferred
        particlesRef.current.slice(0, 25).forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.baseRadius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = 0.25;
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        return;
      }

      const mouse = mouseRef.current;
      const particles = particlesRef.current;

      // 1. RENDER BASED ON MODE
      if (mode === "constellation") {
        // Draw connection lines between nearby particles
        const maxDist = 110;
        const maxDistSq = maxDist * maxDist;

        for (let i = 0; i < particles.length; i++) {
          const p1 = particles[i];

          // Proximity to mouse
          if (mouse.active) {
            const dx = mouse.x - p1.x;
            const dy = mouse.y - p1.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 180 * 180) {
              const dist = Math.sqrt(distSq);
              const force = (1 - dist / 180) * 1.5;
              p1.vx += (dx / dist) * force * 0.15;
              p1.vy += (dy / dist) * force * 0.15;

              // Draw line to mouse
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(mouse.x, mouse.y);
              ctx.strokeStyle = isDark ? "rgba(56, 189, 248, 0.28)" : "rgba(37, 99, 235, 0.22)";
              ctx.lineWidth = 0.9;
              ctx.stroke();
            }
          }

          // Connect to other particles
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < maxDistSq) {
              const dist = Math.sqrt(distSq);
              const alpha = (1 - dist / maxDist) * 0.32;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = isDark
                ? `rgba(148, 163, 184, ${alpha * 0.85})`
                : `rgba(71, 85, 105, ${alpha * 0.75})`;
              ctx.lineWidth = 0.65;
              ctx.stroke();
            }
          }

          // Update position & bounce
          p1.x += p1.vx;
          p1.y += p1.vy;
          p1.vx *= 0.985;
          p1.vy *= 0.985;

          // Gentle base drift
          if (Math.abs(p1.vx) < 0.2) p1.vx += (Math.random() - 0.5) * 0.1;
          if (Math.abs(p1.vy) < 0.2) p1.vy += (Math.random() - 0.5) * 0.1;

          if (p1.x < 0) { p1.x = 0; p1.vx *= -1; }
          if (p1.x > w) { p1.x = w; p1.vx *= -1; }
          if (p1.y < 0) { p1.y = 0; p1.vy *= -1; }
          if (p1.y > h) { p1.y = h; p1.vy *= -1; }

          // Draw node
          ctx.beginPath();
          ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
          ctx.fillStyle = p1.color;
          ctx.globalAlpha = p1.alpha;
          ctx.fill();
        }
      } else if (mode === "cyber-mesh") {
        // Draw 3D undulating grid responsive to cursor
        const gridSize = 46;
        const cols = Math.ceil(w / gridSize) + 1;
        const rows = Math.ceil(h / gridSize) + 1;

        ctx.strokeStyle = isDark ? "rgba(56, 189, 248, 0.08)" : "rgba(37, 99, 235, 0.08)";
        ctx.lineWidth = 0.75;

        for (let r = 0; r <= rows; r++) {
          ctx.beginPath();
          for (let c = 0; c <= cols; c++) {
            let px = c * gridSize;
            let py = r * gridSize;

            // Ripple deformation around mouse
            if (mouse.active) {
              const dx = px - mouse.x;
              const dy = py - mouse.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 220) {
                const bend = Math.sin(dist * 0.06 - now * 0.005) * (1 - dist / 220) * 14;
                px += (dx / (dist || 1)) * bend;
                py += (dy / (dist || 1)) * bend;
              }
            }

            if (c === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }

        // Draw active intersection points
        particles.slice(0, 35).forEach((p) => {
          p.x += p.vx * 0.5;
          p.y += p.vy * 0.5;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;

          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? "#38bdf8" : "#2563eb";
          ctx.globalAlpha = 0.5;
          ctx.fill();
        });
      } else if (mode === "particle-swarm") {
        // Swarm orbiting around center or mouse attractor
        const centerX = mouse.active ? mouse.x : w / 2;
        const centerY = mouse.active ? mouse.y : h / 2;

        particles.forEach((p, idx) => {
          p.angle = (p.angle || 0) + (p.speed || 0.5) * dt * (idx % 2 === 0 ? 1 : -1);
          const orbit = p.orbitRadius || 120;
          const targetX = centerX + Math.cos(p.angle) * orbit;
          const targetY = centerY + Math.sin(p.angle * 1.3) * (orbit * 0.75);

          p.x += (targetX - p.x) * 0.08;
          p.y += (targetY - p.y) * 0.08;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fill();
        });
      }

      // 2. RENDER SHOCKWAVES
      for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
        const sw = shockwavesRef.current[i];
        sw.radius += sw.speed;
        sw.alpha *= 0.94;

        // Repel particles touching this shockwave
        particles.forEach((p) => {
          const dx = p.x - sw.x;
          const dy = p.y - sw.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (Math.abs(dist - sw.radius) < 28) {
            const push = (1 - sw.radius / sw.maxRadius) * 4;
            p.vx += (dx / (dist || 1)) * push;
            p.vy += (dy / (dist || 1)) * push;
          }
        });

        if (sw.alpha <= 0.02 || sw.radius >= sw.maxRadius) {
          shockwavesRef.current.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = Math.max(1, (1 - sw.radius / sw.maxRadius) * 2.8);
        ctx.globalAlpha = sw.alpha;
        ctx.stroke();
      }

      // 3. RENDER SPARKS
      for (let i = sparksRef.current.length - 1; i >= 0; i--) {
        const sp = sparksRef.current[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vx *= 0.96;
        sp.vy *= 0.96;
        sp.alpha -= sp.decay;

        if (sp.alpha <= 0) {
          sparksRef.current.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fillStyle = sp.color;
        ctx.globalAlpha = sp.alpha;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId.current);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [mode, isDark, reduced, initParticles, triggerBurst]);

  const switchMode = (newMode: CanvasMode) => {
    tap(12);
    setMode(newMode);
  };

  return (
    <>
      {/* High-Performance Canvas Canvas Layer */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0"
      />

      {/* Tasteful Canvas Control Bar */}
      <div className="flex items-center justify-center mt-3 mb-6 relative z-10">
        <div className="inline-flex items-center gap-1.5 p-1 rounded-full border border-black-50 bg-black-100/90 shadow-md backdrop-blur-sm text-xs font-mono">
          <span className="hidden sm:inline-block px-2.5 py-0.5 text-white-50/60 font-semibold tracking-wider uppercase text-[10px]">
            ✦ Canvas:
          </span>

          <button
            type="button"
            onClick={() => switchMode("constellation")}
            className={`px-3 py-1 rounded-full transition-all duration-150 ${
              mode === "constellation"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 font-medium"
                : "text-white-50/70 hover:text-foreground"
            }`}
          >
            Constellation
          </button>

          <button
            type="button"
            onClick={() => switchMode("cyber-mesh")}
            className={`px-3 py-1 rounded-full transition-all duration-150 ${
              mode === "cyber-mesh"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 font-medium"
                : "text-white-50/70 hover:text-foreground"
            }`}
          >
            Cyber Mesh
          </button>

          <button
            type="button"
            onClick={() => switchMode("particle-swarm")}
            className={`px-3 py-1 rounded-full transition-all duration-150 ${
              mode === "particle-swarm"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 font-medium"
                : "text-white-50/70 hover:text-foreground"
            }`}
          >
            Swarm
          </button>
        </div>
      </div>
    </>
  );
};

export default InteractiveLinksCanvas;
