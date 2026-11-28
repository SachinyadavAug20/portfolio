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
  breakdown: {
    commits: number;
    prs: number;
    reviews: number;
    issues: number;
    comments?: number;
    interactions?: number;
  };
  metrics?: {
    commits: number;
    prs: number;
    reviews: number;
    comments: number;
    issues: number;
    interactions: number;
  };
  repos: string[];
  otherRepos: number;
  orgs: string[];
  from: string;
  to: string;
}

export interface LeetBadge {
  id?: string;
  name: string;
  displayName: string;
  icon: string;
  medalUrl?: string;
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

/* ---------------------------------------------------------------- Codeforces */

export interface CodeforcesContest {
  name: string;
  rank: number;
  oldRating: number;
  newRating: number;
  at: string;
}

export interface CodeforcesActivity {
  handle: string;
  rating: number;
  maxRating: number;
  rank: string;
  maxRank: string;
  avatar: string;
  contests: CodeforcesContest[];
}

const isCodeforces = (v: unknown): v is CodeforcesActivity =>
  !!v &&
  typeof (v as CodeforcesActivity).handle === "string" &&
  typeof (v as CodeforcesActivity).rating === "number" &&
  Array.isArray((v as CodeforcesActivity).contests);

/* ---------------------------------------------------------------- caching */

const MEM_TTL = 30 * 60 * 1000;
const DISK_KEY = "portfolio:activity:v5";
const DISK_TTL = 6 * 60 * 60 * 1000;

// Evict legacy cache keys from previous revisions
if (typeof window !== "undefined") {
  try {
    ["portfolio:activity", "portfolio:activity:v1", "portfolio:activity:v2", "portfolio:activity:v3", "portfolio:activity:v4"].forEach(
      (k) => localStorage.removeItem(k),
    );
  } catch {}
}

type Disk = { t: number; gh?: GithubActivity; lc?: LeetCodeActivity; oss?: GithubOss; cf?: CodeforcesActivity };
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
export function invalidateActivity(kind: "gh" | "lc" | "oss" | "cf") {
  delete mem[kind];
}

function load<T>(
  kind: "gh" | "lc" | "oss" | "cf",
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
  !!v &&
  typeof (v as GithubActivity).total === "number" &&
  (v as GithubActivity).total > 0 &&
  Array.isArray((v as GithubActivity).days) &&
  (v as GithubActivity).days.length > 0 &&
  (v as GithubActivity).days.some((d) => d.count > 0 || d.level > 0);

const isLeet = (v: unknown): v is LeetCodeActivity =>
  !!v &&
  typeof (v as LeetCodeActivity).solved === "number" &&
  (v as LeetCodeActivity).solved > 0 &&
  Array.isArray((v as LeetCodeActivity).badges) &&
  Array.isArray((v as LeetCodeActivity).submissions?.days) &&
  (v as LeetCodeActivity).submissions.days.length > 0 &&
  (v as LeetCodeActivity).submissions.days.some((d) => d.count > 0 || d.level > 0);

export const fetchGithubActivity = (): Promise<GithubActivity> =>
  load("gh", "/api/github/contributions", (d) => d?.gh, isGithub, (v) => writeDisk({ gh: v }));

export const fetchLeetCodeActivity = (): Promise<LeetCodeActivity> =>
  load("lc", "/api/leetcode", (d) => d?.lc, isLeet, (v) => writeDisk({ lc: v }));

export const fetchGithubOss = (): Promise<GithubOss> =>
  load("oss", "/api/github/oss", (d) => d?.oss, isGithubOss, (v) => writeDisk({ oss: v }));

export const fetchCodeforcesActivity = async (): Promise<CodeforcesActivity> => {
  try {
    return await load("cf", "/api/codeforces", (d) => d?.cf, isCodeforces, (v) => writeDisk({ cf: v }));
  } catch {
    /* Worker proxy unavailable (dev mode runs vite without wrangler) — hit
       Codeforces API directly. codeforces.com sends Access-Control-Allow-Origin:
       *, so CORS is fine from the browser. */
    const handle = "sachinapr20";
    const [infoRes, ratingRes] = await Promise.all([
      fetch(`https://codeforces.com/api/user.info?handles=${handle}`),
      fetch(`https://codeforces.com/api/user.rating?handle=${handle}`),
    ]);
    const info = await infoRes.json();
    const rating = await ratingRes.json();
    if (info.status !== "OK" || rating.status !== "OK") {
      throw new Error("codeforces direct fetch failed");
    }
    const u = info.result?.[0] ?? {};
    const payload: CodeforcesActivity = {
      handle: u.handle ?? handle,
      rating: typeof u.rating === "number" ? u.rating : 0,
      maxRating: typeof u.maxRating === "number" ? u.maxRating : 0,
      rank: typeof u.rank === "string" ? u.rank : "unrated",
      maxRank: typeof u.maxRank === "string" ? u.maxRank : "unrated",
      avatar: typeof u.avatar === "string" ? u.avatar : "",
      contests: (Array.isArray(rating.result) ? rating.result : []).map((c: { contestName?: unknown; rank?: unknown; oldRating?: unknown; newRating?: unknown; ratingUpdateTimeSeconds?: unknown }) => ({
        name: String(c?.contestName ?? ""),
        rank: typeof c?.rank === "number" ? c.rank : 0,
        oldRating: typeof c?.oldRating === "number" ? c.oldRating : 0,
        newRating: typeof c?.newRating === "number" ? c.newRating : 0,
        at: typeof c?.ratingUpdateTimeSeconds === "number"
          ? new Date(c.ratingUpdateTimeSeconds * 1000).toISOString()
          : "",
      })),
    };
    writeDisk({ cf: payload });
    return payload;
  }
};

/** Fire all four in parallel; each side fails independently. */
export function fetchActivity(): Promise<{
  gh: GithubActivity | null;
  lc: LeetCodeActivity | null;
  oss: GithubOss | null;
  cf: CodeforcesActivity | null;
}> {
  return Promise.allSettled([
    fetchGithubActivity(),
    fetchLeetCodeActivity(),
    fetchGithubOss(),
    fetchCodeforcesActivity(),
  ]).then(([gh, lc, oss, cf]) => ({
    gh: gh.status === "fulfilled" ? gh.value : null,
    lc: lc.status === "fulfilled" ? lc.value : null,
    oss: oss.status === "fulfilled" ? oss.value : null,
    cf: cf.status === "fulfilled" ? cf.value : null,
  }));
}
