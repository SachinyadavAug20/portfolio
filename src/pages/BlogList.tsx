import { Link } from "react-router-dom";
import { posts } from "../blog/posts";
import TitleHeader from "../components/TitleHeader";

const BlogList = () => {
  return (
    <section className="section-padding pt-32 min-h-screen">
      <div className="w-full h-full md:px-20 px-5">
        <TitleHeader title="Blog" sub="College Notes & Thoughts" />
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              to={`/blog/${post.slug}`}
              className="card-border rounded-xl p-6 hover:bg-black-200 transition-colors duration-300 block"
            >
              <div className="flex items-center gap-2 mb-3">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-50"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                {post.title}
              </h2>
              <p className="text-sm text-blue-50">{post.date}</p>
            </Link>
          ))}
        </div>
        {posts.length === 0 && (
          <p className="text-blue-50 text-center mt-20">
            No blog posts yet. Add a markdown file to{" "}
            <code className="bg-black-200 px-2 py-1 rounded">
              src/content/blog/
            </code>
          </p>
        )}
      </div>
    </section>
  );
};

export default BlogList;
