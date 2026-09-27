const GITHUB_USER = "SachinyadavAug20";
const FALLBACK_LEETCODE = 150;
const FALLBACK_GIT = 500;
const CACHE_TTL = 30 * 60 * 1000;

export interface LiveStats {
  leetcodeSolved: number;
  gitCommits: number;
}

let cached: { at: number; promise: Promise<LiveStats> } | null = null;

export function fetchLiveStats(): Promise<LiveStats> {
  // Module-level promise cache: dedupes concurrent mounts and avoids
  // re-hitting GitHub's unauthenticated 60 req/hr rate limit on every visit.
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.promise;

  const promise = loadStats();
  cached = { at: Date.now(), promise };
  return promise;
}

async function loadStats(): Promise<LiveStats> {
  const [leetcode, git] = await Promise.allSettled([
    fetch("/api/leetcode")
      .then(async (r) => {
        if (!r.ok) throw new Error(`LeetCode API: ${r.status}`);
        return (await r.json()).solved as number;
      }),
    fetchGitCommits(),
  ]);

  return {
    leetcodeSolved: leetcode.status === "fulfilled" ? leetcode.value : FALLBACK_LEETCODE,
    gitCommits: git.status === "fulfilled" ? git.value : FALLBACK_GIT,
  };
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
