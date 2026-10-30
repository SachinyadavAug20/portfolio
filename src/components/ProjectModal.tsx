import { useEffect, useState, useCallback } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Globe,
  Zap,
  Cpu,
  Terminal,
  Boxes,
  GitBranch,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { Project } from "../lib/projects";
import { tap } from "../lib/haptics";
import { stopSmoothScroll, startSmoothScroll } from "../lib/smoothScroll";

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
}

const HIGHLIGHT_ICONS = [Zap, Terminal, Boxes, Cpu, GitBranch, Layers];

export const ProjectModal = ({ project, onClose }: ProjectModalProps) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Reset active image on project change
  useEffect(() => {
    setActiveImageIndex(0);
  }, [project]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!project) return;
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        setActiveImageIndex((prev) => (prev + 1) % project.images.length);
      } else if (e.key === "ArrowLeft") {
        setActiveImageIndex((prev) =>
          prev === 0 ? project.images.length - 1 : prev - 1,
        );
      }
    },
    [project, onClose],
  );

  // Freeze background page scroll & pause Lenis smoothly
  useEffect(() => {
    if (!project) return;
    stopSmoothScroll();
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      startSmoothScroll();
    };
  }, [project, handleKeyDown]);

  if (!project) return null;

  const currentImage = project.images[activeImageIndex] || project.images[0];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    tap(8);
    setActiveImageIndex((prev) => (prev + 1) % project.images.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    tap(8);
    setActiveImageIndex((prev) =>
      prev === 0 ? project.images.length - 1 : prev - 1,
    );
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 overscroll-contain"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-project-title"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => {
            tap(10);
            onClose();
          }}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl md:rounded-3xl border border-zinc-800/80 bg-zinc-950 shadow-2xl overflow-hidden z-10 overscroll-contain"
        >
          {/* Top Bar - Minimal Header */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 sm:px-6 py-3.5 bg-zinc-950/80 shrink-0">
            <div className="min-w-0 pr-3">
              <h2
                id="modal-project-title"
                className="text-base sm:text-lg font-bold text-zinc-100 truncate"
              >
                {project.title}
              </h2>
              <span className="text-xs font-mono text-zinc-500">
                {project.date}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => tap(8)}
                  className="size-8 rounded-lg border border-zinc-800 bg-zinc-900/80 flex items-center justify-center text-zinc-400 hover:text-white hover:border-emerald-500/60 transition-colors"
                  title="Live Demo"
                >
                  <Globe className="size-4" />
                </a>
              )}
              <a
                href={project.github}
                target="_blank"
                rel="noreferrer"
                onClick={() => tap(8)}
                className="size-8 rounded-lg border border-zinc-800 bg-zinc-900/80 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
                title="GitHub Repository"
              >
                <img
                  src="/images/github.png"
                  alt=""
                  className="hidden dark:block size-4"
                />
                <img
                  src="/images/github-light.png"
                  alt=""
                  className="dark:hidden size-4"
                />
              </a>
              <button
                type="button"
                onClick={() => {
                  tap(8);
                  onClose();
                }}
                className="size-8 rounded-lg border border-zinc-800 bg-zinc-900/80 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors ml-1"
                aria-label="Close modal"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Modal Body - Scrollable */}
          <div className="overflow-y-auto overscroll-contain flex-1 p-4 sm:p-6 space-y-5 custom-scrollbar">
            {/* Gallery View */}
            <div className="space-y-2.5">
              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-xl sm:rounded-2xl border border-zinc-800/80 bg-zinc-950 overflow-hidden flex items-center justify-center group/stage">
                <img
                  key={currentImage.src}
                  src={currentImage.src}
                  alt={currentImage.caption}
                  className="size-full object-contain"
                  loading="eager"
                  decoding="async"
                />

                {/* Arrow Controls */}
                {project.images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 size-8 rounded-full border border-zinc-700/80 bg-black/60 flex items-center justify-center text-zinc-200 hover:bg-black/90 hover:text-white transition-all shadow-md active:scale-95"
                      aria-label="Previous screenshot"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 size-8 rounded-full border border-zinc-700/80 bg-black/60 flex items-center justify-center text-zinc-200 hover:bg-black/90 hover:text-white transition-all shadow-md active:scale-95"
                      aria-label="Next screenshot"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </>
                )}
              </div>

              {/* Caption & Counter Bar */}
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
                <span className="truncate pr-2">{currentImage.caption}</span>
                <span className="shrink-0 text-zinc-500">
                  {activeImageIndex + 1} / {project.images.length}
                </span>
              </div>

              {/* Thumbnails Row */}
              {project.images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
                  {project.images.map((img, idx) => (
                    <button
                      key={img.src + idx}
                      type="button"
                      onClick={() => {
                        tap(6);
                        setActiveImageIndex(idx);
                      }}
                      className={`relative shrink-0 w-20 sm:w-24 aspect-video rounded-lg border overflow-hidden transition-all duration-150 ${
                        activeImageIndex === idx
                          ? "border-blue-500 ring-1 ring-blue-500"
                          : "border-zinc-800/80 opacity-50 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={img.src}
                        alt={img.caption}
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Architecture Highlights - Minimal & SVG Driven */}
            <div className="space-y-3 pt-3 border-t border-zinc-800/80">
              <h3 className="text-xs uppercase font-mono tracking-wider text-zinc-400">
                Architecture & Engineering
              </h3>

              <ul className="space-y-2">
                {project.architectureDetails.map((bullet, idx) => {
                  const Icon = HIGHLIGHT_ICONS[idx % HIGHLIGHT_ICONS.length];
                  return (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-300 leading-relaxed"
                    >
                      <Icon className="size-4 text-zinc-400 shrink-0 mt-0.5" />
                      <span>{bullet}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Tech Stack Pills */}
            <div className="pt-3 border-t border-zinc-800/80 space-y-2">
              <h4 className="text-xs uppercase font-mono tracking-wider text-zinc-400">
                Tech Stack
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {project.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-md border border-zinc-800/80 bg-zinc-900/80 px-2 py-0.5 font-mono text-[11px] text-zinc-400"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProjectModal;
