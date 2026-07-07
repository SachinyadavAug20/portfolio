const GITHUB_USER = "SachinyadavAug20";
const FALLBACK_LEETCODE = 150;
const FALLBACK_GIT = 500;

export interface LiveStats {
  leetcodeSolved: number;
  gitCommits: number;
}

export async function fetchLiveStats(): Promise<LiveStats> {
  const [leetcode, git] = await Promise.allSettled([
    fetch("/api/leetcode").then((r) => r.json()).then((d) => d.solved as number),
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
