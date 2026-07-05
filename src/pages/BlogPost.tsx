import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkWikiLink from "remark-wiki-link";
import remarkCallouts from "remark-callouts";
import { getPostBySlug } from "../blog/posts";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) {
    return (
      <section className="section-padding pt-32 min-h-screen">
        <div className="w-full h-full md:px-20 px-5 text-center">
          <h1 className="text-3xl font-bold mb-4">Post not found</h1>
          <Link to="/blog" className="text-blue-50 hover:text-white underline">
            Back to blog
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding pt-32 min-h-screen">
      <div className="w-full h-full md:px-20 px-5 max-w-4xl mx-auto">
        <Link
          to="/blog"
          className="text-blue-50 hover:text-white transition-colors inline-flex items-center gap-2 mb-8"
        >
          &larr; Back to blog
        </Link>
        <article className="prose prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkWikiLink, remarkCallouts]}
          >
            {post.content}
          </ReactMarkdown>
        </article>
        <div className="mt-12 pt-8 border-t border-black-50">
          <Link
            to="/blog"
            className="text-blue-50 hover:text-white transition-colors"
          >
            &larr; Back to blog
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BlogPost;
