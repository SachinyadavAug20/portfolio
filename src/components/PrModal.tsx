import { useEffect, useState, useMemo, useCallback } from "react";
import {
  X,
  GitPullRequest,
  GitMerge,
  ExternalLink,
  Search,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { tap } from "../lib/haptics";
import { stopSmoothScroll, startSmoothScroll } from "../lib/smoothScroll";
import { OPEN_SOURCE_PRS, GITHUB_PR_SEARCH_URLS, type OpenSourcePR } from "../data/openSourcePrs";

interface PrModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFilter?: "all" | "open" | "merged";
}

export const PrModal = ({ isOpen, onClose, initialFilter = "all" }: PrModalProps) => {
  const [filter, setFilter] = useState<"all" | "open" | "merged">(initialFilter);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFilter(initialFilter);
      setSearchQuery("");
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
    const merged = OPEN_SOURCE_PRS.filter((p) => p.state === "merged" || p.state === "closed").length;
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
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overscroll-contain"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pr-modal-title"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => {
            tap(8);
            onClose();
          }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window / Bottom-Sheet */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full sm:max-w-3xl max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#0d0d12]/95 backdrop-blur-2xl shadow-2xl text-white overflow-hidden z-10"
        >
          {/* Mobile Sheet Grab Handle */}
          <div className="sm:hidden flex justify-center pt-3 pb-1">
            <span className="w-12 h-1.5 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex flex-col gap-3 px-5 pt-3 sm:pt-6 pb-4 border-b border-white/10 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                  <GitPullRequest className="size-5" />
                </div>
                <div>
                  <h2 id="pr-modal-title" className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    Open Source Pull Requests
                  </h2>
                  <p className="text-xs text-white/50">
                    Contributions by <span className="text-white/80 font-medium">@SachinyadavAug20</span>
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  tap(8);
                  onClose();
                }}
                aria-label="Close dialog"
                className="size-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer active:scale-95 touch-manipulation"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Direct GitHub Redirect Quick-Links */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-white/40">Direct GitHub:</span>
              <a
                href={GITHUB_PR_SEARCH_URLS.all}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-all active:scale-95"
              >
                All on GitHub
                <ExternalLink className="size-3" />
              </a>
              <a
                href={GITHUB_PR_SEARCH_URLS.open}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 transition-all active:scale-95"
              >
                Open PRs
                <ExternalLink className="size-3" />
              </a>
              <a
                href={GITHUB_PR_SEARCH_URLS.merged}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-purple-300 transition-all active:scale-95"
              >
                Merged PRs
                <ExternalLink className="size-3" />
              </a>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              <div className="inline-flex p-1 rounded-xl bg-white/5 border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    tap(8);
                    setFilter("all");
                  }}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    filter === "all"
                      ? "bg-white/15 text-white shadow-sm font-semibold"
                      : "text-white/60 hover:text-white"
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
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    filter === "open"
                      ? "bg-emerald-500/25 text-emerald-300 shadow-sm font-semibold border border-emerald-500/30"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <Clock className="size-3" />
                  Open ({counts.open})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    tap(8);
                    setFilter("merged");
                  }}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    filter === "merged"
                      ? "bg-purple-500/25 text-purple-300 shadow-sm font-semibold border border-purple-500/30"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <GitMerge className="size-3" />
                  Merged ({counts.merged})
                </button>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-white/40 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter by repo or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-purple-400/60 focus:bg-white/10 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* PR Cards List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 overscroll-contain">
            {filteredPrs.length === 0 ? (
              <div className="py-12 text-center text-white/40 text-sm">
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
                    className="group block p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-purple-500/30 transition-all duration-200 active:scale-[0.99] touch-manipulation"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Meta row: Repo + Status */}
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="font-mono text-[11px] sm:text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md font-semibold">
                            {pr.repo}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                              isOpenState
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-purple-500/10 text-purple-400 border-purple-500/30"
                            }`}
                          >
                            {isOpenState ? (
                              <>
                                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Open
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="size-3" />
                                Merged
                              </>
                            )}
                          </span>
                          <span className="text-[11px] text-white/40">
                            #{pr.number}
                          </span>
                          <span className="text-[11px] text-white/40">
                            • {pr.date}
                          </span>
                        </div>

                        {/* PR Title */}
                        <h3 className="text-sm sm:text-[15px] font-medium text-white/90 group-hover:text-white transition-colors line-clamp-2 leading-snug">
                          {pr.title}
                        </h3>
                      </div>

                      {/* Action Icon */}
                      <div className="size-8 rounded-lg bg-white/5 group-hover:bg-purple-500/20 group-hover:text-purple-300 text-white/40 flex items-center justify-center shrink-0 transition-colors mt-0.5">
                        <ExternalLink className="size-3.5" />
                      </div>
                    </div>
                  </a>
                );
              })
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-5 py-3 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-white/50 shrink-0">
            <span>Showing {filteredPrs.length} pull requests</span>
            <a
              href={GITHUB_PR_SEARCH_URLS.all}
              target="_blank"
              rel="noreferrer"
              className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium hover:underline"
            >
              All PRs on GitHub
              <ExternalLink className="size-3" />
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PrModal;
