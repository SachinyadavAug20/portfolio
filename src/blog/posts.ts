import type { BlogPost } from "./types";
import { listFiles, fetchContent } from "./github";
import { naturalCompare } from "./tree";

let cachedFiles: BlogPost[] | null = null;

function extractTitle(content: string, fallback: string): string {
  const match = content.match(/^#{1,6}\s+(.+)$/m);
  return cleanTitle(match ? match[1] : "", fallback);
}

/* mirror of scripts/generate-graph.js cleanTitle — headings embed images or
   markdown, and the cleaned string ends up in <title>/<h1>/og:title */
function cleanTitle(raw: string, fallback: string): string {
  const cleaned = raw
    .replace(/!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, " ")
    .replace(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`#>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[\s"'“”‘’.,:;!?()[\]=+/\\-]+/, "")
    .replace(/[\s"'“”‘’.,:;!?()[\]=+/\\|-]+$/, "");
  if (!/[\p{L}\p{N}]/u.test(cleaned)) return fallback;
  if (cleaned.length <= 100) return cleaned;
  return cleaned.slice(0, 97).replace(/\s+\S*$/, "") + "…";
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
  return cleanTitle(m[2], "") === title;
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
    post.title = extractTitle(post.content, post.title);
  }

  return post;
}

export async function getPostsInDir(dir: string): Promise<BlogPost[]> {
  const posts = await getPosts();
  return posts
    .filter((p) => p.dir === dir)
    .sort((a, b) => naturalCompare(a.title, b.title));
}
