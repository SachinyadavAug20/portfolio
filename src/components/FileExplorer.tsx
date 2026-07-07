import { Link } from "react-router-dom";
import { Folder, FileText, ChevronRight } from "lucide-react";
import type { TreeNode } from "../blog/tree";

interface FileExplorerProps {
  folder: TreeNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

const EXCLUDED = new Set(["attachement", "attachements"]);

const FileExplorer = ({ folder, currentPath, onNavigate }: FileExplorerProps) => {
  const children = folder.children?.filter(
    (c) => !(c.type === "folder" && EXCLUDED.has(c.name)),
  );

  const breadcrumbs = currentPath
    ? [{ label: "Home", path: "" }, ...currentPath.split("/").map((seg, i, arr) => ({
        label: seg,
        path: arr.slice(0, i + 1).join("/"),
      }))]
    : [{ label: "Home", path: "" }];

  return (
    <div className="mt-8">
      <nav className="flex items-center gap-1 text-sm text-blue-50 mb-6 flex-wrap">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.path} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5" />}
            <button
              onClick={() => onNavigate(crumb.path)}
              className="hover:text-white transition-colors"
            >
              {crumb.label}
            </button>
          </span>
        ))}
      </nav>

      {!children || children.length === 0 ? (
        <p className="text-blue-50 text-center py-12">This folder is empty.</p>
      ) : (
        <div className="space-y-1">
          {children.map((node) =>
            node.type === "folder" ? (
              <button
                key={node.name}
                onClick={() =>
                  onNavigate(
                    currentPath
                      ? `${currentPath}/${node.name}`
                      : node.name,
                  )
                }
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg
                  hover:bg-black-200 transition-colors text-left group cursor-pointer"
              >
                <Folder className="size-5 text-yellow-500 shrink-0" />
                <span className="text-white-50 group-hover:text-white transition-colors">
                  {node.name}
                </span>
                <span className="ml-auto text-xs text-blue-50">
                  {node.children?.filter((c) => c.type === "file").length}{" "}
                  file{(node.children?.filter((c) => c.type === "file").length ?? 0) !== 1 ? "s" : ""}
                </span>
              </button>
            ) : (
              <Link
                key={node.slug}
                to={`/blog/post/${node.slug}${currentPath ? `?from=${currentPath}` : ""}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg
                  hover:bg-black-200 transition-colors group"
              >
                <FileText className="size-5 text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-white-50 group-hover:text-white transition-colors block truncate">
                    {node.title ?? node.name}
                  </span>
                </div>
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
};

export default FileExplorer;
