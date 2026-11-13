import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  X,
  GitPullRequest,
  GitMerge,
  ExternalLink,
  Search,
  ArrowUpRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { tap } from "../lib/haptics";
import { stopSmoothScroll, startSmoothScroll } from "../lib/smoothScroll";
import { OPEN_SOURCE_PRS, GITHUB_PR_SEARCH_URLS } from "../data/openSourcePrs";

interface PrModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilter?: "all" | "open" | "merged";
}

export const PrModal = ({ isOpen, onClose, initialFilter = "all" }: PrModalProps) => {
  const [filter, setFilter] = useState<"all" | "open" | "merged">(initialFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFilter(initialFilter);
      setSearchQuery("");
      // Reset scroll position to top when opened
      if (listRef.current) {
        listRef.current.scrollTop = 0;
      }
    }
  }, [isOpen, initialFilter]);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onClose();
      }
    },
    [isOpen, onClose],
  );

  // Background scroll locking
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, handleKeyDown]);

  const counts = useMemo(() => {
    const open = OPEN_SOURCE_PRS.filter((p) => p.state === "open").length;
    const merged = OPEN_SOURCE_PRS.filter(
      (p) => p.state === "merged" || p.state === "closed",
    ).length;
    return { all: OPEN_SOURCE_PRS.length, open, merged };
  }, []);

  const filteredPrs = useMemo(() => {
    return OPEN_SOURCE_PRS.filter((pr) => {
      // Tab filter
      if (filter === "open" && pr.state !== "open") return false;
      if (filter === "merged" && pr.state !== "merged" && pr.state !== "closed") return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        pr.title.toLowerCase().includes(q) ||
        pr.repo.toLowerCase().includes(q) ||
        String(pr.number).includes(q)
      );
    });
  }, [filter, searchQuery]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pr-modal-title"
        data-lenis-prevent="true"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => {
            tap(8);
            onClose();
          }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          data-lenis-prevent="true"
        />

        {/* Modal Window / Bottom-Sheet */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ type: "spring", damping: 30, stiffness: 350 }}
          onClick={(e) => e.stopPropagation()}
          data-lenis-prevent="true"
          className="relative w-full sm:max-w-3xl h-[88vh] sm:h-[82vh] max-h-[820px] flex flex-col rounded-t-2xl sm:rounded-2xl border border-zinc-800 bg-[#0c0d12] shadow-2xl text-zinc-100 overflow-hidden z-10 overscroll-contain"
        >
          {/* Mobile Sheet Grab Handle */}
          <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
            <span className="w-10 h-1 rounded-full bg-zinc-700" />
          </div>

          {/* Minimal Formal Header */}
          <div className="flex flex-col gap-3 px-4 sm:px-6 pt-3 sm:pt-5 pb-3 border-b border-zinc-800 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 shrink-0">
                  <svg className="size-4.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  <h2 id="pr-modal-title" className="text-sm sm:text-base font-semibold tracking-tight text-zinc-100">
                    Open Source Pull Requests
                  </h2>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 font-medium">
                    {OPEN_SOURCE_PRS.length}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                <a
                  href={GITHUB_PR_SEARCH_URLS.all}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="View pull requests on GitHub"
                  title="View pull requests on GitHub"
                  className="size-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    tap(8);
                    onClose();
                  }}
                  aria-label="Close dialog"
                  title="Close dialog (Esc)"
                  className="size-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
              {/* Segmented Filter Pills */}
              <div className="inline-flex p-0.5 rounded-lg bg-zinc-900/90 border border-zinc-800 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    tap(8);
                    setFilter("all");
                  }}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    filter === "all"
                      ? "bg-zinc-800 text-zinc-100 shadow-xs border border-zinc-700/50"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  All ({counts.all})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    tap(8);
                    setFilter("open");
                  }}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    filter === "open"
                      ? "bg-zinc-800 text-zinc-100 shadow-xs border border-zinc-700/50"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <GitPullRequest className="size-3 text-emerald-400 shrink-0" />
                  <span>Open ({counts.open})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    tap(8);
                    setFilter("merged");
                  }}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    filter === "merged"
                      ? "bg-zinc-800 text-zinc-100 shadow-xs border border-zinc-700/50"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <GitMerge className="size-3 text-purple-400 shrink-0" />
                  <span>Merged ({counts.merged})</span>
                </button>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter by repo or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 focus:bg-zinc-900 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    aria-label="Clear search"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* PR Cards List — Fully Scrollable with Touch & Wheel Isolation */}
          <div
            ref={listRef}
            data-lenis-prevent="true"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-2 touch-pan-y"
            style={{
              WebkitOverflowScrolling: "touch",
            }}
          >
            {filteredPrs.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-xs">
                No pull requests match your filter.
              </div>
            ) : (
              filteredPrs.map((pr) => {
                const isOpenState = pr.state === "open";
                return (
                  <a
                    key={pr.url}
                    href={pr.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => tap(6)}
                    className="group flex items-start gap-3 p-3 sm:p-3.5 rounded-xl bg-zinc-900/40 hover:bg-zinc-900/90 border border-zinc-800/70 hover:border-zinc-700 transition-all duration-150 active:scale-[0.99] touch-manipulation"
                  >
                    {/* Status Icon */}
                    <div
                      className={`size-7 sm:size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                        isOpenState
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                      }`}
                      title={isOpenState ? "Open Pull Request" : "Merged Pull Request"}
                    >
                      {isOpenState ? (
                        <GitPullRequest className="size-3.5 sm:size-4" />
                      ) : (
                        <GitMerge className="size-3.5 sm:size-4" />
                      )}
                    </div>

                    {/* Metadata & Title */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-[11px] leading-tight">
                        <span className="font-mono font-medium text-zinc-300 truncate max-w-[200px] sm:max-w-none">
                          {pr.repo}
                        </span>
                        <span className="font-mono text-zinc-500">#{pr.number}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-zinc-500">{pr.date}</span>
                      </div>
                      <h3 className="text-xs sm:text-[13px] font-normal text-zinc-200 group-hover:text-white transition-colors leading-snug line-clamp-2 mt-1">
                        {pr.title}
                      </h3>
                    </div>

                    {/* Action Icon */}
                    <div className="text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0 pt-0.5">
                      <ArrowUpRight className="size-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                  </a>
                );
              })
            )}
          </div>

          {/* Minimal Clean Footer */}
          <div className="px-4 sm:px-6 py-2.5 border-t border-zinc-800 bg-[#090a0e] flex items-center justify-between text-xs text-zinc-500 shrink-0">
            <span>
              Showing {filteredPrs.length} of {OPEN_SOURCE_PRS.length} pull requests
            </span>
            <a
              href={GITHUB_PR_SEARCH_URLS.all}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors hover:underline"
            >
              <span>GitHub</span>
              <ExternalLink className="size-3 opacity-70" />
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PrModal;

