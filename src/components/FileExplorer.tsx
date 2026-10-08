import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link } from "react-router-dom";
import { Folder, FileText, ChevronRight } from "lucide-react";
import type { TreeNode } from "../blog/tree";
import { gsap } from "../lib/gsapSetup";
import { loadGsapExtras, type GsapExtras } from "../lib/gsapExtras";
import { useReducedMotion } from "../hooks/useReducedMotion";
interface FileExplorerProps {
  folder: TreeNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  /** slug → last commit date (dates.json) so file rows can show freshness */
  dates?: Record<string, string>;
}

const EXCLUDED = new Set(["attachement", "attachements"]);
const BATCH_SIZE = 20;

/* vault-freshness cue: "today / 3d ago / 2w ago / Oct 7" */
const relDate = (iso: string): string => {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 35) return `${Math.floor(days / 7)}w ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

/* whole subtree, not just direct children — nested folders said "0 files" */
const countFiles = (node: TreeNode): number => {
  if (node.type === "file") return 1;
  let sum = 0;
  for (const c of node.children ?? []) {
    if (c.type === "folder" && EXCLUDED.has(c.name)) continue;
    sum += countFiles(c);
  }
  return sum;
};

const FileExplorer = ({ folder, currentPath, onNavigate, dates }: FileExplorerProps) => {
  const [visibleFiles, setVisibleFiles] = useState(BATCH_SIZE);
  const listRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<GsapExtras["Flip"] | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    loadGsapExtras().then(({ Flip }) => {
      if (!cancelled) flipRef.current = Flip;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Full list swap (folder/breadcrumb nav): stagger the new rows in.
  const replaceList = (mutate: () => void) => {
    if (reduced || !listRef.current) {
      mutate();
      return;
    }
    flushSync(mutate);
    const rows = listRef.current.querySelectorAll(".blog-tile");
    gsap.fromTo(
      rows,
      { y: 8, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.28,
        ease: "power2.out",
        stagger: 0.02,
        clearProps: "transform,opacity",
      },
    );
  };

  // Incremental append ("show more"): FLIP the existing rows, fade in new.
  const growList = (mutate: () => void) => {
    const Flip = flipRef.current;
    if (reduced || !listRef.current || !Flip) {
      mutate();
      return;
    }
    const state = Flip.getState(listRef.current.querySelectorAll(".blog-tile"));
    flushSync(mutate);
    Flip.from(state, {
      duration: 0.3,
      ease: "power2.out",
      stagger: 0.01,
      onEnter: (els) =>
        gsap.fromTo(
          els,
          { opacity: 0, y: 8 },
          {
            opacity: 1,
            y: 0,
            duration: 0.25,
            stagger: 0.015,
            clearProps: "transform,opacity",
          },
        ),
    });
  };

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
              onClick={() => replaceList(() => onNavigate(crumb.path))}
              className="hover:text-foreground transition-colors py-2 px-1.5 -mx-1 active:text-foreground"
            >
              {crumb.label}
            </button>
          </span>
        ))}
      </nav>

      {children.length === 0 ? (
        <p className="text-blue-50 text-center py-12">This folder is empty.</p>
      ) : (
        <div className="space-y-2" ref={listRef}>
          {folders.map((node) => (
            <button
              key={node.name}
              onClick={() =>
                replaceList(() =>
                  onNavigate(
                    currentPath
                      ? `${currentPath}/${node.name}`
                      : node.name,
                  ),
                )
              }
              className="blog-tile w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-black-50
                bg-black-100/70 hover:bg-black-200 active:scale-[0.99] transition-[background-color,border-color] duration-150 text-left group cursor-pointer"
            >
              <Folder className="size-5 text-yellow-500 shrink-0" />
              <span className="text-white-50 group-hover:text-foreground transition-colors truncate min-w-0 flex-1">
                {node.name}
              </span>
              <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-black-200 text-blue-50">
                {countFiles(node)}{" "}
                file{countFiles(node) !== 1 ? "s" : ""}
              </span>
              <ChevronRight className="size-4 text-white-50/30 shrink-0" />
            </button>
          ))}
          {folders.length > 0 && files.length > 0 && (
            <div className="border-t border-black-50 my-3" />
          )}
          {shownFiles.map((node) => {
            const updated = node.slug ? dates?.[node.slug] : undefined;
            return (
              <Link
                key={node.slug}
                to={`/blog/post/${node.slug}${currentPath ? `?from=${currentPath}` : ""}`}
                className="blog-tile flex items-center gap-3 px-4 py-3.5 rounded-xl border border-black-50
                  bg-black-100/70 hover:bg-black-200 active:scale-[0.99] transition-[background-color,border-color] duration-150 group"
              >
                <FileText className="size-5 text-blue-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-white-50 group-hover:text-foreground transition-colors block truncate text-[15px]">
                    {node.title ?? node.name}
                  </span>
                </div>
                {updated && (
                  <span className="hidden sm:block shrink-0 text-[11px] tabular-nums text-white-50/35 group-hover:text-white-50/55 transition-colors">
                    {relDate(updated)}
                  </span>
                )}
                <ChevronRight className="size-4 text-white-50/30 shrink-0" />
              </Link>
            );
          })}
          {remaining > 0 && (
            <button
              onClick={() => growList(() => setVisibleFiles((v) => v + BATCH_SIZE))}
              className="blog-tile w-full text-center py-3 rounded-xl border border-dashed border-black-50 text-sm text-blue-50 hover:text-foreground hover:bg-black-200 transition-colors"
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
