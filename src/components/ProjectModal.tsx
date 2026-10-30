import { useEffect, useState, useCallback } from "react";
import {
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { Project } from "../lib/projects";
import { tap } from "../lib/haptics";

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
}

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

  useEffect(() => {
    if (!project) return;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      window.removeEventListener("keydown", handleKeyDown);
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
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-project-title"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => {
            tap(10);
            onClose();
          }}
          className="fixed inset-0 bg-black/85 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-zinc-800 bg-[#0d0e14] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] overflow-hidden z-10"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4 bg-zinc-950/60 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0 pr-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-mono text-blue-400 shrink-0">
                <Sparkles className="size-3" />
                {project.category}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 font-mono text-xs text-zinc-400">
                <Calendar className="size-3" />
                {project.date}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => tap(10)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500 transition-all active:scale-95"
                >
                  <span>Live Demo</span>
                  <ExternalLink className="size-3" />
                </a>
              )}
              <a
                href={project.github}
                target="_blank"
                rel="noreferrer"
                onClick={() => tap(10)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:border-zinc-500 transition-all active:scale-95"
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
                <span>GitHub</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  tap(10);
                  onClose();
                }}
                className="size-8 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-600 transition-all ml-1"
                aria-label="Close modal"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Modal Body - Scrollable */}
          <div className="overflow-y-auto flex-1 p-5 sm:p-7 space-y-6 custom-scrollbar">
            {/* Title & Subtitle */}
            <div>
              <h2
                id="modal-project-title"
                className="text-2xl sm:text-3xl font-bold tracking-tight text-white"
              >
                {project.title}
              </h2>
              <p className="mt-1 text-sm sm:text-base text-zinc-400 font-medium">
                {project.subtitle}
              </p>
            </div>

            {/* Gallery View */}
            <div className="space-y-3">
              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-2xl border border-zinc-800 bg-black/60 overflow-hidden flex items-center justify-center group/stage">
                <img
                  key={currentImage.src}
                  src={currentImage.src}
                  alt={currentImage.caption}
                  className="size-full object-contain"
                  loading="eager"
                  decoding="async"
                />

                {/* Tag & Caption Overlay */}
                <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center justify-between text-xs sm:text-sm text-zinc-200 pointer-events-none">
                  <div className="flex items-center gap-2">
                    {currentImage.tag && (
                      <span className="rounded-md border border-white/10 bg-white/10 px-2 py-0.5 font-mono text-[11px] text-zinc-300">
                        {currentImage.tag}
                      </span>
                    )}
                    <span className="font-medium text-white drop-shadow">
                      {currentImage.caption}
                    </span>
                  </div>
                  <span className="font-mono text-zinc-400 text-xs shrink-0">
                    {activeImageIndex + 1} / {project.images.length}
                  </span>
                </div>

                {/* Arrow Controls (if multiple images) */}
                {project.images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 size-10 rounded-full border border-white/20 bg-black/70 flex items-center justify-center text-white hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-lg"
                      aria-label="Previous screenshot"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="absolute right-3 top-1/2 -translate-y-1/2 size-10 rounded-full border border-white/20 bg-black/70 flex items-center justify-center text-white hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-lg"
                      aria-label="Next screenshot"
                    >
                      <ChevronRight className="size-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails Row */}
              {project.images.length > 1 && (
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
                  {project.images.map((img, idx) => (
                    <button
                      key={img.src + idx}
                      type="button"
                      onClick={() => {
                        tap(6);
                        setActiveImageIndex(idx);
                      }}
                      className={`relative shrink-0 w-24 sm:w-28 aspect-video rounded-xl border-2 overflow-hidden transition-all duration-200 ${
                        activeImageIndex === idx
                          ? "border-blue-500 scale-[1.02] shadow-[0_0_15px_-3px_rgba(59,130,246,0.5)]"
                          : "border-zinc-800 opacity-60 hover:opacity-100 hover:border-zinc-600"
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

            {/* Architecture & Engineering Highlights */}
            <div className="space-y-4 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center gap-2 text-white font-semibold text-lg">
                <Layers className="size-5 text-blue-400" />
                <h3>Architecture & Engineering Highlights</h3>
              </div>

              <ul className="space-y-2.5">
                {project.architectureDetails.map((bullet, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 text-sm sm:text-base text-zinc-300 leading-relaxed"
                  >
                    <span className="size-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tech Stack Pills */}
            <div className="pt-2 border-t border-zinc-800/80 space-y-2.5">
              <h4 className="text-xs uppercase font-mono tracking-wider text-zinc-400">
                Technologies & Frameworks
              </h4>
              <div className="flex flex-wrap gap-2">
                {project.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-900/90 px-3 py-1 font-mono text-xs text-zinc-300 font-medium"
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
