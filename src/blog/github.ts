import { OWNER, REPO, BRANCH, BLOG_ROOT } from "./config";

const CACHE_KEY = "blog-tree";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
/* every GitHub fetch gets a hard deadline — a hanging request used to pin
   the blog on its loading skeleton forever (see BlogPost <Skeleton />) */
const FETCH_TIMEOUT_MS = 8000;

const contentCache = new Map<string, string>();

interface TreeItem {
  path: string;
  type: "blob" | "tree";
}

interface CachedTree {
  timestamp: number;
  items: TreeItem[];
}

export interface GitHubFile {
  path: string;
  fullSlug: string;
  dir: string;
  name: string;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function buildGitHubTreeUrl(): string {
  return `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`;
}

function buildRawUrl(path: string): string {
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${encodePath(path)}`;
}

/** jsDelivr mirrors the GitHub repo — reachable where raw.githubusercontent
 *  is slow or blocked, and it's a CDN either way */
function buildJsDelivrUrl(path: string): string {
  return `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${BRANCH}/${encodePath(path)}`;
}

/** percent-encode each path segment (spaces, ×, –, # in note names) */
function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function fetchTreeFromApi(): Promise<TreeItem[]> {
  const res = await fetchWithTimeout(buildGitHubTreeUrl());
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data?.tree)) throw new Error("GitHub API: bad tree");
  return data.tree as TreeItem[];
}

function loadCachedTree(allowStale = false): TreeItem[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedTree = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL && !allowStale) return null;
    return cached.items;
  } catch {
    return null;
  }
}

function saveCachedTree(items: TreeItem[]) {
  try {
    const cached: CachedTree = { timestamp: Date.now(), items };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // localStorage full or unavailable
  }
}

/** static snapshot emitted at build time (scripts/generate-sitemap.js) —
 *  same-origin, works when the GitHub API is rate-limited or blocked */
async function loadStaticTree(): Promise<TreeItem[] | null> {
  try {
    const res = await fetchWithTimeout("/blog-tree.json");
    if (!res.ok) return null;
    const slugs = await res.json();
    if (!Array.isArray(slugs)) return null;
    return (slugs as string[]).map((slug) => ({
      path: `${BLOG_ROOT}/${slug}.md`,
      type: "blob" as const,
    }));
  } catch {
    return null;
  }
}

function isExcluded(path: string): boolean {
  const parts = path.split("/");
  return parts.some((p) => p === ".obsidian" || p.startsWith(".obsidian"));
}

function gitPathToBlogPath(path: string): string {
  // e.g., "Notes/Programing/languages/java/0.Introduction.md"
  //   → "Programing/languages/java/0.Introduction"
  if (!path.startsWith(BLOG_ROOT + "/")) return "";
  const relative = path.slice(BLOG_ROOT.length + 1);
  return relative.replace(/\.md$/i, "");
}

/**
 * Tree source ladder — each rung is a hard deadline, never a hang:
 *   1. fresh localStorage cache (≤1h)
 *   2. GitHub API
 *   3. static /blog-tree.json (build artifact, same origin)
 *   4. stale localStorage cache
 *   5. error (callers render their error/retry UI)
 */
export async function listFiles(): Promise<GitHubFile[]> {
  let items = loadCachedTree();
  if (!items) {
    try {
      items = await fetchTreeFromApi();
      saveCachedTree(items);
    } catch {
      /* API down / rate-limited / blocked — try the next rung */
    }
  }
  if (!items) items = await loadStaticTree();
  if (!items) items = loadCachedTree(true);
  if (!items) throw new Error("blog index unavailable (network blocked?)");

  const files: GitHubFile[] = [];

  for (const item of items) {
    if (item.type !== "blob") continue;
    if (!item.path.endsWith(".md")) continue;
    if (isExcluded(item.path)) continue;
    if (!item.path.startsWith(BLOG_ROOT + "/")) continue;

    const fullSlug = gitPathToBlogPath(item.path);
    if (!fullSlug) continue;

    const segments = fullSlug.split("/");
    const name = segments.pop()!;
    const dir = segments.join("/");

    files.push({ path: item.path, fullSlug, dir, name });
  }

  return files;
}

/**
 * Content source ladder: raw.githubusercontent → jsDelivr CDN → error.
 * Both legs carry the same hard deadline so <Skeleton /> can never stick.
 */
export async function fetchContent(fullSlug: string): Promise<string> {
  if (contentCache.has(fullSlug)) return contentCache.get(fullSlug)!;
  const path = `${BLOG_ROOT}/${fullSlug}.md`;
  const sources = [buildRawUrl(path), buildJsDelivrUrl(path)];
  let lastError: unknown = null;
  for (const url of sources) {
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) {
        lastError = new Error(`Failed to fetch content: ${res.status}`);
        continue;
      }
      const text = await res.text();
      if (!text.trim()) {
        lastError = new Error("Failed to fetch content: empty response");
        continue;
      }
      contentCache.set(fullSlug, text);
      return text;
    } catch (err) {
      lastError = err; /* timeout or blocked — next rung */
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to fetch content");
}

const commitCache = new Map<string, string>();

export async function fetchLastUpdated(fullSlug: string): Promise<string | null> {
  if (commitCache.has(fullSlug)) return commitCache.get(fullSlug)!;
  const path = `${BLOG_ROOT}/${fullSlug}.md`;
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/commits?path=${encodeURIComponent(path)}&per_page=1`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const date = data[0].commit?.committer?.date || data[0].commit?.author?.date || null;
    if (date) commitCache.set(fullSlug, date);
    return date;
  } catch {
    return null;
  }
}
