import { OWNER, REPO, BRANCH, BLOG_ROOT } from "./config";

const CACHE_KEY = "blog-tree";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

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

async function fetchRaw(url: string): Promise<Response> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res;
}

function buildGitHubTreeUrl(): string {
  return `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`;
}

function buildRawUrl(path: string): string {
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path}`;
}

async function fetchTreeFromApi(): Promise<TreeItem[]> {
  const url = buildGitHubTreeUrl();
  const res = await fetchRaw(url);
  const data = await res.json();
  return data.tree as TreeItem[];
}

function loadCachedTree(): TreeItem[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedTree = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) return null;
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

export async function listFiles(): Promise<GitHubFile[]> {
  let items = loadCachedTree();
  if (!items) {
    items = await fetchTreeFromApi();
    saveCachedTree(items);
  }

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

export async function fetchContent(fullSlug: string): Promise<string> {
  if (contentCache.has(fullSlug)) return contentCache.get(fullSlug)!;
  const path = `${BLOG_ROOT}/${fullSlug}.md`;
  const url = buildRawUrl(path);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch content: ${res.status}`);
  const text = await res.text();
  contentCache.set(fullSlug, text);
  return text;
}
