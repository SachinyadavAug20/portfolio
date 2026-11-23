/* Live activity feeds — GitHub contribution calendar + LeetCode profile.

   Both upstreams are proxied through the Cloudflare Worker (/api/…): GitHub's
   calendar is HTML-only and LeetCode's GraphQL refuses foreign origins, so the
   browser can't reach either directly. Same stale-while-revalidate shape as
   lib/stats.ts — a module-level promise cache de-dupes concurrent mounts and
   localStorage keeps the last good payload so a repeat visit paints instantly. */

export const GITHUB_USER = "SachinyadavAug20";

/** One day of a contribution heatmap. `level` is the 0–4 bucket. */
export interface HeatmapDay {
  date: string;
  count: number;
  level: number;
}

export interface GithubActivity {
  total: number;
  days: HeatmapDay[];
  streak: { current: number; longest: number; activeDays: number };
  breakdown: { commits: number; prs: number; reviews: number; issues: number };
  repos: string[];
  otherRepos: number;
  orgs: string[];
  from: string;
  to: string;
}

export interface LeetBadge {
  name: string;
  displayName: string;
  icon: string;
}

export interface LeetCodeActivity {
  profile: { username: string; name: string; avatar: string };
  level: string;
  /* kept top-level so lib/stats.ts (the live counter tile) keeps working */
  solved: number;
  contest: {
    rating: number;
    topPercentage: number;
    attended: number;
    totalParticipants: number;
    /* derived estimate — LeetCode only exposes the exact rank when logged in */
    rank: number;
    history: { rating: number; title: string; time: number }[];
  };
  questions: {
    all: { solved: number; total: number };
    easy: { solved: number; total: number };
    medium: { solved: number; total: number };
    hard: { solved: number; total: number };
    attempting: number;
  };
  badges: LeetBadge[];
  submissions: {
    total: number;
    activeDays: number;
    maxStreak: number;
    currentStreak: number;
    days: HeatmapDay[];
  };
  histogram: { userCount: number; topPercentage: number }[];
}

/* ---------------------------------------------------------------- OSS feed */

export interface GithubOssPull {
  title: string;
  number: number;
  repo: string;
  /** Base repo of the PR, e.g. "meshery/meshery" — links the org chips there. */
  baseRepo: string;
  url: string;
  at: string;
}

export interface GithubOssReview {
  repo: string;
  baseRepo: string;
  title: string;
  number: number;
  url: string;
  state: string;
  at: string;
}

export interface GithubOssPush {
  repo: string;
  commits: number;
}

export interface GithubOss {
  mergedPulls: GithubOssPull[];
  reviews: GithubOssReview[];
  pushes: GithubOssPush[];
  counts: { mergedPulls: number; reviews: number; pushes: number };
}

const isGithubOss = (v: unknown): v is GithubOss =>
  !!v &&
  typeof (v as GithubOss).counts === "object" &&
  Array.isArray((v as GithubOss).mergedPulls) &&
  Array.isArray((v as GithubOss).reviews);

/* ---------------------------------------------------------------- caching */

const MEM_TTL = 30 * 60 * 1000;
const DISK_KEY = "portfolio:activity";
const DISK_TTL = 6 * 60 * 60 * 1000;

type Disk = { t: number; gh?: GithubActivity; lc?: LeetCodeActivity; oss?: GithubOss };
type Entry<T> = { at: number; promise: Promise<T> };

const mem: Record<string, Entry<unknown>> = {};

function readDisk(): Disk | null {
  try {
    const raw = localStorage.getItem(DISK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Disk;
    if (typeof parsed?.t !== "number" || Date.now() - parsed.t > DISK_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDisk(patch: Partial<Disk>) {
  try {
    const prev = readDisk();
    const next: Disk = { ...(prev ?? { t: 0 }), ...patch, t: Date.now() };
    localStorage.setItem(DISK_KEY, JSON.stringify(next));
  } catch {
    /* private mode — just refetch next visit */
  }
}

/** Drop the in-memory entry so a retry button can actually refetch. */
export function invalidateActivity(kind: "gh" | "lc" | "oss") {
  delete mem[kind];
}

function load<T>(
  kind: "gh" | "lc" | "oss",
  url: string,
  pick: (d: Disk | null) => T | undefined,
  accept: (v: unknown) => v is T,
  save: (v: T) => void,
): Promise<T> {
  const hit = mem[kind] as Entry<T> | undefined;
  if (hit && Date.now() - hit.at < MEM_TTL) return hit.promise;

  const cached = pick(readDisk());
  if (cached && accept(cached)) {
    const promise = Promise.resolve(cached);
    mem[kind] = { at: Date.now(), promise };
    return promise;
  }

  const promise = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      return r.json();
    })
    .then((value: unknown) => {
      if (!accept(value)) throw new Error(`${url}: unexpected payload`);
      save(value);
      return value;
    });
  mem[kind] = { at: Date.now(), promise };
  /* a rejected promise would otherwise be memoised for MEM_TTL — clear it so
     the next mount (or the retry button) tries again */
  promise.catch(() => {
    if (mem[kind]?.promise === promise) delete mem[kind];
  });
  return promise;
}

const isGithub = (v: unknown): v is GithubActivity =>
  !!v && typeof (v as GithubActivity).total === "number" && Array.isArray((v as GithubActivity).days);

const isLeet = (v: unknown): v is LeetCodeActivity =>
  !!v && typeof (v as LeetCodeActivity).solved === "number" && Array.isArray((v as LeetCodeActivity).badges);

export const fetchGithubActivity = (): Promise<GithubActivity> =>
  load("gh", "/api/github/contributions", (d) => d?.gh, isGithub, (v) => writeDisk({ gh: v }));

export const fetchLeetCodeActivity = (): Promise<LeetCodeActivity> =>
  load("lc", "/api/leetcode", (d) => d?.lc, isLeet, (v) => writeDisk({ lc: v }));

export const fetchGithubOss = (): Promise<GithubOss> =>
  load("oss", "/api/github/oss", (d) => d?.oss, isGithubOss, (v) => writeDisk({ oss: v }));

/** Fire all three in parallel; each side fails independently. */
export function fetchActivity(): Promise<{
  gh: GithubActivity | null;
  lc: LeetCodeActivity | null;
  oss: GithubOss | null;
}> {
  return Promise.allSettled([
    fetchGithubActivity(),
    fetchLeetCodeActivity(),
    fetchGithubOss(),
  ]).then(([gh, lc, oss]) => ({
    gh: gh.status === "fulfilled" ? gh.value : null,
    lc: lc.status === "fulfilled" ? lc.value : null,
    oss: oss.status === "fulfilled" ? oss.value : null,
  }));
}
