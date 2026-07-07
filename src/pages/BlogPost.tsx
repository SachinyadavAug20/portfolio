import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";
import remarkCallouts from "remark-callouts";
import { getPostByFullSlug, getPostsInDir } from "../blog/posts";
import type { BlogPost as BlogPostType } from "../blog/types";
import remarkObsidianImages from "../blog/remark-obsidian-images";
import rehypeRaw from "rehype-raw";
import rehypePrism from "rehype-prism-plus";
import "prismjs/themes/prism-tomorrow.css";

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

  if (idx >= urls.length || !urls[idx]) return null;

  return (
    <img
      {...(props as React.ImgHTMLAttributes<HTMLImageElement>)}
      key={idx}
      src={urls[idx]}
      onError={() => setIdx((i) => i + 1)}
    />
  );
};

const Skeleton = () => (
  <section className="section-padding pt-5 min-h-screen">
    <div className="w-full h-full md:px-10 px-5 max-w-4xl mx-auto">
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

const BlogPost = () => {
  const { "*": fullSlug } = useParams();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") ?? "";

  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    document.title = post ? `${post.title} — Blog — Sachin Yadav` : "Blog — Sachin Yadav";
  }, [post?.title]);

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
      <section className="section-padding pt-10 min-h-screen">
        <div className="w-full h-full md:px-10 px-5 text-center">
          <h1 className="text-3xl font-bold mb-4">Post not found</h1>
          <p className="text-red-400 mb-4">{error}</p>
          <Link to={backTo} className="text-blue-50 hover:text-white underline">
            Back to blog
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding pt-5 min-h-screen">
      <div className="w-full h-full md:px-10 px-5 max-w-4xl mx-auto">
        <Link
          to={backTo}
          className="text-blue-50 hover:text-white transition-colors inline-flex items-center gap-2 mb-8"
        >
          &larr; Back
        </Link>
        <article className="prose prose-invert max-w-none blog-content">
          {post.content && (
            <ReactMarkdown
              remarkPlugins={[
                remarkGfm,
                [remarkWikiLink, { hrefTemplate: (link: string) => `/blog/post/${link}` }],
                remarkCallouts,
                remarkPlugin,
              ]}
              rehypePlugins={[rehypeRaw, rehypePrism]}
              components={{
                img: (props) => <ImageWithFallback {...props} />,
                code({ className, children, ...props }) {
                  const isMermaid = className === "language-mermaid";
                  if (isMermaid) {
                    return <MermaidChart chart={String(children)} />;
                  }
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {post.content}
            </ReactMarkdown>
          )}
        </article>
        <div className="mt-12 pt-8 border-t border-black-50 flex items-center justify-between gap-4">
          {prev ? (
            <Link
              to={`/blog/post/${prev.fullSlug}${from ? `?from=${from}` : ""}`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-black-50 bg-black-100 hover:bg-black-200 transition-colors text-white-50 hover:text-white max-w-[45%]"
            >
              <ArrowLeft className="size-4 shrink-0" />
              <span className="truncate text-sm">{prev.title}</span>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link
              to={`/blog/post/${next.fullSlug}${from ? `?from=${from}` : ""}`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-black-50 bg-black-100 hover:bg-black-200 transition-colors text-white-50 hover:text-white max-w-[45%] ml-auto"
            >
              <span className="truncate text-sm">{next.title}</span>
              <ArrowRight className="size-4 shrink-0" />
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </section>
  );
};

export default BlogPost;
