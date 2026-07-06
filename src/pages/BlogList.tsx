import { useSearchParams } from "react-router-dom";
import { posts } from "../blog/posts";
import { buildTree, getFolderAtPath } from "../blog/tree";
import TitleHeader from "../components/TitleHeader";
import FileExplorer from "../components/FileExplorer";

const BlogList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPath = searchParams.get("path") ?? "";

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
    <section className="section-padding pt-2 min-h-screen">
      <div className="w-full h-full md:px-5 px-5">
        <TitleHeader title="Blog" sub="College Notes & Thoughts" />
        <div className="max-w-3xl mx-auto">
          {folder ? (
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
