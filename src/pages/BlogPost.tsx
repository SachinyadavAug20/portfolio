import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Clock, Eye, ChevronDown, Share2, AArrowDown, AArrowUp, X, Link2, FolderOpen } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkWikiLink from "remark-wiki-link";
import remarkCallouts from "remark-callouts";
import SEOHead from "../seo/SEOHead";
import { getPostByFullSlug, getPosts, getPostsInDir, leadsWithTitle } from "../blog/posts";
import { getBacklinks } from "../blog/backlinks";
import { OWNER, REPO, BRANCH } from "../blog/config";
import type { BlogPost as BlogPostType } from "../blog/types";
import { useViews } from "../hooks/useViews";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { scrollToY } from "../lib/smoothScroll";
import remarkObsidianImages from "../blog/remark-obsidian-images";
import { rehypeMermaid } from "../blog/rehype-mermaid";
import rehypePrism from "rehype-prism-plus/common";
import { refractor } from "refractor";
import refractorJsx from "refractor/jsx";
import refractorTsx from "refractor/tsx";
import refractorProperties from "refractor/properties";
import refractorVim from "refractor/vim";
import ReadingProgress from "../components/ReadingProgress";
import ReadAloud from "../components/ReadAloud";
import BackToTop from "../components/BackToTop";
import { notify } from "../lib/toast";
import { tap } from "../lib/haptics";
import { createPortal } from "react-dom";
import "prismjs/themes/prism-tomorrow.css";

/* the common refractor set covers ~50 languages for a fraction of the
   full grammar bundle — the vault also fences tsx/jsx/properties/vim,
   so register those four by hand instead of shipping every language */
refractor.register(refractorJsx);
refractor.register(refractorTsx);
refractor.register(refractorProperties);
refractor.register(refractorVim);

const MotionLink = motion.create(Link);
const PRESS = {
  whileTap: { scale: 0.94 },
  transition: { type: "spring", stiffness: 650, damping: 30 },
} as const;

/* reader font sizes — the CSS defaults are steps 1 (base/md). The chosen
   step is written to localStorage and rehydrated before first paint of the
   article (content loads async anyway, so no flash). */
const READER_STEPS = [
  { base: "0.95rem", md: "1.05rem" },
  { base: "1.0625rem", md: "1.15rem" },
  { base: "1.15rem", md: "1.25rem" },
  { base: "1.28rem", md: "1.4rem" },
] as const;
const READER_KEY = "portfolio:reader-size";

