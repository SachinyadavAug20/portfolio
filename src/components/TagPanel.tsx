import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Tags, X } from "lucide-react";
import { tap } from "../lib/haptics";

export interface TagEntry {
  tag: string;
  count: number;
}

interface TagPanelProps {
  tags: TagEntry[];
  activeTag: string | null;
  onSelect: (tag: string | null) => void;
}

/**
 * 59 tags as a wall of chips ate a whole screenful and still hid the long
 * tail. Now: one trigger row + a searchable sheet (bottom sheet on mobile,
 * dropdown on desktop) — every tag reachable in two keystrokes.
 */
const TagPanel = ({ tags, activeTag, onSelect }: TagPanelProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  /* default stays "count" — the vault's shape reads at a glance, and the
     sorted-desc contract is what the compact trigger promises */
  const [sortBy, setSortBy] = useState<"count" | "az">("count");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hit = q ? tags.filter((t) => t.tag.toLowerCase().includes(q)) : tags;
    if (sortBy === "az") {
      return [...hit].sort((a, b) => a.tag.localeCompare(b.tag));
    }
    return hit;
  }, [tags, query, sortBy]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const choose = (tag: string | null) => {
    tap(8);
    onSelect(tag);
    close();
  };

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        /* first Escape clears the filter-in-panel, second closes it */
        if (query) {
          setQuery("");
        } else {
          close();
          triggerRef.current?.focus();
        }
      } else if (e.key === "Enter" && query.trim() && matches.length > 0) {
        e.preventDefault();
        choose(matches[0].tag);
      }
    };
    /* outside taps close the desktop dropdown (the mobile backdrop
       covers its own clicks) */
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);

    /* mobile sheet: lock the page behind it, leave desktop scroll alone */
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    let prevOverflow = "";
    if (!desktop) {
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    /* focus only on desktop — popping the keyboard unasked on a phone is rude */
    const focusId = window.setTimeout(() => {
      if (window.matchMedia("(min-width: 1024px)").matches) searchRef.current?.focus();
    }, 80);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusId);
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [open, query, matches]);

  const chipIdle =
    "chip shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border border-black-50 bg-black-200 text-white-50/85 hover:bg-black-50 hover:text-foreground";
  const chipActive =
    "chip chip-filter shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full";

  return (
    <div className="relative">
      <div className="flex items-center gap-2 flex-wrap">
        {activeTag && (
          <motion.button
            type="button"
            onClick={() => choose(null)}
            aria-label={`Clear filter #${activeTag}`}
            className={chipActive}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 650, damping: 30 }}
          >
            #{activeTag}
            <X className="size-3" />
          </motion.button>
        )}
        <motion.button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={activeTag ? chipIdle : chipActive}
          whileTap={{ scale: 0.94 }}
          transition={{ type: "spring", stiffness: 650, damping: 30 }}
        >
          <Tags className="size-3.5" />
          {activeTag ? "Change" : "All tags"}
          <span className="tabular-nums opacity-55">{tags.length}</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[139] bg-black-900/60 backdrop-blur-[2px] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={close}
            />
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-label="Filter notes by tag"
              className="fixed inset-x-0 bottom-0 z-[140] max-h-[74dvh] rounded-t-3xl border border-black-50 bg-black-100 shadow-2xl flex flex-col
                         lg:absolute lg:inset-x-auto lg:bottom-auto lg:top-full lg:mt-2 lg:w-[min(34rem,calc(100vw-3rem))] lg:rounded-2xl lg:max-h-[24rem]"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {/* sheet grab handle — mobile affordance */}
              <div className="pt-2.5 pb-1 flex justify-center lg:hidden">
                <span className="h-1 w-10 rounded-full bg-black-50" />
              </div>

              <div className="flex items-center justify-between px-4 pt-3 pb-2 lg:pt-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Tags</h3>
                  <p className="text-[11px] text-white-50/45">
                    {tags.length} ways into the vault
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className="flex items-center rounded-lg border border-black-50 bg-black-200 p-0.5"
                    role="group"
                    aria-label="Sort tags"
                  >
                    <button
                      type="button"
                      onClick={() => setSortBy("count")}
                      aria-pressed={sortBy === "count"}
                      className={`px-2 py-1 rounded-md text-[11px] transition-colors ${
                        sortBy === "count"
                          ? "bg-black-100 text-foreground"
                          : "text-white-50/50 hover:text-white-50"
                      }`}
                    >
                      Top
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy("az")}
                      aria-pressed={sortBy === "az"}
                      className={`px-2 py-1 rounded-md text-[11px] transition-colors ${
                        sortBy === "az"
                          ? "bg-black-100 text-foreground"
                          : "text-white-50/50 hover:text-white-50"
                      }`}
                    >
                      A–Z
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      triggerRef.current?.focus();
                    }}
                    aria-label="Close tag filter"
                    className="p-2 -mr-1 rounded-full text-white-50/50 hover:text-foreground hover:bg-black-200 transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              <div className="px-4 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white-50/40" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find a tag…"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-black-200 border border-black-50 text-sm text-white-50 placeholder:text-white-50/30 focus:border-blue-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-2">
                {matches.length === 0 ? (
                  <p className="text-sm text-white-50/50 py-6 text-center">
                    No tags match “{query}”.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {matches.map(({ tag, count }) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => choose(tag)}
                        title={`${count} note${count === 1 ? "" : "s"} in #${tag}`}
                        className={activeTag === tag ? chipActive : chipIdle}
                      >
                        <span className="truncate max-w-[11rem]">{tag}</span>
                        <span className="tabular-nums opacity-50">{count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-black-50 text-[11px] text-white-50/45">
                <span>
                  {matches.length === tags.length
                    ? `${tags.length} tags`
                    : `${matches.length} of ${tags.length} tags`}
                  {activeTag ? " · filtered" : ""}
                </span>
                {activeTag && (
                  <button
                    type="button"
                    onClick={() => choose(null)}
                    className="text-blue-50 hover:text-foreground transition-colors"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TagPanel;
