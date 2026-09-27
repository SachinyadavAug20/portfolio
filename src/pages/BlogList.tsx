import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { X, Search } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import SEOHead from "../seo/SEOHead";
import { getPosts } from "../blog/posts";
import { buildTree, getFolderAtPath } from "../blog/tree";
import type { BlogPost } from "../blog/types";
import TitleHeader from "../components/TitleHeader";
import FileExplorer from "../components/FileExplorer";

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
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
    { scope: rootRef, dependencies: [loading, viewKey], revertOnUpdate: true },
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const post of posts) {
      for (const tag of post.dir.split("/").filter(Boolean)) {
        set.add(tag);
      }
    }
    return Array.from(set).sort();
  }, [posts]);

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

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    setSearchParams(next);
  };

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
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <div className="space-y-2 mt-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-black-200 animate-pulse" />
              ))}
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
                  type="text"
                  value={currentQuery}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full pl-11 pr-11 py-3.5 rounded-xl bg-black-200 border border-black-50 text-white-50 placeholder:text-white-50/30 focus:outline-none focus:border-blue-50/40 transition-colors text-base"
                />
                {currentQuery && (
                  <button
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full text-white-50/40 hover:text-white-50 active:bg-black-100 transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              {allTags.length > 0 && (
                <div className="blog-intro flex flex-nowrap md:flex-wrap gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                  {currentTag && (
                    <button
                      onClick={clearTag}
                      className="chip shrink-0 inline-flex items-center gap-1 px-3.5 py-1.5 text-xs rounded-full bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                    >
                      {currentTag}
                      <X className="size-3" />
                    </button>
                  )}
                  {allTags
                    .filter((t) => t !== currentTag)
                    .map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setTag(tag)}
                        className="chip shrink-0 px-3.5 py-1.5 text-xs rounded-full bg-black-200 text-blue-50 hover:bg-black-50 hover:text-foreground"
                      >
                        {tag}
                      </button>
                    ))}
                </div>
              )}
              {folder ? (
                <FileExplorer
                  folder={folder}
                  currentPath={currentPath}
                  onNavigate={handleNavigate}
                />
              ) : (
                <p className="text-blue-50 text-center mt-16">
                  {currentQuery
                    ? `No notes matching "${currentQuery}".`
                    : "Folder not found."}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
    </>
  );
};

export default BlogList;
