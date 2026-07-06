import { useEffect, useRef } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";
import remarkCallouts from "remark-callouts";
import mermaid from "mermaid";
import { getPostBySlug, getPostsInDir } from "../blog/posts";
import remarkObsidianImages from "../blog/remark-obsidian-images";
import rehypePrism from "rehype-prism-plus";
import "prismjs/themes/prism-tomorrow.css";

mermaid.initialize({ startOnLoad: false, theme: "dark" });

const MermaidChart = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = chart;
      mermaid.run({ nodes: [ref.current], suppressErrors: true });
    }
  }, [chart]);

  return <div ref={ref} className="my-4 flex justify-center" />;
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") ?? "";
  const backTo = from ? `/blog?path=${from}` : "/blog";
  const post = slug ? getPostBySlug(slug) : undefined;

  const dirPosts = from ? getPostsInDir(from) : [];
  const currentIdx = dirPosts.findIndex((p) => p.slug === slug);
  const prev = currentIdx > 0 ? dirPosts[currentIdx - 1] : null;
  const next = currentIdx >= 0 && currentIdx < dirPosts.length - 1 ? dirPosts[currentIdx + 1] : null;

  if (!post) {
    return (
      <section className="section-padding pt-32 min-h-screen">
        <div className="w-full h-full md:px-20 px-5 text-center">
          <h1 className="text-3xl font-bold mb-4">Post not found</h1>
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
        <article className="prose prose-invert max-w-none [&_img]:rounded-lg [&_img]:my-4 [&_pre]:bg-black-200 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-all [&_code]:text-sm [&_blockquote]:border-l-4 [&_blockquote]:border-blue-50 [&_blockquote]:pl-4 [&_blockquote]:text-blue-50 [&_blockquote]:italic [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-black-50 [&_th]:p-2 [&_th]:bg-black-200 [&_td]:border [&_td]:border-black-50 [&_td]:p-2">
          <ReactMarkdown
            remarkPlugins={[
              remarkGfm,
              [remarkWikiLink, { hrefTemplate: (link: string) => `/blog/${link}` }],
              remarkCallouts,
              remarkObsidianImages,
            ]}
            rehypePlugins={[rehypePrism]}
            components={{
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
        </article>
        <div className="mt-12 pt-8 border-t border-black-50 flex items-center justify-between gap-4">
          {prev ? (
            <Link
              to={`/blog/${prev.slug}${from ? `?from=${from}` : ""}`}
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
              to={`/blog/${next.slug}${from ? `?from=${from}` : ""}`}
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
