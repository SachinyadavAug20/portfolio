import type { BlogPost } from "./types";
import { listFiles, fetchContent } from "./github";
import { naturalCompare } from "./tree";

let cachedFiles: BlogPost[] | null = null;

/* mirror of scripts/generate-graph.js fileTitle — the title is the FILE NAME,
   not the first heading (headings are often section labels like
   "Requirements"); og:title, <title> and the h1 must all agree */
function fileTitle(basename: string): string {
  const name = basename
    .replace(/\.md$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const cleaned = name
    .replace(/^[\s"'“”‘’.,:;!?()[\]=+/\\-]+/, "")
    .replace(/[\s"'“”‘’.,:;!?()[\]=+/\\|-]+$/, "");
  const title = /[\p{L}\p{N}]/u.test(cleaned) ? cleaned : name;
  if (title.length <= 100) return title;
  return title.slice(0, 97).replace(/\s+\S*$/, "") + "…";
}

/* headings in the note body are cleaned for the lead-title check below */
function cleanTitle(raw: string): string {
  const cleaned = raw
    .replace(/!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, " ")
    .replace(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`#>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
}

/* does the note open with its own title as a heading? the post page withholds
   its <h1> then — the markdown's heading already plays the title, and two
   identical headings stacked on screen read like a stutter */
export function leadsWithTitle(content: string, title: string): boolean {
  const body = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~~[\s\S]*?~~~/g, "");
  const firstLine = body.trimStart().split("\n", 1)[0] || "";
  const m = firstLine.match(/^(#{1,6})\s+(.+)$/);
  if (!m) return false;
  return fileTitle(cleanTitle(m[2])) === title;
}

export async function getPosts(): Promise<BlogPost[]> {
  if (cachedFiles) return cachedFiles;

  const files = await listFiles();
  cachedFiles = files.map((f) => ({
    fullSlug: f.fullSlug,
    title: f.name,
    dir: f.dir,
    content: null,
  }));

  return cachedFiles;
}

export async function getPostByFullSlug(fullSlug: string): Promise<BlogPost | undefined> {
  const posts = await getPosts();
  const post = posts.find((p) => p.fullSlug === fullSlug);
  if (!post) return undefined;

  if (post.content === null) {
    post.content = await fetchContent(fullSlug);
    post.title = fileTitle(post.title);
  }

  return post;
}

export async function getPostsInDir(dir: string): Promise<BlogPost[]> {
  const posts = await getPosts();
  return posts
    .filter((p) => p.dir === dir)
    .sort((a, b) => naturalCompare(a.title, b.title));
}
