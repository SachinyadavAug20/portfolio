import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "motion/react";
import { X, Search, Network } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import SEOHead from "../seo/SEOHead";
import { getPosts } from "../blog/posts";
import { buildTree, getFolderAtPath } from "../blog/tree";

const MotionLink = motion.create(Link);
const PRESS = {
  whileTap: { scale: 0.94 },
  transition: { type: "spring", stiffness: 650, damping: 30 },
} as const;
import type { BlogPost } from "../blog/types";
import TitleHeader from "../components/TitleHeader";
import FileExplorer from "../components/FileExplorer";
import TagPanel from "../components/TagPanel";
import BackToTop from "../components/BackToTop";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { scrollToY } from "../lib/smoothScroll";

const BlogList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPath = searchParams.get("path") ?? "";
  const currentTag = searchParams.get("tag") ?? "";
  const currentQuery = searchParams.get("q") ?? "";
  const viewKey = `${currentPath}::${currentTag}`;
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const reduced = useReducedMotion();

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  /*
   * Search text lives in local state while typing; the URL updates on a
   * debounce. Reading the value back from useSearchParams per keystroke
   * dropped characters (the router round-trip lags the input). Refs track
   * what we pushed so browser back/forward never fights the input.
   */
  const [qInput, setQInput] = useState(currentQuery);
  const lastPushedQ = useRef(currentQuery);
  useEffect(() => {
    if (qInput === currentQuery) {
      lastPushedQ.current = currentQuery;
      return;
    }
    if (currentQuery !== lastPushedQ.current) {
      /* URL changed externally (back/forward) — leave the input alone */
      lastPushedQ.current = currentQuery;
      return;
    }
    const id = window.setTimeout(() => {
      lastPushedQ.current = qInput;
      updateParams({ q: qInput || null, path: null, tag: null });
    }, 250);
    return () => window.clearTimeout(id);
  }, [qInput, currentQuery, updateParams]);

  /* "/" jumps to search (unless you're already typing somewhere) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          (el as HTMLElement).isContentEditable)
      )
        return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Remember scroll per view so returning from a post lands you where
  // you left off instead of back at the top.
  const scrollKey = `blog-scroll::${viewKey}`;
  const restoredRef = useRef(false);
  useEffect(() => {
    const save = () => sessionStorage.setItem(scrollKey, String(window.scrollY));
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      save();
      window.removeEventListener("scroll", save);
    };
  }, [scrollKey]);
  useEffect(() => {
    if (loading || restoredRef.current) return;
    restoredRef.current = true;
    const y = Number(sessionStorage.getItem(scrollKey) ?? 0);
    if (y > 0) {
      requestAnimationFrame(() => scrollToY(y, true));
    }
  }, [loading, scrollKey]);

  useEffect(() => {
    let cancelled = false;
    getPosts()
      .then((data) => {
        if (!cancelled) {
          setPosts(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Entrance choreography (timings from UX motion research):
  // content-surface band 250–400ms, ease-out for entrances,
  // 30ms stagger rhythm capped at ~200ms total, ~20% shorter on mobile.
  useGSAP(
    () => {
      if (loading) return;
      if (reduced) return;
      const scope = rootRef.current;
      if (!scope) return;

      const mobile = window.matchMedia("(max-width: 768px)").matches;
      const dur = mobile ? 0.24 : 0.3;
      const cap = mobile ? 0.16 : 0.2;
      const intros = gsap.utils.toArray<HTMLElement>(".blog-intro", scope);
      const tiles = gsap.utils.toArray<HTMLElement>(".blog-tile", scope);

      const tl = gsap.timeline();
      if (intros.length) {
        tl.fromTo(
          intros,
          { y: mobile ? 8 : 12, opacity: 0 },
          { y: 0, opacity: 1, duration: dur, ease: "power2.out", stagger: 0.045, clearProps: "transform,opacity" },
          0,
        );
      }
      if (tiles.length) {
        tl.fromTo(
          tiles,
          { y: mobile ? 7 : 10, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: dur,
            ease: "power2.out",
            stagger: (i: number) => Math.min(i * 0.03, cap),
            clearProps: "transform,opacity",
          },
          0.07,
        );
      }
    },
    { scope: rootRef, dependencies: [loading, viewKey, reduced], revertOnUpdate: true },
  );

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const post of posts) {
      for (const tag of post.dir.split("/").filter(Boolean)) {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(map, ([tag, count]) => ({ tag, count })).sort(
      (a, b) => b.count - a.count || a.tag.localeCompare(b.tag),
    );
  }, [posts]);

  /* header stats: how big the vault actually is */
  const stats = useMemo(() => {
    const folders = new Set(posts.map((p) => p.dir).filter(Boolean)).size;
    return { notes: posts.length, folders, tags: tagCounts.length };
  }, [posts, tagCounts]);

  /* latest notes: real last-update dates from dates.json (build artifact —
     a slim slug → updated map, not the whole graph); without dates the
     plain tree order stands in */
  const [latestDates, setLatestDates] = useState<Record<string, string>>({});
  useEffect(() => {
    let dead = false;
    fetch("/dates.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { dates?: Record<string, string> } | null) => {
        if (dead || !data?.dates) return;
        setLatestDates(data.dates);
      })
      .catch(() => {
        /* no dates — tree order fallback */
      });
    return () => {
      dead = true;
    };
  }, []);

  const latest = useMemo(() => {
    if (!posts.length) return [];
    const dated = posts
      .filter((p) => latestDates[p.fullSlug])
      .sort((a, b) =>
        latestDates[b.fullSlug].localeCompare(latestDates[a.fullSlug]),
      );
    if (dated.length >= 3) return dated.slice(0, 5);
    return posts.slice(0, 5);
  }, [posts, latestDates]);

  const filteredPosts = useMemo(() => {
    let result = posts;
    if (currentTag) {
      result = result.filter((p) =>
        p.dir.split("/").some((t) => t === currentTag),
      );
    }
    if (currentQuery) {
      const q = currentQuery.toLowerCase();
      result = result.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        p.dir.toLowerCase().includes(q),
      );
    }
    return result;
  }, [posts, currentTag, currentQuery]);

  const tree = buildTree(filteredPosts);
  const folder = getFolderAtPath(tree, currentPath);

  const handleNavigate = (path: string) => {
    updateParams({ path: path || null });
  };

  const setSearch = (q: string) => {
    updateParams({ q: q || null, path: null, tag: null });
  };

  const setTag = (tag: string) => {
    updateParams({ tag, path: null });
  };

  const clearTag = () => {
    updateParams({ tag: null });
  };

  return (
    <>
      <SEOHead
        title={currentTag ? `${currentTag} — Blog` : "Blog"}
        description="Read about programming, full-stack development, and computer science from my Obsidian vault."
        path="/blog"
      />
      <section className="section-padding pt-5 min-h-screen">
      <div ref={rootRef} className="w-full h-full md:px-10">
        <div className="blog-intro">
          <TitleHeader title="Blog" sub="Notes from my Obsidian vault" />
        </div>
        {!loading && !error && stats.notes > 0 && (
          <p className="blog-intro text-center text-xs text-white-50/50 mt-3">
            {stats.notes} notes · {stats.folders} folders · {stats.tags} tags
          </p>
        )}
        <div className="blog-intro flex justify-center mt-5">
          <MotionLink
            to="/graph"
            className="chip inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-full bg-black-200 text-blue-50 border border-black-50 hover:bg-blue-500/15 hover:text-foreground transition-colors active:scale-95"
            {...PRESS}
          >
            <Network className="size-3.5" />
            Knowledge Graph
          </MotionLink>
        </div>
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <div className="space-y-2 mt-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton h-12 rounded-lg bg-black-200" />
              ))}
              <div className="skeleton-hint" role="status">
                still fetching notes from github…{" "}
                <button
                  type="button"
                  className="skeleton-retry"
                  onClick={() => window.location.reload()}
                >
                  retry
                </button>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-400 mb-4">Failed to load notes: {error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-3 rounded-lg border border-black-50 bg-black-100 hover:bg-black-200 text-white-50 active:scale-95 transition-transform"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="blog-intro relative mt-8 mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white-50/40" />
                <input
                  ref={searchRef}
                  type="text"
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setQInput("");
                      setSearch("");
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder="Search notes... (press /)"
                  className="w-full pl-11 pr-11 py-3.5 rounded-xl bg-black-200 border border-black-50 text-white-50 placeholder:text-white-50/30 focus:border-blue-500/50 transition-colors text-base"
                />
                {qInput ? (
                  <button
                    onClick={() => {
                      setQInput("");
                      setSearch("");
                    }}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full text-white-50/40 hover:text-white-50 active:bg-black-100 transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                ) : (
                  <kbd className="pointer-events-none absolute right-3 top-1/2 hidden size-6 -translate-y-1/2 items-center justify-center rounded-md border border-black-50 bg-black-100 text-xs text-white-50/40 md:flex">
                    /
                  </kbd>
                )}
              </div>
              <div className="blog-intro flex items-center justify-between gap-3 flex-wrap mb-6">
                {tagCounts.length > 0 && (
                  <TagPanel
                    tags={tagCounts}
                    activeTag={currentTag || null}
                    onSelect={(t) => (t ? setTag(t) : clearTag())}
                  />
                )}
                <p className="text-xs text-white-50/45 tabular-nums ml-auto">
                  {currentTag || currentQuery
                    ? `${filteredPosts.length} of ${posts.length} notes`
                    : `${posts.length} notes`}
                  {currentTag ? ` · #${currentTag}` : ""}
                  {currentQuery ? ` · “${currentQuery}”` : ""}
                </p>
              </div>
              {folder && (folder.children?.length ?? 0) > 0 ? (
                <FileExplorer
                  folder={folder}
                  currentPath={currentPath}
                  onNavigate={handleNavigate}
                  dates={latestDates}
                />
              ) : (
                <div className="py-14 text-center">
                  <p className="text-blue-50">
                    {currentQuery
                      ? `No notes matching "${currentQuery}".`
                      : "Folder not found."}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {currentQuery &&
                      tagCounts
                        .filter((t) => t.tag.toLowerCase().includes(currentQuery.toLowerCase()))
                        .slice(0, 6)
                        .map(({ tag }) => (
                          <motion.button
                            key={tag}
                            onClick={() => setTag(tag)}
                            {...PRESS}
                            className="chip px-3.5 py-1.5 text-xs rounded-full bg-black-200 text-blue-50 hover:bg-black-50 hover:text-foreground transition-colors"
                          >
                            #{tag}
                          </motion.button>
                        ))}
                    <motion.button
                      onClick={() => {
                        setQInput("");
                        setSearch("");
                      }}
                      {...PRESS}
                      className="chip px-3.5 py-1.5 text-xs rounded-full border border-black-50 bg-black-100 text-white-50 hover:bg-black-200 transition-colors"
                    >
                      {currentQuery ? "Clear search" : "Back to root"}
                    </motion.button>
                  </div>
                </div>
              )}
              {latest.length > 0 && (
                <div className="latest-notes mt-14 pt-6 border-t border-black-50">
                  <div className="flex items-baseline justify-between mb-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-white-50/40">
                      Latest notes
                    </h2>
                    {latestDates[latest[0].fullSlug] && (
                      <span className="text-[11px] text-white-50/35">
                        by last update
                      </span>
                    )}
                  </div>
                  <ul className="space-y-0.5">
                    {latest.map((p) => {
                      const d = latestDates[p.fullSlug];
                      return (
                        <li key={p.fullSlug}>
                          <MotionLink
                            to={`/blog/post/${p.fullSlug}${p.dir ? `?from=${encodeURIComponent(p.dir)}` : ""}`}
                            {...PRESS}
                            className="flex items-center justify-between gap-3 px-3 py-2 -mx-3 rounded-lg hover:bg-black-100/60 transition-colors group"
                          >
                            <span className="truncate text-sm text-white-50 group-hover:text-foreground transition-colors">
                              {p.title}
                            </span>
                            <span className="flex items-center gap-3 shrink-0 text-xs text-white-50/40">
                              {p.dir && (
                                <span className="truncate max-w-36">
                                  {p.dir.split("/").pop()}
                                </span>
                              )}
                              {d && (
                                <span>
                                  {new Date(d).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              )}
                            </span>
                          </MotionLink>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
        <BackToTop />
      </div>
    </section>
    </>
  );
};

export default BlogList;
