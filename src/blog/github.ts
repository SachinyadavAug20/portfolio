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
let listFlight: Promise<GitHubFile[]> | null = null;

/** in-flight dedup — the slug index, the post fetch and dir nav all ask for
 * the tree concurrently; a cold session used to burn the trees API 3× */
export function listFiles(): Promise<GitHubFile[]> {
  if (!listFlight) {
    listFlight = doListFiles().catch((err) => {
      listFlight = null; // failures retry on the next call, not forever
      throw err;
    });
  }
  return listFlight;
}

async function doListFiles(): Promise<GitHubFile[]> {
  let items = loadCachedTree();
  if (!items) {
    try {
      items = await fetchTreeFromApi();
    } catch {
      /* API down / rate-limited / blocked — try the next rung */
    }
  }
  let cachedStale = false;
  if (!items) items = await loadStaticTree();
  if (!items) {
    items = loadCachedTree(true);
    cachedStale = true;
  }
  if (!items) throw new Error("blog index unavailable (network blocked?)");
  // cache whichever fresh rung answered — otherwise a rate-limited API
  // gets retried (and re-limited) on every visit even though we have a tree.
  // a stale tree stays stale: re-saving it would pin old data forever.
  if (!cachedStale) saveCachedTree(items);

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
 * Between sessions notes live in localStorage (48h, ≤512KB with oldest-first
 * eviction) so re-reads are instant and survive rate limits.
 */
const CONTENT_LS_TTL = 48 * 60 * 60 * 1000;
const CONTENT_LS_CAP = 512 * 1024;
const contentKey = (slug: string) => `portfolio:note-content:${slug}`;

const readContent = (slug: string): string | null => {
  try {
    const raw = localStorage.getItem(contentKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t?: number; c?: string };
    if (typeof parsed.t !== "number" || Date.now() - parsed.t > CONTENT_LS_TTL) return null;
    return typeof parsed.c === "string" && parsed.c.trim() ? parsed.c : null;
  } catch {
    return null;
  }
};

const pruneContent = (maxTotal: number) => {
  try {
    const entries: { k: string; t: number; size: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith("portfolio:note-content:")) continue;
      const raw = localStorage.getItem(k) ?? "";
      let t = 0;
      try {
        t = (JSON.parse(raw) as { t?: number }).t ?? 0;
      } catch {
        /* unparsable entry counts as oldest garbage */
      }
      entries.push({ k, t, size: raw.length });
    }
    entries.sort((a, b) => a.t - b.t); // oldest first
    let total = entries.reduce((s, e) => s + e.size, 0);
    for (const e of entries) {
      if (total <= maxTotal) break;
      localStorage.removeItem(e.k);
      total -= e.size;
    }
  } catch {
    // storage unavailable — nothing to prune
  }
};

const writeContent = (slug: string, content: string) => {
  try {
    localStorage.setItem(contentKey(slug), JSON.stringify({ t: Date.now(), c: content }));
    pruneContent(CONTENT_LS_CAP);
  } catch {
    // quota — evict every cached note, retry this one once
    pruneContent(0);
    try {
      localStorage.setItem(contentKey(slug), JSON.stringify({ t: Date.now(), c: content }));
    } catch {
      // give up silently; the in-memory cache still covers this session
    }
  }
};

export async function fetchContent(fullSlug: string): Promise<string> {
  if (contentCache.has(fullSlug)) return contentCache.get(fullSlug)!;
  const persisted = readContent(fullSlug);
  if (persisted) {
    contentCache.set(fullSlug, persisted);
    return persisted;
  }
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
      writeContent(fullSlug, text);
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
const DATE_TTL = 24 * 60 * 60 * 1000;
const dateKey = (slug: string) => `portfolio:note-date:${slug}`;

const readDate = (slug: string): string | null => {
  try {
    const raw = localStorage.getItem(dateKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t: number; d: string };
    if (Date.now() - parsed.t > DATE_TTL) return null;
    return typeof parsed.d === "string" ? parsed.d : null;
  } catch {
    return null;
  }
};

const writeDate = (slug: string, date: string) => {
  try {
    localStorage.setItem(dateKey(slug), JSON.stringify({ t: Date.now(), d: date }));
  } catch {
    // storage unavailable — in-memory cache still holds it this session
  }
};

export async function fetchLastUpdated(fullSlug: string): Promise<string | null> {
  if (commitCache.has(fullSlug)) return commitCache.get(fullSlug)!;
  // one core-API call per note per day instead of per view — this endpoint
  // shares the 60/hr unauthenticated pool with graph regeneration
  const persisted = readDate(fullSlug);
  if (persisted) {
    commitCache.set(fullSlug, persisted);
    return persisted;
  }
  const path = `${BLOG_ROOT}/${fullSlug}.md`;
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/commits?path=${encodeURIComponent(path)}&per_page=1`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const date = data[0].commit?.committer?.date || data[0].commit?.author?.date || null;
    if (date) {
      commitCache.set(fullSlug, date);
      writeDate(fullSlug, date);
    }
    return date;
  } catch {
    return null;
  }
}
