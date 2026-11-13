import { OPEN_SOURCE_PRS } from "../data/openSourcePrs";

const GITHUB_USER = "SachinyadavAug20";
const FALLBACK_LEETCODE = 150;
const FALLBACK_GIT = 500;
const FALLBACK_PRS = OPEN_SOURCE_PRS.length;
const CACHE_TTL = 30 * 60 * 1000;
const PERSIST_KEY = "portfolio:live-stats";
const PERSIST_TTL = 6 * 60 * 60 * 1000;

export interface LiveStats {
  leetcodeSolved: number;
  gitCommits: number;
  openSourcePrs: number;
}

type Persisted = { t: number } & Partial<LiveStats>;

let cached: { at: number; promise: Promise<LiveStats> } | null = null;

const isFresh = (t: unknown): t is number =>
  typeof t === "number" && Date.now() - t <= PERSIST_TTL;

const readPersisted = (): Persisted | null => {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    if (!isFresh(parsed.t)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writePersisted = (v: Partial<LiveStats>) => {
  try {
    const merged: Persisted = { ...readPersisted(), ...v, t: Date.now() };
    localStorage.setItem(PERSIST_KEY, JSON.stringify(merged));
  } catch {
    // private mode — stats just refetch next visit
  }
};

export function fetchLiveStats(): Promise<LiveStats> {
  // Module-level promise cache: dedupes concurrent mounts within a session.
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.promise;

  const persisted = readPersisted();
  const cachedLeetcode =
    persisted && typeof persisted.leetcodeSolved === "number" ? persisted.leetcodeSolved : null;
  const cachedGit =
    persisted && typeof persisted.gitCommits === "number" ? persisted.gitCommits : null;
  const cachedPrs =
    persisted && typeof persisted.openSourcePrs === "number" ? persisted.openSourcePrs : null;

  if (cachedLeetcode !== null && cachedGit !== null && cachedPrs !== null) {
    const promise = Promise.resolve({
      leetcodeSolved: cachedLeetcode,
      gitCommits: cachedGit,
      openSourcePrs: cachedPrs,
    });
    cached = { at: Date.now(), promise };
    return promise;
  }

  const promise = Promise.allSettled([
    cachedLeetcode !== null ? Promise.resolve(cachedLeetcode) : fetchLeetcodeSolved(),
    cachedGit !== null ? Promise.resolve(cachedGit) : fetchGitCommits(),
    cachedPrs !== null ? Promise.resolve(cachedPrs) : fetchGitPrs(),
  ]).then(([leetcode, git, prs]) => {
    const stats: LiveStats = {
      leetcodeSolved:
        leetcode.status === "fulfilled" ? leetcode.value : FALLBACK_LEETCODE,
      gitCommits: git.status === "fulfilled" ? git.value : FALLBACK_GIT,
      openSourcePrs: prs.status === "fulfilled" ? prs.value : FALLBACK_PRS,
    };
    if (leetcode.status === "fulfilled") writePersisted({ leetcodeSolved: stats.leetcodeSolved });
    if (git.status === "fulfilled") writePersisted({ gitCommits: stats.gitCommits });
    if (prs.status === "fulfilled") writePersisted({ openSourcePrs: stats.openSourcePrs });
    return stats;
  });
  cached = { at: Date.now(), promise };
  return promise;
}

function fetchLeetcodeSolved(): Promise<number> {
  return fetch("/api/leetcode").then(async (r) => {
    if (!r.ok) throw new Error(`LeetCode API: ${r.status}`);
    const solved = (await r.json()).solved;
    if (typeof solved !== "number") throw new Error("LeetCode API: unexpected response");
    return solved;
  });
}

async function fetchGitCommits(): Promise<number> {
  const url = `https://api.github.com/search/commits?q=author:${GITHUB_USER}&per_page=1`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github.cloak-preview" },
  });
  if (!res.ok) throw new Error(`GitHub API: ${res.status}`);
  const data = await res.json();
  if (typeof data.total_count !== "number") throw new Error("GitHub API: unexpected response");
  return data.total_count;
}

async function fetchGitPrs(): Promise<number> {
  const url = `https://api.github.com/search/issues?q=author:${GITHUB_USER}+type:pr&per_page=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GitHub API PR: ${res.status}`);
  const data = await res.json();
  if (typeof data.total_count !== "number") throw new Error("GitHub API PR: unexpected response");
  return data.total_count;
}
