import { useState } from "react";
import { Link } from "react-router-dom";
import { Folder, FileText, ChevronRight } from "lucide-react";
import type { TreeNode } from "../blog/tree";

interface FileExplorerProps {
  folder: TreeNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

const EXCLUDED = new Set(["attachement", "attachements"]);
const BATCH_SIZE = 20;

const FileExplorer = ({ folder, currentPath, onNavigate }: FileExplorerProps) => {
  const [visibleFiles, setVisibleFiles] = useState(BATCH_SIZE);

  const children = folder.children?.filter(
    (c) => !(c.type === "folder" && EXCLUDED.has(c.name)),
  ) ?? [];

  const folders = children.filter((c) => c.type === "folder");
  const files = children.filter((c) => c.type === "file");

  const shownFiles = files.slice(0, visibleFiles);
  const remaining = files.length - visibleFiles;

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

      {children.length === 0 ? (
        <p className="text-blue-50 text-center py-12">This folder is empty.</p>
      ) : (
        <div className="space-y-1">
          {folders.map((node) => (
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
          ))}
          {folders.length > 0 && files.length > 0 && (
            <div className="border-t border-black-50 my-2" />
          )}
          {shownFiles.map((node) => (
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
          ))}
          {remaining > 0 && (
            <button
              onClick={() => setVisibleFiles((v) => v + BATCH_SIZE)}
              className="w-full text-center py-3 rounded-lg text-sm text-blue-50 hover:text-white hover:bg-black-200 transition-colors"
            >
              Show {remaining} more file{remaining !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileExplorer;
