import { useState, useRef, useEffect } from "react";
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import type { Project } from "../lib/projects";
import { tap } from "../lib/haptics";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface ProjectCardProps {
  project: Project;
  isTop?: boolean;
}

// Subtle accent hues for interactive canvas glow
const THEMES: Record<string, { primary: string; rgb: string }> = {
  "ccltce-platform": { primary: "#10b981", rgb: "16, 185, 129" },
  "samtagon-site": { primary: "#f59e0b", rgb: "245, 158, 11" },
  "cli-ai-agent": { primary: "#8b5cf6", rgb: "139, 92, 246" },
  "horizon-banking": { primary: "#0ea5e9", rgb: "14, 165, 233" },
  "basecase-qa": { primary: "#10b981", rgb: "16, 185, 129" },
  "termdeck-cli": { primary: "#22c55e", rgb: "34, 197, 94" },
};

export const ProjectCard = ({ project, isTop = false }: ProjectCardProps) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  const theme = THEMES[project.id] ?? {
    primary: "#3b82f6",
    rgb: "59, 130, 246",
  };

  const images =
    project.images && project.images.length > 0
      ? project.images
      : [{ src: project.image, caption: project.title }];

  const currentImage = images[activeImageIndex] || images[0];

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    tap(6);
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    tap(6);
    setActiveImageIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1,
    );
  };

  // Modern HTML5 Canvas Effect: Subtle reactive ambient backdrop
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    const card = cardRef.current;
    if (!canvas || !card) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId = 0;
    let width = 0;
    let height = 0;
    let mouseX = -1000;
    let mouseY = -1000;
    let currentX = -1000;
    let currentY = -1000;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
    }> = [];

    const resize = () => {
      const rect = card.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      particles.length = 0;
      const count = Math.floor((width * height) / 18000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          size: Math.random() * 1.5 + 0.5,
          alpha: Math.random() * 0.3 + 0.08,
        });
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(card);
    resize();

    let isHovered = false;
    let idleCountdown = 0;
    let isDrawing = false;

    const startDraw = () => {
      if (isDrawing) return;
      isDrawing = true;
      animId = requestAnimationFrame(draw);
    };

    const stopDraw = () => {
      isDrawing = false;
      if (animId) {
        cancelAnimationFrame(animId);
        animId = 0;
      }
      ctx.clearRect(0, 0, width, height);
    };

    const onPointerEnter = () => {
      isHovered = true;
      idleCountdown = 45;
      startDraw();
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      isHovered = true;
      idleCountdown = 45;
      startDraw();
    };

    const onPointerLeave = () => {
      isHovered = false;
      mouseX = -1000;
      mouseY = -1000;
    };

    card.addEventListener("pointerenter", onPointerEnter, { passive: true });
    card.addEventListener("pointermove", onPointerMove, { passive: true });
    card.addEventListener("pointerleave", onPointerLeave, { passive: true });

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth pointer glow
      if (mouseX > -500) {
        currentX += (mouseX - currentX) * 0.15;
        currentY += (mouseY - currentY) * 0.15;
        const grad = ctx.createRadialGradient(
          currentX,
          currentY,
          0,
          currentX,
          currentY,
          160,
        );
        grad.addColorStop(0, `rgba(${theme.rgb}, 0.14)`);
        grad.addColorStop(1, `rgba(${theme.rgb}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // Draw subtle particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.fillStyle = `rgba(${theme.rgb}, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!isHovered) {
        idleCountdown--;
        if (idleCountdown <= 0) {
          stopDraw();
          return;
        }
      }

      animId = requestAnimationFrame(draw);
    };

    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        stopDraw();
      }
    });

    io.observe(card);

    return () => {
      stopDraw();
      ro.disconnect();
      io.disconnect();
      card.removeEventListener("pointerenter", onPointerEnter);
      card.removeEventListener("pointermove", onPointerMove);
      card.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [reduced, theme.rgb]);

  return (
    <article
      ref={cardRef}
      className="showcase-card group relative rounded-2xl border border-zinc-800/80 bg-zinc-950/70 hover:border-zinc-700/90 transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between overflow-hidden shadow-lg hover:shadow-xl"
    >
      {/* HTML5 Canvas Ambient Layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full pointer-events-none z-0 opacity-70"
        aria-hidden="true"
      />

      {/* Card Content */}
      <div className="relative z-10 space-y-3.5">
        {/* Compact Screenshot Viewport */}
        <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-zinc-900/60 border border-zinc-800/60 group/stage">
          <img
            key={currentImage.src}
            src={currentImage.src}
            alt={currentImage.caption || project.title}
            width={640}
            height={400}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />

          {/* Top Overlays: Category & Top Project Badge */}
          <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-black/75 backdrop-blur-md px-2.5 py-0.5 font-mono text-[11px] text-zinc-300 border border-white/10">
                {project.category}
              </span>
              {isTop && (
                <span className="rounded-full bg-emerald-500/20 backdrop-blur-md px-2 py-0.5 font-mono text-[10px] text-emerald-400 font-medium border border-emerald-500/30">
                  Featured
                </span>
              )}
            </div>

            {images.length > 1 && (
              <span className="rounded-full bg-black/75 backdrop-blur-md px-2 py-0.5 font-mono text-[10px] text-zinc-400 border border-white/10">
                {activeImageIndex + 1}/{images.length}
              </span>
            )}
          </div>

          {/* Minimal Navigation Arrows on Hover (if multiple images) */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 size-7 rounded-full bg-black/70 hover:bg-black text-white/80 hover:text-white backdrop-blur-sm border border-white/15 flex items-center justify-center opacity-0 group-hover/stage:opacity-100 transition-opacity active:scale-95 shadow-md"
                aria-label="Previous image"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 size-7 rounded-full bg-black/70 hover:bg-black text-white/80 hover:text-white backdrop-blur-sm border border-white/15 flex items-center justify-center opacity-0 group-hover/stage:opacity-100 transition-opacity active:scale-95 shadow-md"
                aria-label="Next image"
              >
                <ChevronRight className="size-4" />
              </button>

              {/* Minimal Dot Indicators */}
              <div className="absolute bottom-2 inset-x-0 flex justify-center items-center gap-1 pointer-events-none">
                {images.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      activeImageIndex === idx
                        ? "w-3.5 bg-white"
                        : "w-1 bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Title & Short Blurb (Minimal text) */}
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-semibold tracking-tight text-zinc-100 group-hover:text-white transition-colors">
            {project.title}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 leading-relaxed">
            {project.blurb}
          </p>
        </div>

        {/* Top 4 Tech Stack Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {project.techStack.slice(0, 4).map((tech) => (
            <span
              key={tech}
              className="rounded-md border border-zinc-800/80 bg-zinc-900/60 px-2 py-0.5 font-mono text-[11px] text-zinc-400"
            >
              {tech}
            </span>
          ))}
          {project.techStack.length > 4 && (
            <span className="font-mono text-[10px] text-zinc-500">
              +{project.techStack.length - 4}
            </span>
          )}
        </div>
      </div>

      {/* Footer Actions: Clean, Minimal Links */}
      <div className="relative z-10 flex items-center justify-between pt-3.5 mt-3.5 border-t border-zinc-800/60">
        <span className="text-[11px] font-mono text-zinc-500">
          {project.date}
        </span>

        <div className="flex items-center gap-2">
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => tap(8)}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-700/80 bg-zinc-800/80 hover:bg-zinc-700 hover:text-white px-2.5 py-1 text-xs font-medium text-zinc-200 transition-colors"
            >
              <span>Demo</span>
              <ExternalLink className="size-3 text-zinc-400" />
            </a>
          )}
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noreferrer"
              onClick={() => tap(8)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800/60 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
              title="GitHub"
            >
              <img
                src="/images/github.png"
                alt=""
                className="hidden dark:block size-3.5"
              />
              <img
                src="/images/github-light.png"
                alt=""
                className="dark:hidden size-3.5"
              />
              <span>Code</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

export default ProjectCard;
