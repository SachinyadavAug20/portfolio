import type { BlogPost } from "./types";

function getTags(post: BlogPost): string[] {
  return post.dir.split("/").filter(Boolean);
}

export function getRelatedPosts(
  post: BlogPost,
  allPosts: BlogPost[],
  limit = 4,
): BlogPost[] {
  const tags = new Set(getTags(post));
  if (tags.size === 0) return [];

  const scored = allPosts
    .filter((p) => p.fullSlug !== post.fullSlug)
    .map((p) => {
      const pTags = getTags(p);
      const overlap = pTags.filter((t) => tags.has(t)).length;
      const sameDir = p.dir === post.dir ? 0.5 : 0;
      return { post: p, score: overlap + sameDir };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.post);
}
