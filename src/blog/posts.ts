import type { BlogPost } from "./types";
import { listFiles, fetchContent } from "./github";
import { naturalCompare } from "./tree";

let cachedFiles: BlogPost[] | null = null;

function extractTitle(content: string, fallback: string): string {
  const match = content.match(/^#{1,6}\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
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