interface TocItem {
  level: number;
  text: string;
  id: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function extractHeadings(markdown: string): TocItem[] {
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, "");
  const headings: TocItem[] = [];
  const regex = /^(#{2,4})\s+(.+)$/gm;
  let match;
  while ((match = regex.exec(withoutCode)) !== null) {
    const text = match[2].trim();
    const id = slugify(text);
    headings.push({ level: match[1].length, text, id });
  }
  return headings;
}

/* `#` affordance beside headings — empty element so ReadAloud's innerText
   never says "hash"; the glyph comes from CSS ::after */
const HeadingHash = ({ id, text }: { id: string; text: string }) => (
  <a
    href={`#${id}`}
    aria-label={`Link to ${text}`}
    className="heading-hash"
    onClick={(e) => {
      e.preventDefault();
      const el = document.getElementById(id);
      if (el) scrollToY(el.getBoundingClientRect().top + window.scrollY - 96);
      window.history.replaceState(null, "", `#${id}`);
    }}
  />
);

const TableOfContents = ({ headings }: { headings: TocItem[] }) => {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    setActiveId("");
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      window.requestAnimationFrame(() => {
        const scrollTop = window.scrollY + 100;
        let current = "";
        for (const h of headings) {
          const el = document.getElementById(h.id);
          if (el && el.getBoundingClientRect().top + window.scrollY <= scrollTop) {
            current = h.id;
          }
        }
        if (current) setActiveId(current);
        ticking = false;
      });
      ticking = true;
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [headings]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 96;
      scrollToY(top);
    }
  };

  if (headings.length === 0) return null;

  return (
    <nav className="sticky top-24">
      <h4 className="text-xs font-semibold text-white-50/40 uppercase tracking-wider mb-4">
        On this page
      </h4>
      <ul className="space-y-1.5 border-l border-black-50">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={(e) => {
                e.preventDefault();
                handleClick(h.id);
              }}
                      className={`block text-[13px] leading-snug py-1.5 border-l transition-colors ${
                        h.level === 3 ? "pl-6" : h.level === 4 ? "pl-8" : "pl-4"
                      } ${
                activeId === h.id
                  ? "border-blue-50 text-blue-50"
                  : "border-transparent text-white-50/40 hover:text-white-50/70 hover:border-white-50/30"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

const MermaidChart = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [Mermaid, setMermaid] = useState<typeof import("mermaid") | null>(null);

  useEffect(() => {
    import("mermaid").then((mod) => {
      mod.default.initialize({ startOnLoad: false, theme: "dark" });
      setMermaid(mod);
    });
  }, []);

  useEffect(() => {
    if (Mermaid && ref.current) {
      ref.current.innerHTML = chart;
      Mermaid.default.run({ nodes: [ref.current], suppressErrors: true });
    }
  }, [Mermaid, chart]);

  if (!Mermaid) {
    return <div className="my-4 flex justify-center h-24 bg-black-200 rounded animate-pulse" />;
  }

  return <div ref={ref} className="my-4 flex justify-center" />;
};

/* custom rehype-raw element handled in the markdown component map */
const mermaidComponents = {
  "mermaid-diagram": ({ children }: { children?: React.ReactNode }) => {
    const chart = typeof children === "string" ? children : String(children);
    return <MermaidChart chart={chart} />;
  },
};

const ImageWithFallback = (props: Record<string, unknown>) => {
  const raw = props["data-urls"];
  const src = props.src;
  const urls: string[] = useMemo(() => {
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { /* ignore */ }
    }
    return [String(src)];
  }, [raw, src]);

  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  /* lightbox: escape closes, scroll stays put behind the overlay */
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  if (idx >= urls.length || !urls[idx]) return null;
  const alt = typeof props.alt === "string" ? props.alt : "";

  return (
    <>
      <div className={`relative overflow-hidden rounded ${!loaded ? "bg-black-200 min-h-[100px]" : ""}`}>
        <img
          {...(props as React.ImgHTMLAttributes<HTMLImageElement>)}
          key={idx}
          src={urls[idx]}
          loading="lazy"
          decoding="async"
          title="Click to enlarge"
          onClick={() => setExpanded(true)}
          className={`cursor-zoom-in transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setIdx((i) => i + 1);
            setLoaded(false);
          }}
        />
      </div>
      {expanded &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={alt || "Image preview"}
            onClick={() => setExpanded(false)}
            className="fixed inset-0 z-[180] flex items-center justify-center bg-black-900/90 backdrop-blur-sm p-4"
          >
            <img
              src={urls[idx]}
              alt={alt}
              className="max-h-[86vh] max-w-[96vw] rounded-xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Close image"
              className="absolute top-4 right-4 p-2.5 rounded-full bg-black-200/80 border border-black-50 text-white-50 hover:text-foreground hover:bg-black-100 transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>,
          document.body,
        )}
    </>
  );
};

