import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Star } from "lucide-react";
import { Calendar, Search, Tags } from "lucide-react";
import type { BlogPost } from "../blog/types";

const sidebarClasses = (isMobile: boolean) =>
  isMobile
    ? "fixed left-0 top-0 bottom-0 w-full sm:w-full bg-white dark:bg-[#0d1527] border-0"
    : "w-16 sm:w-20 bg-white dark:bg-[#0d1527] border-r border-zinc-200/80 dark:border-zinc-800/80 z-40 py-6 transition-transform transform duration-300 translate-x-full sm:translate-x-0";

const BlogSidebar = () => {
  const [, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = window.innerWidth < 768;

  const allTags = posts.flatMap((p) => p.dir.split("/").filter(Boolean));
  const tagCounts = allTags.reduce((acc, tag) => {
    acc.set(tag, (acc.get(tag) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());

  /* GSAP entrance animation */
  useEffect(() => {
    const spine = document.querySelector(".blog-sidebar-spine");
    if (!spine) return;
    const items = document.querySelectorAll(".blog-sidebar-item");
    if (!items.length) return;

    // @ts-ignore
    gsap.fromTo(
      items,
      { y: 20, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.08,
      }
    );
  }, [isMobile, loading]);

  useEffect(() => {
    let cancelled = false;
    import("../blog/posts").then(({ getPosts }) => {
      if (!cancelled) {
        getPosts().then((data) => {
          if (!cancelled) {
            setPosts(data as BlogPost[]);
            setLoading(false);
          }
        });
      }
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <aside
      className={sidebarClasses(isMobile) + " blog-sidebar-spine"}
      aria-label="Blog sidebar"
    >
      <div className="flex flex-col items-center gap-4 mb-8">
        <h2 className="text-xs font-semibold text-white-50/60 uppercase tracking-wider">
          Blog
        </h2>
        <a
          href="https://github.com/SachinyadavAug20/My-Obsidian-notes"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-black-200 text-white-50 hover:bg-black-100 hover:text-foreground transition-colors text-sm font-medium"
        >
          <Star className="size-4" />
          <span>Star</span>
        </a>
      </div>

      {tagCounts.size > 0 && !isMobile && (
        <div className="space-y-2 w-full">
          <h3 className="text-xs font-medium text-white-50/60 uppercase tracking-wider mb-2">
            Topics
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(tagCounts.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([tag, count]) => (
                <button
                  key={tag}
                  type="button"
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                  onClick={() => setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set("tag", tag); return p; })}
                >
                  <Tags className="size-2.5 shrink-0" />
                  <span>{tag}</span>
                  <span className="text-[9px] opacity-60">{count}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {posts.length > 0 && !loading && !isMobile && (
        <div className="space-y-3 w-full">
          <h3 className="text-xs font-medium text-white-50/60 uppercase tracking-wider mb-3">
            Latest
          </h3>
          <ul className="space-y-2 w-full">
            {posts
              .sort((a, b) => (a.title > b.title ? 1 : -1))
              .slice(0, 5)
              .map((post) => (
                <li key={post.fullSlug} className="blog-sidebar-item flex items-center gap-2">
                  <Calendar className="size-3 shrink-0 text-white-50/60" />
                  <a
                    href={`/blog/post/${post.fullSlug}`}
                    className="text-sm text-white-50/70 hover:text-foreground transition-colors"
                  >
                    {post.title}
                  </a>
                </li>
              ))}
          </ul>
        </div>
      )}

      {isMobile && (
        <div className="w-full mb-6 border-t border-zinc-200/20 pt-6">
          <h3 className="text-xs font-medium text-white-50/60 uppercase tracking-wider mb-2">
            Search
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white-50/40" />
            <input
              type="text"
              placeholder="Search notes..."
              onChange={(e) =>
                setSearchParams((prev) => {
                  const p = new URLSearchParams(prev);
                  p.set("q", e.target.value || "");
                  return p;
                })
              }
              className="pl-10 pr-8 py-3.5 rounded-xl bg-black-200 border border-black-50 text-white-50 placeholder:text-white-50/30 focus:border-blue-500/50 transition-colors text-sm"
            />
          </div>
        </div>
      )}
    </aside>
  );
};

export default BlogSidebar;