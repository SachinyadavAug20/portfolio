import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getPosts } from "../blog/posts";
import { buildTree, getFolderAtPath } from "../blog/tree";
import type { BlogPost } from "../blog/types";
import TitleHeader from "../components/TitleHeader";
import FileExplorer from "../components/FileExplorer";

const BlogList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPath = searchParams.get("path") ?? "";
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const tree = buildTree(posts);
  const folder = getFolderAtPath(tree, currentPath);

  const handleNavigate = (path: string) => {
    if (!path) {
      setSearchParams({});
    } else {
      setSearchParams({ path });
    }
  };

  return (
    <section className="section-padding pt-5 min-h-screen">
      <div className="w-full h-full md:px-10 px-5">
        <TitleHeader title="Blog" sub="Notes from my Obsidian vault" />
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
                className="px-4 py-2 rounded-lg border border-black-50 bg-black-100 hover:bg-black-200 text-white-50"
              >
                Retry
              </button>
            </div>
          ) : folder ? (
            <FileExplorer
              folder={folder}
              currentPath={currentPath}
              onNavigate={handleNavigate}
            />
          ) : (
            <p className="text-blue-50 text-center mt-16">
              Folder not found.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default BlogList;