const CodeBlock = ({ children, className, ...props }: any) => {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const lang =
    typeof className === "string" ? className.match(/language-(\S+)/)?.[1] : "";

  const handleCopy = () => {
    if (copied) return;
    const text = preRef.current?.textContent || "";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre ref={preRef} className={className} {...props}>
        {children}
      </pre>
      <div className="absolute top-2 right-2 flex items-center gap-1.5">
        {lang && (
          <span
            data-tts="off"
            className="hidden sm:block max-w-24 truncate px-1.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded border border-black-50 bg-black-50/60 text-white-50/45"
          >
            {lang}
          </span>
        )}
        <button
          data-tts="off"
          onClick={handleCopy}
          aria-live="polite"
          className="px-2.5 py-1.5 text-xs rounded-md opacity-90 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity bg-black-50 hover:bg-black text-white-50"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
};

const Skeleton = () => (
  <section className="section-padding pt-5 min-h-screen">
    <div className="w-full h-full md:px-10 max-w-4xl mx-auto">
      <div className="skeleton h-5 w-16 bg-black-200 rounded mb-8" />
      <div className="space-y-3">
        <div className="skeleton h-8 w-3/4 bg-black-200 rounded" />
        <div className="skeleton h-4 w-full bg-black-200 rounded" />
        <div className="skeleton h-4 w-5/6 bg-black-200 rounded" />
        <div className="skeleton h-4 w-4/6 bg-black-200 rounded" />
        <div className="skeleton h-32 w-full bg-black-200 rounded mt-6" />
        <div className="skeleton h-4 w-full bg-black-200 rounded" />
        <div className="skeleton h-4 w-3/4 bg-black-200 rounded" />
      </div>
      {/* surfaces at 4s (CSS-delayed) so a slow GitHub looks intentional */}
      <div className="skeleton-hint" role="status">
        still fetching the note from github…{" "}
        <button
          type="button"
          className="skeleton-retry"
          onClick={() => window.location.reload()}
        >
          retry
        </button>
      </div>
    </div>
  </section>
);

const IMG_EXT = /\.(png|jpe?g|gif|webp|bmp)$/i;

function extractExcerpt(markdown: string): string {
  const cleaned = markdown
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/!\[\[.*?\]\]/g, "")
    .replace(/[#*_~>|\[\]`-]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= 160) return cleaned;
  return cleaned.slice(0, 157).replace(/\s+\S*$/, "") + "...";
}

type SlugIndex = {
  byPath: Map<string, string>; // lowercased full path → real slug
  byBase: Map<string, string[]>; // lowercased basename → real slugs
};

function buildSlugIndex(posts: { fullSlug: string }[]): SlugIndex {
  const byPath = new Map<string, string>();
  const byBase = new Map<string, string[]>();
  for (const p of posts) {
    const low = p.fullSlug.toLowerCase();
    byPath.set(low, p.fullSlug);
    const base = low.slice(low.lastIndexOf("/") + 1);
    const list = byBase.get(base);
    if (list) list.push(p.fullSlug);
    else byBase.set(base, [p.fullSlug]);
  }
  return { byPath, byBase };
}

/* [[Notes/…/0.Intro|0.Intro]] → case-preserved real slug; unique basenames
   and unique path tails resolve too, ambiguous bare names stay honest dead
   links (pageResolver gets no source-note context in this plugin) */
function makeWikiResolver(index: SlugIndex | null) {
  return (raw: string): string[] => {
    const path = raw.split("|")[0].trim();
    const clean = path.replace(/^notes\//i, "").replace(/\.md$/i, "");
    if (!index) return [clean];
    const exact = index.byPath.get(clean.toLowerCase());
    if (exact) return [exact];
    const low = clean.toLowerCase();
    const base = low.slice(low.lastIndexOf("/") + 1);
    const sameBase = index.byBase.get(base);
    if (sameBase?.length === 1) return sameBase;
    const suffix = [...index.byPath.entries()]
      .filter(([k]) => k.endsWith("/" + low))
      .map(([, v]) => v);
    if (suffix.length === 1) return suffix;
    return [clean];
  };
}

const BlogPost = () => {
  const { "*": fullSlug } = useParams();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") ?? "";

  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const { views } = useViews(post?.fullSlug);
  const pageRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  /* reader text size — remembered across notes and visits. The read is
     deferred a tick (repo convention) so the effect stays free of sync
     setState, which the compiler flags. */
  const [readerStep, setReaderStep] = useState(1);
  useEffect(() => {
    let dead = false;
    Promise.resolve().then(() => {
      if (dead) return;
      try {
        const raw = localStorage.getItem(READER_KEY);
        if (raw === null) return;
        const n = Number(raw);
        if (Number.isInteger(n) && n >= 0 && n < READER_STEPS.length) setReaderStep(n);
      } catch {
        /* private mode — default size */
      }
    });
    return () => {
      dead = true;
    };
  }, []);
  const bumpReader = (delta: number) => {
    const n = Math.min(READER_STEPS.length - 1, Math.max(0, readerStep + delta));
    if (n === readerStep) return;
    tap(6);
    setReaderStep(n);
    try {
      localStorage.setItem(READER_KEY, String(n));
    } catch {
      /* private mode — size lives for this note only */
    }
  };

  // Entrance choreography (timings from UX motion research):
  // content-surface band 250–400ms, ease-out, ~200ms total stagger spread,
  // ~20% shorter on mobile, transform+opacity only, skipped for reduced motion.
  useGSAP(
    () => {
      if (loading || !post) return;
      if (reduced) return;
      const scope = pageRef.current;
      if (!scope) return;
      const els = gsap.utils.toArray<HTMLElement>(".post-anim", scope);
      if (!els.length) return;

      const mobile = window.matchMedia("(max-width: 768px)").matches;
      gsap.fromTo(
        els,
        { y: mobile ? 8 : 12, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: mobile ? 0.24 : 0.3,
          ease: "power2.out",
          stagger: { amount: mobile ? 0.15 : 0.2 },
          clearProps: "transform,opacity",
        },
      );
    },
    { scope: pageRef, dependencies: [loading, post?.fullSlug, reduced], revertOnUpdate: true },
  );

  useEffect(() => {
    scrollToY(0, true);
  }, [fullSlug]);

  useEffect(() => {
    if (!fullSlug) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPostByFullSlug(fullSlug)
      .then((p) => {
        if (!cancelled) {
          setPost(p ?? null);
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
  }, [fullSlug]);

  useEffect(() => {
    if (!post?.fullSlug) return;
    import("../blog/github").then(({ fetchLastUpdated }) => {
      fetchLastUpdated(post.fullSlug).then(setLastUpdated);
    });
  }, [post?.fullSlug]);

  const readingTime = useMemo(() => {
    if (!post?.content) return 0;
    const words = post.content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [post?.content]);

  const ogImage = useMemo(() => {
    if (!post?.content) return undefined;
    /* vault embeds are wikilinks: ![[Pasted image ….png]] */
    const wiki = post.content.match(/!\[\[([^|\]]+?)(?:\|\d+)?\]\]/);
    const md = post.content.match(/!\[.*?\]\((.+?)\)/);
    const raw = (wiki ? wiki[1] : md ? md[1] : "").trim();
    if (!raw) return undefined;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (!IMG_EXT.test(raw)) return undefined;
    const file = raw.split("/").pop();
    const path = `Notes/${post.dir ? `${post.dir}/` : ""}attachement/${file}`;
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${encoded}`;
  }, [post?.content, post?.dir]);

  const excerpt = useMemo(() => {
    if (!post?.content) return "";
    return extractExcerpt(post.content);
  }, [post?.content]);

  const headings = useMemo(() => {
    if (!post?.content) return [];
    return extractHeadings(post.content);
  }, [post?.content]);

  /* the page <h1> stands down when the note opens with its own title —
     the markdown heading already says it (see leadsWithTitle) */
  const showTitle =
    !!post?.content && !!post.title && !leadsWithTitle(post.content, post.title);

  const backTo = from ? `/blog?path=${from}` : "/blog";

  /* nav key falls back to the note's own folder so direct visits get prev/next */
  const dirKey = from || post?.dir || "";
  const [dirPosts, setDirPosts] = useState<BlogPostType[]>([]);
  useEffect(() => {
    let dead = false;
    if (!dirKey) return;
    getPostsInDir(dirKey).then((ps) => {
      if (!dead) setDirPosts(ps);
    });
    return () => {
      dead = true;
    };
  }, [dirKey]);

  const currentIdx = dirPosts.findIndex((p) => p.fullSlug === fullSlug);
  const prev = currentIdx > 0 ? dirPosts[currentIdx - 1] : null;
  const next =
    currentIdx >= 0 && currentIdx < dirPosts.length - 1
      ? dirPosts[currentIdx + 1]
      : null;

  /* "more in this folder" — the siblings nearest this note */
  const [siblings, setSiblings] = useState<BlogPostType[]>([]);
  useEffect(() => {
    let dead = false;
    if (!post?.dir) return;
    getPostsInDir(post.dir).then((ps) => {
      if (!dead) setSiblings(ps);
    });
    return () => {
      dead = true;
    };
  }, [post?.dir]);

  const related = useMemo(() => {
    const i = siblings.findIndex((p) => p.fullSlug === fullSlug);
    if (i === -1) return siblings.filter((p) => p.fullSlug !== fullSlug).slice(0, 4);
    return [
      ...siblings.slice(Math.max(0, i - 2), i),
      ...siblings.slice(i + 1, i + 3),
    ];
  }, [siblings, fullSlug]);

  /* wiki links that point at this note */
  const [backlinks, setBacklinks] = useState<{ from: string[]; titles: Record<string, string> }>({
    from: [],
    titles: {},
  });
  useEffect(() => {
    let dead = false;
    if (!post?.fullSlug) return;
    getBacklinks(post.fullSlug).then((r) => {
      if (!dead) setBacklinks(r);
    });
    return () => {
      dead = true;
    };
  }, [post?.fullSlug]);

  /* ← / → and a horizontal swipe walk the folder like a gallery;
     overlays and inputs keep the keys */
  const navigate = useNavigate();
  useEffect(() => {
    const go = (slug: string) => navigate(`/blog/post/${slug}${from ? `?from=${from}` : ""}`);
    const blocked = () => {
      const el = document.activeElement;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          (el as HTMLElement).isContentEditable)
      )
        return true;
      if (document.body.style.overflow === "hidden") return true;
      return false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (blocked()) return;
      const target = e.key === "ArrowLeft" ? prev : e.key === "ArrowRight" ? next : null;
      if (!target) return;
      e.preventDefault();
      go(target.fullSlug);
    };
    /* touch: a deliberate horizontal drag flips to the neighbouring note —
       vertical scrolling and taps must never trip it */
    let startX = 0;
    let startY = 0;
    let tracking = false;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || blocked()) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (window.getSelection()?.toString()) return;
      const target = dx < 0 ? next : prev;
      if (!target) return;
      go(target.fullSlug);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [prev, next, from, navigate]);

  const remarkPlugin = useMemo(
    () => (post?.dir ? remarkObsidianImages("Notes/" + post.dir) : remarkObsidianImages("")),
    [post?.dir],
  );

  /* real slug index so [[Notes/…/0.Intro|0.Intro]] resolves case-preserved;
     async setState in a callback keeps the compiler/lint happy */
  const [slugIndex, setSlugIndex] = useState<SlugIndex | null>(null);
  useEffect(() => {
    let dead = false;
    getPosts().then((ps) => {
      if (dead) return;
      setSlugIndex(buildSlugIndex(ps));
    });
    return () => {
      dead = true;
    };
  }, []);

  /* stable plugin/component arrays — inline literals made ReactMarkdown
     rebuild its whole processor on every parent re-render */
  type MdProps = Parameters<typeof ReactMarkdown>[0];

  /* rehype-raw's parse5 pass is ~120KB of BlogPost's chunk — only notes that
     really carry raw tags need it, so the plugin is pulled in on demand.
     The render gate below keeps such notes on the skeleton for the (cached,
     ms-scale) import instead of flashing an unprocessed body. False positives
     from the tag regex are harmless: they just keep today's full pipeline. */
  const needsRaw = !!post?.content && /<\/?[a-zA-Z][\s\S]*?>/.test(post.content);
  const [rawPlugin, setRawPlugin] = useState<NonNullable<MdProps["rehypePlugins"]>[number] | null>(null);
  useEffect(() => {
    if (!needsRaw || rawPlugin) return;
    let dead = false;
    import("rehype-raw").then(({ default: rehypeRaw }) => {
      if (!dead) setRawPlugin(() => rehypeRaw);
    });
    return () => {
      dead = true;
    };
  }, [needsRaw, rawPlugin]);

  const remarkPlugins = useMemo<NonNullable<MdProps["remarkPlugins"]>>(
    () => [
      remarkGfm,
      remarkBreaks,
      [
        remarkWikiLink,
        {
          pageResolver: makeWikiResolver(slugIndex),
          hrefTemplate: (link: string) => `/blog/post/${link}`,
          permalinks: slugIndex ? [...slugIndex.byPath.values()] : [],
          wikiLinkClassName: "wiki-link internal",
        },
      ],
      remarkCallouts,
      remarkPlugin,
    ],
    [remarkPlugin, slugIndex],
  );
  const rehypePlugins = useMemo<NonNullable<MdProps["rehypePlugins"]>>(
    () => {
      const plugins: NonNullable<MdProps["rehypePlugins"]> = [rehypeMermaid];
      if (needsRaw && rawPlugin) plugins.push(rawPlugin);
      plugins.push([rehypePrism, { ignoreMissing: true }]);
      return plugins;
    },
    [needsRaw, rawPlugin],
  );
  const mdComponents = useMemo(
    (): Components => ({
      pre: (props) => <CodeBlock {...props} />,
      img: (props) => <ImageWithFallback {...props} />,
      h2: ({ children, ...props }) => {
        const text = extractText(children);
        const id = slugify(text);
        return <h2 id={id} className="scroll-mt-6" {...props}>{children}<HeadingHash id={id} text={text} /></h2>;
      },
      h3: ({ children, ...props }) => {
        const text = extractText(children);
        const id = slugify(text);
        return <h3 id={id} className="scroll-mt-6" {...props}>{children}<HeadingHash id={id} text={text} /></h3>;
      },
      h4: ({ children, ...props }) => {
        const text = extractText(children);
        const id = slugify(text);
        return <h4 id={id} className="scroll-mt-6" {...props}>{children}<HeadingHash id={id} text={text} /></h4>;
      },
      code({ className, children, ...props }) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
      a: ({ href = "", className, children, ...props }) => {
        if (className?.includes("wiki-link")) {
          /* plugin keeps the raw [[path|alias]] text — show the alias,
             or the basename for bare links, and route internally */
          const raw = typeof children === "string" ? children : extractText(children);
          const pipe = raw.lastIndexOf("|");
          const label =
            pipe !== -1
              ? raw.slice(pipe + 1)
              : raw.includes("/")
                ? raw.slice(raw.lastIndexOf("/") + 1)
                : raw;
          return (
            <Link
              to={href}
              className={className}
              title={className.includes("new") ? `${href} — no such note` : href}
              {...props}
            >
              {label || raw}
            </Link>
          );
        }
        if (/^https?:\/\//.test(href)) {
          return (
            <a href={href} className={className} target="_blank" rel="noopener noreferrer" {...props}>
              {children}
            </a>
          );
        }
        if (href.startsWith("/")) {
          /* markdown-style links between notes get the same chip treatment
             as [[wikilinks]] — an index note full of them reads as a menu,
             not a wall of underlines */
          if (href.startsWith("/blog/post/")) {
            const raw =
              typeof children === "string" ? children : extractText(children);
            const pipe = raw.lastIndexOf("|");
            const label = pipe !== -1 ? raw.slice(pipe + 1) : raw;
            return (
              <Link
                to={href}
                className={`${className ?? ""} wiki-link internal`.trim()}
                {...props}
              >
                {label || children}
              </Link>
            );
          }
          return (
            <Link to={href} className={className} {...props}>
              {children}
            </Link>
          );
        }
        return (
          <a href={href} className={className} {...props}>
            {children}
          </a>
        );
      },
      /* custom rehype-raw tag: spread keeps it out of the intrinsic map */
      ...mermaidComponents,
    }),
    [],
  );

  const handleShare = async () => {
    if (!post) return;
    const url = window.location.href;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: post.title, text: post.title, url });
        tap(12);
      } else {
        await navigator.clipboard.writeText(url);
        tap(8);
        void notify("success", "Link copied to clipboard");
      }
    } catch {
      // Share sheet dismissed or clipboard unavailable — nothing to report.
    }
  };

  if (loading || (needsRaw && !rawPlugin)) return <Skeleton />;

  if (error || !post) {
    return (
      <>
      <SEOHead title="Post not found" description={excerpt || "Blog post not found"} path={`/blog/post/${fullSlug || ""}`} robots="noindex" />
      <section className="section-padding pt-10 min-h-screen">
        <div className="w-full h-full md:px-10 max-w-md mx-auto text-center">
          <h1 className="text-3xl font-bold mb-3">This note isn't here</h1>
          <p className="text-white-50/70 mb-2">
            {error ?? `No note matches "${fullSlug ?? ""}".`}
          </p>
          <p className="text-white-50/45 text-sm mb-8">
            It may have been renamed, moved, or never written.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to={backTo}
              className="chip chip-filter px-4 py-2 text-sm rounded-full transition-colors"
            >
              &larr; Back to blog
            </Link>
            <Link
              to="/graph"
              className="chip px-4 py-2 text-sm rounded-full bg-black-200 text-blue-50 hover:bg-black-50 hover:text-foreground transition-colors"
            >
              Browse the graph
            </Link>
          </div>
        </div>
      </section>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title={`${post.title} — Blog`}
        description={excerpt}
        path={`/blog/post/${post.fullSlug}`}
        type="article"
        image={ogImage}
        datePublished={lastUpdated ?? undefined}
        dateModified={lastUpdated ?? undefined}
      />
      <ReadingProgress />
      <BackToTop />
      <section className="section-padding pt-5 min-h-screen">
      <div ref={pageRef} className="w-full h-full md:px-10 max-w-6xl mx-auto">
        <Link
          to={backTo}
          className="post-anim text-blue-50 hover:text-foreground transition-colors inline-flex items-center gap-2 mb-6 px-2 py-2 -mx-2 -my-2 active:opacity-70"
        >
          &larr; Back
        </Link>
        <div className="flex gap-12">
          <div className="flex-1 min-w-0 max-w-3xl">
            {showTitle && (
              <h1 className="post-anim text-2xl md:text-3xl font-bold leading-tight text-foreground mb-4">
                {post.title}
              </h1>
            )}
            <div className="post-anim flex items-center gap-4 text-white-50 text-sm mb-4 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" />
                {readingTime} min read
              </span>
              {lastUpdated && (
                <span className="text-white-50/60">
                  {new Date(lastUpdated).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
              {views !== null && (
                <span className="inline-flex items-center gap-1 text-white-50/60">
                  <Eye className="size-3.5" />
                  {views}
                </span>
              )}
              <ReadAloud />
              <div className="flex items-center gap-1.5 bg-black-200 border border-black-50 rounded-lg px-2 py-1.5">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-md text-xs text-white-50/60 hover:text-foreground hover:bg-black-100 transition-colors"
                  title="Share"
                >
                  <Share2 className="size-4" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>
              <div
                className="flex items-center gap-0.5 bg-black-200 border border-black-50 rounded-lg px-1 py-1"
                role="group"
                aria-label="Text size"
              >
                <button
                  type="button"
                  onClick={() => bumpReader(-1)}
                  disabled={readerStep === 0}
                  aria-label="Smaller text"
                  title="Smaller text"
                  className="p-2 rounded-md text-white-50/60 hover:text-foreground hover:bg-black-100 disabled:opacity-30 transition-colors"
                >
                  <AArrowDown className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => bumpReader(1)}
                  disabled={readerStep === READER_STEPS.length - 1}
                  aria-label="Larger text"
                  title="Larger text"
                  className="p-2 rounded-md text-white-50/60 hover:text-foreground hover:bg-black-100 disabled:opacity-30 transition-colors"
                >
                  <AArrowUp className="size-4" />
                </button>
              </div>
            </div>
            {post.dir && (
              <div className="post-anim flex flex-wrap gap-2 mb-8">
                {post.dir.split("/").filter(Boolean).map((tag) => (
                  <MotionLink
                    key={tag}
                    to={`/blog?tag=${encodeURIComponent(tag)}`}
                    {...PRESS}
                    className="chip px-3.5 py-1.5 text-xs rounded-full bg-black-200/80 text-blue-50/70 hover:bg-blue-500/15 hover:text-blue-50 border border-black-50/50 hover:border-blue-50/30"
                  >
                    {tag}
                  </MotionLink>
                ))}
              </div>
            )}
            {headings.length > 0 && (
              <details className="post-anim lg:hidden mb-4 rounded-xl border border-black-50 bg-black-100/60 overflow-hidden group">
                <summary className="px-4 py-3 text-sm font-medium text-white-50 cursor-pointer flex items-center justify-between select-none list-none [&::-webkit-details-marker]:hidden">
                  Table of contents
                  <ChevronDown className="size-4 text-white-50/50 transition-transform group-open:rotate-180" />
                </summary>
                <ul className="px-4 pb-3 pt-1 border-t border-black-50 space-y-0.5">
                  {headings.map((h) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          const el = document.getElementById(h.id);
                          if (el) {
                            const top =
                              el.getBoundingClientRect().top + window.scrollY - 96;
                            window.scrollTo({ top, behavior: "smooth" });
                          }
                        }}
                        className={`block py-2 text-sm text-white-50/60 hover:text-foreground transition-colors active:text-foreground ${
                          h.level === 3 ? "pl-4" : ""
                        }`}
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <article
              className="post-anim prose prose-invert max-w-none blog-content mt-2"
              style={
                {
                  "--reader-fs": READER_STEPS[readerStep].base,
                  "--reader-fs-md": READER_STEPS[readerStep].md,
                } as React.CSSProperties
              }
            >
              {post.content && (
                <ReactMarkdown
                  remarkPlugins={remarkPlugins}
                  rehypePlugins={rehypePlugins}
                  components={mdComponents}
                >
                  {post.content}
                </ReactMarkdown>
              )}
            </article>
            {(backlinks.from.length > 0 || related.length > 0) && (
              <div className="post-anim mt-12 grid gap-4 md:grid-cols-2">
                {backlinks.from.length > 0 && (
                  <section className="rounded-2xl border border-black-50 bg-black-100/40 p-5">
                    <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-white-50/45 mb-4">
                      <Link2 className="size-3.5" />
                      Linked from
                    </h3>
                    <ul className="space-y-2.5">
                      {backlinks.from.slice(0, 6).map((src) => {
                        const srcDir = src.split("/").slice(0, -1).join("/");
                        return (
                          <li key={src}>
                            <Link
                              to={`/blog/post/${src}${srcDir ? `?from=${srcDir}` : ""}`}
                              className="group flex items-baseline gap-2"
                            >
                              <span className="min-w-0 truncate text-sm text-white-50/70 group-hover:text-foreground transition-colors">
                                {backlinks.titles[src] || src.split("/").pop()}
                              </span>
                              {srcDir && (
                                <span className="hidden sm:block min-w-0 truncate shrink-0 text-[11px] text-white-50/30">
                                  {srcDir.split("/").pop()}
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}
                {related.length > 0 && (
                  <section className="rounded-2xl border border-black-50 bg-black-100/40 p-5">
                    <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-white-50/45 mb-4">
                      <FolderOpen className="size-3.5" />
                      More in {post.dir.split("/").pop() || "this folder"}
                    </h3>
                    <ul className="space-y-2.5">
                      {related.map((p) => (
                        <li key={p.fullSlug}>
                          <Link
                            to={`/blog/post/${p.fullSlug}${post.dir ? `?from=${post.dir}` : ""}`}
                            className="group flex items-baseline gap-2"
                          >
                            <span className="min-w-0 truncate text-sm text-white-50/70 group-hover:text-foreground transition-colors">
                              {p.title}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}
            <div className="post-anim mt-16 hidden sm:flex items-center gap-4 text-[11px] text-white-50/35 select-none">
              <div className="h-px flex-1 bg-black-50" />
              <span className="flex items-center gap-1.5">
                <kbd className="inline-flex items-center justify-center min-w-5 h-5 px-1 font-mono rounded border border-black-50 bg-black-100 text-white-50/50">
                  ←
                </kbd>
                <kbd className="inline-flex items-center justify-center min-w-5 h-5 px-1 font-mono rounded border border-black-50 bg-black-100 text-white-50/50">
                  →
                </kbd>
                to browse this folder
              </span>
              <div className="h-px flex-1 bg-black-50" />
            </div>
            <div className="post-anim mt-4 pt-8 border-t border-black-50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {prev ? (
                <Link
                  to={`/blog/post/${prev.fullSlug}${from ? `?from=${from}` : ""}`}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-black-50 bg-black-100/50 hover:bg-black-200/50 hover:border-blue-50/30 transition-[background-color,border-color,transform] duration-150 text-white-50 hover:text-foreground w-full md:max-w-[45%] group active:scale-[0.98]"
                >
                  <ArrowLeft className="size-4 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
                  <span className="truncate text-sm">{prev.title}</span>
                </Link>
              ) : (
                <div className="hidden md:block" />
              )}
              {next ? (
                <Link
                  to={`/blog/post/${next.fullSlug}${from ? `?from=${from}` : ""}`}
                  className="flex items-center gap-2 justify-end md:justify-start px-4 py-3 rounded-xl border border-black-50 bg-black-100/50 hover:bg-black-200/50 hover:border-blue-50/30 transition-[background-color,border-color,transform] duration-150 text-white-50 hover:text-foreground w-full md:max-w-[45%] md:ml-auto group active:scale-[0.98]"
                >
                  <span className="truncate text-sm">{next.title}</span>
                  <ArrowRight className="size-4 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ) : (
                <div className="hidden md:block" />
              )}
            </div>
          </div>
          <aside className="post-anim hidden lg:block w-56 shrink-0">
            <TableOfContents headings={headings} />
          </aside>
        </div>
      </div>
    </section>
    </>
  );
};

function extractText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children && typeof children === "object" && "props" in children) {
    return extractText((children as any).props.children);
  }
  return "";
}

export default BlogPost;
