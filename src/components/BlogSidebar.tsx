import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Search,
  Folder,
  FolderOpen,
  FileText,
  X,
  ChevronDown,
  ChevronRight,
  Home,
  Network,
  PanelLeftOpen,
  PanelLeftClose,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import type { BlogPost } from "../blog/types";
import { getPosts } from "../blog/posts";
import { getBlogDates } from "../blog/dates";
import { tap } from "../lib/haptics";
import {
  getSidebarCollapsed,
  setSidebarCollapsed,
  onSidebarCollapsedChange,
} from "../lib/blogSidebarState";

const GITHUB_REPO_URL = "https://github.com/SachinyadavAug20/My-Obsidian-notes";

const BlogSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllFolders, setShowAllFolders] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [latestDates, setLatestDates] = useState<Record<string, string>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Active query / tag params
  const activeTag = searchParams.get("tag") || "";
  const isReading = location.pathname.startsWith("/blog/post/");
  const currentSlug = isReading
    ? decodeURIComponent(location.pathname.slice("/blog/post/".length))
    : "";

  const [isCollapsed, setIsCollapsed] = useState(() =>
    isReading ? true : getSidebarCollapsed()
  );

  useEffect(() => {
    return onSidebarCollapsedChange((collapsed) => {
      setIsCollapsed(collapsed);
    });
  }, []);

  const handleToggleCollapse = () => {
    tap(8);
    const next = !isCollapsed;
    setIsCollapsed(next);
    setSidebarCollapsed(next);
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  // Load posts
  useEffect(() => {
    let cancelled = false;
    getPosts()
      .then((data) => {
        if (!cancelled) {
          setPosts(data as BlogPost[]);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load dates for accurate latest sorting
  useEffect(() => {
    let cancelled = false;
    getBlogDates().then((dates) => {
      if (!cancelled) setLatestDates(dates);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close drawer on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (searchQuery) {
          setSearchQuery("");
        } else if (mobileOpen) {
          setMobileOpen(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchQuery, mobileOpen]);

  // Extract folder categories with note counts
  const folderStats = useMemo(() => {
    const counts = new Map<string, { count: number; dir: string }>();
    posts.forEach((p) => {
      if (!p.dir) return;
      const parts = p.dir.split("/").filter(Boolean);
      // Key by the most descriptive segment (last segment)
      const folderName = parts[parts.length - 1] || p.dir;
      const existing = counts.get(folderName);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(folderName, { count: 1, dir: p.dir });
      }
    });

    return Array.from(counts.entries())
      .map(([name, { count, dir }]) => ({ name, count, dir }))
      .sort((a, b) => b.count - a.count);
  }, [posts]);

  // Sort notes for "Latest" or fallback to title order
  const latestPosts = useMemo(() => {
    if (!posts.length) return [];
    if (Object.keys(latestDates).length > 0) {
      const dated = posts
        .filter((p) => latestDates[p.fullSlug])
        .sort((a, b) => (latestDates[b.fullSlug] || "").localeCompare(latestDates[a.fullSlug] || ""));
      if (dated.length >= 5) return dated.slice(0, 8);
    }
    return posts.slice(0, 8);
  }, [posts, latestDates]);

  // Filter notes when searching in sidebar
  const searchFilteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return posts
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.dir.toLowerCase().includes(q) ||
          p.fullSlug.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [posts, searchQuery]);

  const handleSelectFolder = (folderName: string) => {
    tap(8);
    if (activeTag === folderName) {
      if (location.pathname === "/blog") {
        const next = new URLSearchParams(searchParams);
        next.delete("tag");
        next.delete("path");
        setSearchParams(next);
      } else {
        navigate("/blog");
      }
    } else {
      if (location.pathname === "/blog") {
        const next = new URLSearchParams(searchParams);
        next.set("tag", folderName);
        next.delete("path");
        setSearchParams(next);
      } else {
        navigate(`/blog?tag=${encodeURIComponent(folderName)}`);
      }
    }
    setMobileOpen(false);
  };

  const handleClearTag = () => {
    tap(6);
    if (location.pathname === "/blog") {
      const next = new URLSearchParams(searchParams);
      next.delete("tag");
      next.delete("path");
      setSearchParams(next);
    } else {
      navigate("/blog");
    }
  };

  const currentPost = useMemo(() => {
    if (!currentSlug) return null;
    return posts.find((p) => p.fullSlug === currentSlug) || null;
  }, [posts, currentSlug]);
  const currentFolder = currentPost?.dir ? currentPost.dir.split("/").pop() : "";

  // Helper to highlight matching text in search results
  const renderMatch = (text: string, query: string) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-sky-500/20 text-sky-600 dark:text-sky-300 rounded px-0.5 font-medium">
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  // Minimized icon-only rail (shown when reading or collapsed)
  const renderIconRail = () => (
    <div
      data-lenis-prevent="true"
      className="flex flex-col items-center justify-between h-full py-3.5 px-1 select-none overscroll-contain"
    >
      {/* Top: Avatar, Expand, Search, Nav icons */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        {/* Avatar */}
        <Link
          to="/"
          onClick={() => tap(6)}
          title="Sachin Yadav (Return to Portfolio)"
          className="size-8 rounded-full overflow-hidden ring-1 ring-zinc-200/90 dark:ring-zinc-800/90 hover:ring-sky-500 transition-all flex items-center justify-center group active:scale-95 mb-1"
        >
          <img
            src="https://github.com/SachinyadavAug20.png"
            alt="Sachin Yadav"
            loading="lazy"
            className="size-full object-cover group-hover:scale-105 transition-transform"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        </Link>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={handleToggleCollapse}
          title="Expand sidebar"
          className="size-8 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/60 dark:bg-zinc-800/40 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/70 dark:hover:bg-zinc-800/80 flex items-center justify-center transition-all active:scale-95"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="size-4" />
        </button>

        <div className="w-6 h-px bg-zinc-200/80 dark:bg-zinc-800/80 my-0.5" />

        {/* Search button */}
        <button
          type="button"
          onClick={() => {
            tap(6);
            setIsCollapsed(false);
            setSidebarCollapsed(false);
            setTimeout(() => searchInputRef.current?.focus(), 150);
          }}
          title="Search notes (click to open search)"
          className="size-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors active:scale-95"
        >
          <Search className="size-4" />
        </button>

        {/* All Notes Icon */}
        <Link
          to="/blog"
          onClick={() => {
            tap(6);
            if (activeTag) handleClearTag();
          }}
          title={`All Notes (${posts.length || 391})`}
          className={`size-8 rounded-lg flex items-center justify-center transition-colors active:scale-95 ${
            location.pathname === "/blog" && !activeTag
              ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 font-medium"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
          }`}
        >
          <BookOpen className="size-4" />
        </Link>

        {/* Knowledge Graph Icon */}
        <Link
          to="/graph"
          onClick={() => tap(6)}
          title="Knowledge Graph"
          className={`size-8 rounded-lg flex items-center justify-center transition-colors active:scale-95 ${
            location.pathname === "/graph"
              ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 font-medium"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
          }`}
        >
          <Network className="size-4" />
        </Link>

        {/* Social & Links Icon */}
        <Link
          to="/links"
          onClick={() => tap(6)}
          title="Social & Links"
          className={`size-8 rounded-lg flex items-center justify-center transition-colors active:scale-95 ${
            location.pathname === "/links"
              ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 font-medium"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
          }`}
        >
          <Sparkles className="size-4" />
        </Link>

        {/* Categories Icon */}
        <button
          type="button"
          onClick={() => {
            tap(6);
            setIsCollapsed(false);
            setSidebarCollapsed(false);
          }}
          title="Categories & Folders"
          className={`size-8 rounded-lg flex items-center justify-center transition-colors active:scale-95 ${
            activeTag
              ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 font-medium"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
          }`}
        >
          <Folder className="size-4" />
        </button>
      </div>

      {/* Bottom: Obsidian link */}
      <div className="flex flex-col items-center gap-1.5 pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80 w-full">
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Obsidian Vault on GitHub"
          className="size-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
        >
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  );

  // Sidebar content component (shared between desktop sidebar and mobile drawer)
  const renderSidebar = (isDrawer = false) => (
    <div data-lenis-prevent="true" className="flex flex-col h-full overflow-hidden select-none">
      {/* 1. Header / Brand */}
      <div className="px-4 py-3.5 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
        <Link
          to="/"
          onClick={() => {
            tap(6);
            if (isDrawer) setMobileOpen(false);
          }}
          className="group flex items-center gap-2.5 text-zinc-900 dark:text-zinc-100 hover:text-sky-500 dark:hover:text-sky-400 transition-colors min-w-0"
        >
          <img
            src="https://github.com/SachinyadavAug20.png"
            alt="Sachin Yadav"
            loading="lazy"
            className="size-7 rounded-full object-cover ring-1 ring-zinc-200/80 dark:ring-zinc-800/80 shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
          <span className="font-semibold text-sm leading-none truncate group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors">
            Sachin Yadav
          </span>
        </Link>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isDrawer && (
            <button
              type="button"
              onClick={handleToggleCollapse}
              title="Minimize sidebar to icons"
              className="size-7 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 flex items-center justify-center transition-colors"
              aria-label="Minimize sidebar"
            >
              <PanelLeftClose className="size-3.5" />
            </button>
          )}

          {isDrawer ? (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="size-7 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 flex items-center justify-center transition-colors"
              aria-label="Close sidebar"
            >
              <X className="size-4" />
            </button>
          ) : (
            <Link
              to="/"
              onClick={() => tap(6)}
              title="Return to Portfolio"
              className="size-7 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 flex items-center justify-center transition-colors"
            >
              <Home className="size-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* 2. Search / Filter Box */}
      <div className="p-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 dark:text-zinc-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes & topics..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-zinc-200/90 dark:border-zinc-800/90 bg-white/70 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
          />
          {searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery("");
                searchInputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center justify-center"
              aria-label="Clear filter"
            >
              <X className="size-3" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden font-mono text-[9px] text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded px-1 sm:block">
              esc
            </kbd>
          )}
        </div>
      </div>

      {/* 3. Navigation & Sections (Scrollable Area) */}
      <div
        data-lenis-prevent="true"
        className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-5 scrollbar-thin"
      >
        {/* If Searching: Display Instant Search Results */}
        {searchQuery.trim() ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Search Results ({searchFilteredPosts.length})
              </span>
              <button
                onClick={() => setSearchQuery("")}
                className="text-[10px] text-sky-500 hover:underline"
              >
                Clear
              </button>
            </div>

            {searchFilteredPosts.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
                No matching notes found.
              </div>
            ) : (
              <ul className="space-y-1">
                {searchFilteredPosts.map((post) => {
                  const isActive = currentSlug === post.fullSlug;
                  return (
                    <li key={post.fullSlug}>
                      <Link
                        to={`/blog/post/${post.fullSlug}`}
                        onClick={() => {
                          tap(8);
                          setMobileOpen(false);
                        }}
                        className={`group flex flex-col px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                          isActive
                            ? "bg-sky-500/10 text-sky-600 dark:text-sky-300 font-medium border-l-2 border-sky-500 pl-2"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                        }`}
                      >
                        <span className="truncate">
                          {renderMatch(post.title, searchQuery)}
                        </span>
                        {post.dir && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                            {post.dir.split("/").pop()}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <>
            {/* Quick Overview Links */}
            <div className="space-y-1">
              <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Navigation
              </span>
              <ul className="space-y-0.5 pt-1">
                <li>
                  <Link
                    to="/blog"
                    onClick={() => {
                      tap(6);
                      if (activeTag) handleClearTag();
                      setMobileOpen(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      location.pathname === "/blog" && !activeTag
                        ? "bg-sky-500/10 text-sky-600 dark:text-sky-300 font-medium border-l-2 border-sky-500 pl-2"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen className="size-3.5 text-zinc-400 dark:text-zinc-500" />
                      <span>All Notes</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500 font-mono">
                      {posts.length || 330}
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/graph"
                    onClick={() => {
                      tap(6);
                      setMobileOpen(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      location.pathname === "/graph"
                        ? "bg-sky-500/10 text-sky-600 dark:text-sky-300 font-medium border-l-2 border-sky-500 pl-2"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Network className="size-3.5 text-zinc-400 dark:text-zinc-500" />
                      <span>Knowledge Graph</span>
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/links"
                    onClick={() => {
                      tap(6);
                      setMobileOpen(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      location.pathname === "/links"
                        ? "bg-sky-500/10 text-sky-600 dark:text-sky-300 font-medium border-l-2 border-sky-500 pl-2"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="size-3.5 text-zinc-400 dark:text-zinc-500" />
                      <span>Social &amp; Links</span>
                    </span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Folder & Topic Categories */}
            {folderStats.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Categories
                  </span>
                  {activeTag && (
                    <button
                      onClick={handleClearTag}
                      className="text-[10px] text-sky-500 hover:underline"
                    >
                      Reset filter
                    </button>
                  )}
                </div>

                <ul className="space-y-0.5 pt-1">
                  {(showAllFolders ? folderStats : folderStats.slice(0, 7)).map(
                    (folder) => {
                      const isSelected =
                        activeTag === folder.name ||
                        (currentFolder ? currentFolder === folder.name : false);
                      return (
                        <li key={folder.name}>
                          <button
                            type="button"
                            onClick={() => handleSelectFolder(folder.name)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                              isSelected
                                ? "bg-sky-500/15 text-sky-600 dark:text-sky-300 font-medium border-l-2 border-sky-500 pl-2"
                                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100"
                            }`}
                          >
                            <span className="flex items-center gap-2 min-w-0 pr-1">
                              {isSelected ? (
                                <FolderOpen className="size-3.5 shrink-0 text-sky-500" />
                              ) : (
                                <Folder className="size-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                              )}
                              <span className="truncate">{folder.name}</span>
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500 font-mono shrink-0">
                              {folder.count}
                            </span>
                          </button>
                        </li>
                      );
                    }
                  )}
                </ul>

                {folderStats.length > 7 && (
                  <button
                    type="button"
                    onClick={() => setShowAllFolders(!showAllFolders)}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-sky-500 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                  >
                    {showAllFolders ? (
                      <>
                        <ChevronDown className="size-3" />
                        <span>Show fewer</span>
                      </>
                    ) : (
                      <>
                        <ChevronRight className="size-3" />
                        <span>+{folderStats.length - 7} more categories</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Latest Notes Section */}
            {latestPosts.length > 0 && (
              <div className="space-y-1">
                <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Recent Notes
                </span>
                <ul className="space-y-0.5 pt-1">
                  {latestPosts.map((post) => {
                    const isActive = currentSlug === post.fullSlug;
                    return (
                      <li key={post.fullSlug}>
                        <Link
                          to={`/blog/post/${post.fullSlug}`}
                          onClick={() => {
                            tap(8);
                            setMobileOpen(false);
                          }}
                          className={`group flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                            isActive
                              ? "bg-sky-500/10 text-sky-600 dark:text-sky-300 font-medium border-l-2 border-sky-500 pl-2"
                              : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                          }`}
                        >
                          <FileText
                            className={`size-3.5 shrink-0 mt-0.5 ${
                              isActive
                                ? "text-sky-500"
                                : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300"
                            }`}
                          />
                          <span className="truncate leading-snug">{post.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* 4. Footer Bar */}
      <div className={`p-3 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 ${isDrawer ? "pb-8" : ""}`}>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{loading ? "syncing notes..." : `${posts.length || 330} notes synced`}</span>
        </span>

        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          title="Open Obsidian Vault repository"
        >
          <span>Obsidian</span>
          <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );

  return (
    <>
      {/* ============================================================ */}
      {/* DESKTOP SIDEBAR: Fixed left docs rail                          */}
      {/* ============================================================ */}
      <aside
        data-lenis-prevent="true"
        className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-30 bg-zinc-50/95 dark:bg-[#070c18]/95 backdrop-blur-xl border-r border-zinc-200/80 dark:border-zinc-800/80 overscroll-contain transition-[width] duration-200 ${
          isCollapsed ? "w-16" : "w-64 lg:w-72"
        }`}
        aria-label="Documentation sidebar"
      >
        {isCollapsed ? renderIconRail() : renderSidebar(false)}
      </aside>

      {/* ============================================================ */}
      {/* MOBILE BAR: Minimal sticky header on small devices            */}
      {/* ============================================================ */}
      <header className="md:hidden sticky top-0 z-30 h-14 bg-white/95 dark:bg-[#070c18]/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => {
            tap(8);
            setMobileOpen(true);
          }}
          className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 hover:text-sky-500 dark:hover:text-sky-400 transition-colors py-1.5 px-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-800/50 active:scale-95"
          aria-label="Open documentation sidebar"
        >
          <PanelLeftOpen className="size-4 text-sky-500" />
          <span className="text-xs font-semibold tracking-tight">Docs &amp; Notes</span>
          {activeTag && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400">
              {activeTag}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2">
          <Link
            to="/graph"
            onClick={() => tap(6)}
            title="Knowledge Graph"
            className="size-8 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors active:scale-95"
          >
            <Network className="size-4" />
          </Link>
          <Link
            to="/"
            onClick={() => tap(6)}
            title="Return to Portfolio"
            className="size-8 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors active:scale-95"
          >
            <Home className="size-4" />
          </Link>
        </div>
      </header>

      {/* ============================================================ */}
      {/* MOBILE DRAWER: Off-canvas slide-out sheet                     */}
      {/* ============================================================ */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-[100] md:hidden">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              aria-hidden="true"
            />

            {/* Slide-out drawer sheet */}
            <motion.div
              data-lenis-prevent="true"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="relative w-80 max-w-[85vw] h-full bg-white dark:bg-[#070c18] border-r border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overscroll-contain"
            >
              {renderSidebar(true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BlogSidebar;