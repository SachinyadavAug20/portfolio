import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Clock, Eye, ChevronDown } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkWikiLink from "remark-wiki-link";
import remarkCallouts from "remark-callouts";
import SEOHead from "../seo/SEOHead";
import { getPostByFullSlug, getPostsInDir } from "../blog/posts";
import type { BlogPost as BlogPostType } from "../blog/types";
import { useViews } from "../hooks/useViews";
import remarkObsidianImages from "../blog/remark-obsidian-images";
import { rehypeMermaid } from "../blog/rehype-mermaid";
import rehypeRaw from "rehype-raw";
import rehypePrism from "rehype-prism-plus";
import ReadingProgress from "../components/ReadingProgress";
import ReadAloud from "../components/ReadAloud";
import "prismjs/themes/prism-tomorrow.css";

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
      window.scrollTo({ top, behavior: "smooth" });
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

  if (idx >= urls.length || !urls[idx]) return null;

  return (
    <div className={`relative overflow-hidden rounded ${!loaded ? "bg-black-200 min-h-[100px]" : ""}`}>
      <img
        {...(props as React.ImgHTMLAttributes<HTMLImageElement>)}
        key={idx}
        src={urls[idx]}
        loading="lazy"
        decoding="async"
        className={`transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setIdx((i) => i + 1);
          setLoaded(false);
        }}
      />
    </div>
  );
};

const CodeBlock = ({ children, className, ...props }: any) => {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
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
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2.5 py-1.5 text-xs rounded-md opacity-90 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity bg-black-50 hover:bg-black text-white-50"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
};

const Skeleton = () => (
  <section className="section-padding pt-5 min-h-screen">
    <div className="w-full h-full md:px-10 max-w-4xl mx-auto">
      <div className="h-5 w-16 bg-black-200 rounded animate-pulse mb-8" />
      <div className="space-y-3">
        <div className="h-8 w-3/4 bg-black-200 rounded animate-pulse" />
        <div className="h-4 w-full bg-black-200 rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-black-200 rounded animate-pulse" />
        <div className="h-4 w-4/6 bg-black-200 rounded animate-pulse" />
        <div className="h-32 w-full bg-black-200 rounded animate-pulse mt-6" />
        <div className="h-4 w-full bg-black-200 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-black-200 rounded animate-pulse" />
      </div>
    </div>
  </section>
);

function extractExcerpt(markdown: string): string {
  const cleaned = markdown
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

  // Entrance choreography (timings from UX motion research):
  // content-surface band 250–400ms, ease-out, ~200ms total stagger spread,
  // ~20% shorter on mobile, transform+opacity only, skipped for reduced motion.
  useGSAP(
    () => {
      if (loading || !post) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
    { scope: pageRef, dependencies: [loading, post?.fullSlug], revertOnUpdate: true },
  );

  useEffect(() => {
    window.scrollTo(0, 0);
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
    const match = post.content.match(/!\[.*?\]\((.+?)\)/);
    return match ? match[1] : undefined;
  }, [post?.content]);

  const excerpt = useMemo(() => {
    if (!post?.content) return "";
    return extractExcerpt(post.content);
  }, [post?.content]);

  const headings = useMemo(() => {
    if (!post?.content) return [];
    return extractHeadings(post.content);
  }, [post?.content]);

  const backTo = from ? `/blog?path=${from}` : "/blog";

  const [dirPosts, setDirPosts] = useState<BlogPostType[]>([]);
  useEffect(() => {
    if (from) {
      getPostsInDir(from).then(setDirPosts);
    }
  }, [from]);

  const currentIdx = dirPosts.findIndex((p) => p.fullSlug === fullSlug);
  const prev = currentIdx > 0 ? dirPosts[currentIdx - 1] : null;
  const next =
    currentIdx >= 0 && currentIdx < dirPosts.length - 1
      ? dirPosts[currentIdx + 1]
      : null;

  const remarkPlugin = useMemo(
    () => (post?.dir ? remarkObsidianImages("Notes/" + post.dir) : remarkObsidianImages("")),
    [post?.dir],
  );

  if (loading) return <Skeleton />;

  if (error || !post) {
    return (
      <>
      <SEOHead title="Blog" description={excerpt || "Blog post not found"} path={`/blog/post/${fullSlug || ""}`} />
      <section className="section-padding pt-10 min-h-screen">
        <div className="w-full h-full md:px-10 text-center">
          <h1 className="text-3xl font-bold mb-4">Post not found</h1>
          <p className="text-red-400 mb-4">{error}</p>
          <Link to={backTo} className="text-blue-50 hover:text-foreground underline">
            Back to blog
          </Link>
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
            </div>
            {post.dir && (
              <div className="post-anim flex flex-wrap gap-2 mb-8">
                {post.dir.split("/").filter(Boolean).map((tag) => (
                  <Link
                    key={tag}
                    to={`/blog?tag=${encodeURIComponent(tag)}`}
                    className="chip px-3.5 py-1.5 text-xs rounded-full bg-black-200/80 text-blue-50/70 hover:bg-blue-500/15 hover:text-blue-50 border border-black-50/50 hover:border-blue-50/30"
                  >
                    {tag}
                  </Link>
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
            <article className="post-anim prose prose-invert max-w-none blog-content mt-2">
              {post.content && (
                <ReactMarkdown
                  remarkPlugins={[
                    remarkGfm,
                    remarkBreaks,
                    [remarkWikiLink, { hrefTemplate: (link: string) => `/blog/post/${link}` }],
                    remarkCallouts,
                    remarkPlugin,
                  ]}
                  rehypePlugins={[rehypeMermaid, rehypeRaw, rehypePrism]}
                  components={{
                    pre: (props) => <CodeBlock {...props} />,
                    img: (props) => <ImageWithFallback {...props} />,
                    h2: ({ children, ...props }) => {
                      const text = extractText(children);
                      const id = slugify(text);
                      return <h2 id={id} className="scroll-mt-6" {...props}>{children}</h2>;
                    },
                    h3: ({ children, ...props }) => {
                      const text = extractText(children);
                      const id = slugify(text);
                      return <h3 id={id} className="scroll-mt-6" {...props}>{children}</h3>;
                    },
                    h4: ({ children, ...props }) => {
                      const text = extractText(children);
                      const id = slugify(text);
                      return <h4 id={id} className="scroll-mt-6" {...props}>{children}</h4>;
                    },
                    code({ className, children, ...props }) {
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                    ...{
                      "mermaid-diagram": ({ children }: any) => {
                        const chart = typeof children === "string" ? children : String(children);
                        return <MermaidChart chart={chart} />;
                      },
                    },
                  }}
                >
                  {post.content}
                </ReactMarkdown>
              )}
            </article>
            <div className="post-anim mt-16 pt-8 border-t border-black-50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
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
