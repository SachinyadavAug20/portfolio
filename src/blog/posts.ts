import type { BlogPost } from "./types";
import fm from "front-matter";

type PostMap = Record<string, string>;
const postFiles = import.meta.glob("/src/content/blog/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as PostMap;

export const posts: BlogPost[] = Object.entries(postFiles)
  .map(([path, raw]) => {
    const segments = path.split("/");
    const filename = segments.pop()!;
    const slug = filename.replace(".md", "");
    const dir = segments.slice(3).join("/");
    const { attributes, body } = fm<{
      title: string;
      date: string;
      tags: string[];
    }>(raw);
    return {
      slug,
      title: attributes.title ?? slug,
      date: attributes.date ?? "",
      tags: attributes.tags ?? [],
      content: body,
      dir,
    };
  })
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getPostsInDir(dir: string): BlogPost[] {
  return posts
    .filter((p) => p.dir === dir)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
