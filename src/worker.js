/* Cloudflare worker: API routes + SPA serving with server-side <head> injection.

   Social scrapers (X, LinkedIn, WhatsApp, Slack, Facebook…) fetch the HTML
   once and never run JavaScript, so the client-side head manager in src/seo
   is invisible to them. Every HTML response is rewritten here with the page's
   og/twitter/canonical/json-ld tags, looked up from /seo.json (emitted by
   scripts/generate-graph.js from the same content the SPA reads). */

const POST_PREFIX = "/blog/post/";
const SITE_FALLBACK = "https://portfolio.samtagon777.workers.dev";

/* --- /api/github/contributions -----------------------------------------
   GitHub has no public REST/GraphQL field for the profile calendar without
   a token, so we scrape the same HTML the profile page renders from. One
   fetch covers every cell, the streaks and the activity overview, and the
   whole payload is edge-cached for 30 minutes. */

const GH_USER = "SachinyadavAug20";
const DAY_MS = 86400000;
const ACTIVITY_TTL = 1800;

const dayKey = (d) => d.toISOString().slice(0, 10);

/* counts come from the tooltip text ("7 contributions on November 23rd."),
   the cells themselves only carry a 0–4 bucket */
function parseContributions(html) {
  const tips = new Map();
  const tipRe =
    /for="contribution-day-component-(\d+-\d+)"[^>]*>([^<]+)<\/tool-tip>/g;
  const idRe = /id="contribution-day-component-(\d+-\d+)"/;
  for (const tip of html.matchAll(tipRe)) {
    const id = tip[1];
    if (!id) continue;
    const text = tip[2].replace(/<[^>]+>/g, "").trim();
    const m = /^(\d+) contribution/.exec(text);
    tips.set(id, m ? Number(m[1]) : 0);
  }

  const days = [];
  const cellRe =
    /data-date="(\d{4}-\d{2}-\d{2})" id="contribution-day-component-(\d+-\d+)" data-level="(\d)"/g;
  for (const cell of html.match(cellRe) ?? []) {
    const m = cellRe.exec(cell);
    cellRe.lastIndex = 0;
    if (!m) continue;
    days.push({ date: m[1], count: tips.get(m[2]) ?? 0, level: Number(m[3]) });
  }
  if (!idRe.test(html) || days.length === 0) throw new Error("contribution markup changed");

  days.sort((a, b) => (a.date < b.date ? -1 : 1));

  /* current streak counts back from today, allowing today to be empty (the
     day isn't over); longest runs over the window GitHub gave us */
  let longest = 0;
  let run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    if (run > longest) longest = run;
  }
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) current++;
    else if (i !== days.length - 1) break;
  }
  const activeDays = days.filter((d) => d.count > 0).length;

  const pct = (label) => {
    const m = new RegExp(`${label} (\\d+)%`).exec(html);
    return m ? Number(m[1]) : 0;
  };
  const contribLine = /The contributions are [^<]*?(\d+)% commits, (\d+)% pull requests, (\d+)% code review, (\d+)% issues/.exec(
    html.replace(/\s+/g, " "),
  );
  const overview = contribLine
    ? { commits: Number(contribLine[1]), prs: Number(contribLine[2]), reviews: Number(contribLine[3]), issues: Number(contribLine[4]) }
    : { commits: pct("commits"), prs: pct("pull requests"), reviews: pct("code review"), issues: pct("issues") };

  const repos = [];
  const repoRe = /<a href="\/[^"]+\/[^"]+"[^>]*class="text-bold css-truncate css-truncate-target"[^>]*>([^<]+)<\/a>/g;
  for (const m of html.matchAll(repoRe)) {
    const name = m[1].trim();
    if (name && !repos.includes(name)) repos.push(name);
  }
  const otherRe = /and ([\d,]+) other repositories/.exec(html.replace(/\s+/g, " "));

  const orgs = [];
  for (const m of html.matchAll(/select-menu-item-text css-truncate css-truncate-target"[^>]*>(@[^<]+)</g)) {
    if (!orgs.includes(m[1])) orgs.push(m[1]);
  }

  const total = /([\d,]+) contributions in the last year/
    .exec(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "))?.[1]
    ?.replace(/,/g, "");

  return {
    total: total ? Number(total) : days.reduce((s, d) => s + d.count, 0),
    days,
    streak: { current, longest, activeDays },
    breakdown: overview,
    repos: repos.slice(0, 4),
    otherRepos: otherRe ? Number(otherRe[1].replace(/,/g, "")) : 0,
    orgs: orgs.slice(0, 8),
    from: days[0].date,
    to: days[days.length - 1].date,
    fetchedAt: Date.now(),
  };
}

async function buildGithubActivity() {
  const res = await fetch(`https://github.com/users/${GH_USER}/contributions`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`github ${res.status}`);
  return parseContributions(await res.text());
}

/* --- /api/github/oss -----------------------------------------------------
   GitHub's public Events feed (no token) exposes every pull request
   merged/opened, every review submitted, every push, etc. The dev box gets
   rate-limited, but the Worker has its own egress IP and we cache 30 min,
   so the hourly API ceiling (60/hr/IP) is never approached. */

const GH_API = "https://api.github.com";

/* Derive the full "owner/repo" from a GitHub API object url, e.g.
   "https://api.github.com/repos/meshery/meshery/pulls/24052" → "meshery/meshery". */
const repoFullName = (apiUrl) =>
  apiUrl?.split("/repos/")[1]?.split("/pulls/")[0] || "";

/* api.github.com/repos/A/B/pulls/N → github.com/A/B/pull/N (public link). */
const prHtmlUrl = (apiUrl) =>
  apiUrl
    .replace("api.github.com/repos/", "github.com/")
    .replace("/pulls/", "/pull/");

const repoName = (pr) =>
  repoFullName(pr?.head?.repo?.url) ||
  repoFullName(pr?.url) ||
  repoFullName(pr?.base?.repo?.url) ||
  "";

/* For reviews, the repo is where the PR lives (base), not the reviewer's
   fork. */
const repoBase = (pr) =>
  repoFullName(pr?.base?.repo?.url) ||
  repoFullName(pr?.url) ||
  repoFullName(pr?.head?.repo?.url) ||
  "";

function parseOssEvents(events) {
  const mergedPulls = [];
  const reviews = [];
  const pushes = [];
  for (const e of events) {
    if (e.type === "PullRequestEvent") {
      const pr = e.payload?.pull_request;
      if (e.payload?.action === "merged" && pr) {
        const base = pr.url?.match(/github\.com\/([^/]+\/[^/]+)/)?.[1];
        mergedPulls.push({
          title: pr.title || `PR #${pr.number}`,
          number: pr.number,
          repo: repoName(pr),
          baseRepo: base || repoName(pr),
          url: pr.html_url || prHtmlUrl(pr.url),
          at: pr.merged_at || e.created_at,
        });
      }
    } else if (e.type === "PullRequestReviewEvent") {
      const pr = e.payload?.pull_request;
      if (pr) {
        const base = pr.url?.match(/github\.com\/([^/]+\/[^/]+)/)?.[1];
        reviews.push({
          state: e.payload?.review?.state || "commented",
          title: pr.title || `PR #${pr.number}`,
          number: pr.number,
          repo: repoBase(pr),
          baseRepo: base || repoBase(pr),
          url: pr.html_url || prHtmlUrl(pr.url),
          at: e.payload?.review?.submitted_at || e.created_at,
        });
      }
    } else if (e.type === "PushEvent") {
      pushes.push({ repo: e.repo?.name || "", commits: e.payload?.commits?.length ?? 0 });
    }
  }
  return { mergedPulls, reviews, pushes };
}

async function buildGithubOss() {
  const res = await fetch(`${GH_API}/users/${GH_USER}/events/public?per_page=100`, {
    headers: {
      "Accept": "application/vnd.github+json",
      "User-Agent": "portfolio-worker",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) throw new Error(`github events ${res.status}`);
  const events = await res.json();
  if (!Array.isArray(events)) throw new Error("unexpected events payload");
  const { mergedPulls, reviews, pushes } = parseOssEvents(events);
  const counts = {
    mergedPulls: mergedPulls.length,
    reviews: reviews.length,
    pushes: pushes.length,
  };
  return { mergedPulls, reviews, pushes, counts };
}

/* --- /api/leetcode ----------------------------------------------------- */

const LC_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
  "Knight",
  "Knight Guardian",
  "Grandmaster",
  "Legendary Grandmaster",
];

/* submissionCalendar is a sparse {unixSeconds: count} map — densify it into a
   full trailing-year strip so the heatmap renders like GitHub's */
function submissionDays(calendar) {
  const counts = new Map();
  let raw = {};
  try {
    raw = JSON.parse(calendar || "{}");
  } catch {
    raw = {};
  }
  for (const [sec, n] of Object.entries(raw)) {
    counts.set(dayKey(new Date(Number(sec) * 1000)), Number(n) || 0);
  }

  const today = new Date();
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const days = [];
  for (let i = 364; i >= 0; i--) {
    const date = dayKey(new Date(end - i * DAY_MS));
    days.push({ date, count: counts.get(date) ?? 0, level: 0 });
  }

  /* bucket non-zero days into 0–4 like GitHub's quartile scale */
  const nonZero = days.filter((d) => d.count > 0).map((d) => d.count).sort((a, b) => a - b);
  const q = (p) => (nonZero.length ? nonZero[Math.min(nonZero.length - 1, Math.floor(p * nonZero.length))] : 1);
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  for (const d of days) {
    if (d.count === 0) d.level = 0;
    else if (d.count <= q1) d.level = 1;
    else if (d.count <= q2) d.level = 2;
    else if (d.count <= q3) d.level = 3;
    else d.level = 4;
  }

  const active = days.filter((d) => d.count > 0);
  let maxStreak = 0;
  let run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    if (run > maxStreak) maxStreak = run;
  }
  /* today may legitimately be empty — walk back from yesterday first */
  let currentStreak = 0;
  let i = days.length - 1;
  if (i >= 0 && days[i].count === 0) i--;
  for (; i >= 0 && days[i].count > 0; i--) currentStreak++;

  return {
    total: active.reduce((s, d) => s + d.count, 0),
    activeDays: active.length,
    maxStreak,
    currentStreak,
    days,
  };
}

function leetcodePayload(d) {
  const rank = d.userContestRanking;
  const m = d.matchedUser;
  /* difficulty keys arrive as "Easy" from submitStatsGlobal/allQuestionsCount
     but as "EASY" from userProfileUserQuestionProgressV2 — normalise both */
  const byDiff = (rows, key) =>
    Object.fromEntries((rows ?? []).map((x) => [String(x.difficulty).toLowerCase(), x[key]]));
  const ac = byDiff(m?.submitStatsGlobal?.acSubmissionNum, "count");
  const totals = byDiff(d.allQuestionsCount, "count");
  const failed = byDiff(d.userProfileUserQuestionProgressV2?.numFailedQuestions, "count");

  const bucket = (key) => {
    const k = key.toLowerCase();
    return { solved: ac[k] ?? 0, total: totals[k] ?? 0 };
  };
  const submissions = submissionDays(m?.submissionCalendar);

  /* exact rank needs a session — approximate from the stated top % instead */
  const totalParticipants = rank?.totalParticipants ?? 0;
  const topPercentage = rank?.topPercentage ?? 0;
  const rankEstimate = totalParticipants ? Math.round((topPercentage / 100) * totalParticipants) : 0;

  const badgeNames = new Set((m?.badges ?? []).map((b) => (b.displayName || b.name || "").toLowerCase()));
  const level = [...LC_LEVELS].reverse().find((l) => badgeNames.has(l.toLowerCase())) ?? "";

  const histogram = (d.contestRatingHistogram ?? []).map((b) => ({
    userCount: b.userCount,
    topPercentage: b.topPercentage,
  }));

  return {
    profile: {
      username: "b2mIkNz0h5",
      name: m?.profile?.realName || "",
      avatar: m?.profile?.userAvatar || "",
    },
    level,
    solved: ac.all ?? 0,
    contest: {
      rating: rank?.rating ?? 0,
      topPercentage,
      attended: rank?.attendedContestsCount ?? 0,
      totalParticipants,
      rank: rankEstimate,
      history: (d.userContestRankingHistory ?? [])
        .filter((h) => h?.attended && typeof h.rating === "number")
        .map((h) => ({ rating: h.rating, title: h.contest?.title ?? "", time: h.contest?.startTime ?? 0 })),
    },
    questions: {
      all: bucket("All"),
      easy: bucket("Easy"),
      medium: bucket("Medium"),
      hard: bucket("Hard"),
      attempting: (failed.easy ?? 0) + (failed.medium ?? 0) + (failed.hard ?? 0),
    },
    badges: (m?.badges ?? []).map((b) => {
      const isLevel =
        (b.name || "").toLowerCase().includes("knight") ||
        (b.name || "").toLowerCase().includes("guardian");
      return {
        id: b.id ?? "",
        name: b.name ?? "",
        displayName: b.displayName ?? b.name ?? "",
        icon: (b.icon ?? "").startsWith("http")
          ? b.icon
          : `https://leetcode.com${b.icon ?? ""}`,
        medalUrl: b.id
          ? `https://leetcode.com/medal/?showImg=0&id=${b.id}&isLevel=${isLevel ? "true" : "false"}`
          : `https://leetcode.com/u/b2mIkNz0h5`,
      };
    }),
    submissions,
    histogram,
    fetchedAt: Date.now(),
  };
}


let seoPromise = null;

function loadSeo(env, url) {
  if (!seoPromise) {
    seoPromise = env.ASSETS
      .fetch(new URL("/seo.json", url))
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return seoPromise;
}

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function absUrl(site, image) {
  if (!image) return `${site}/images/og.png?v=2`;
  return /^https?:\/\//i.test(image) ? image : `${site}${image.startsWith("/") ? "" : "/"}${image}`;
}

function resolveEntry(rawPath, seo) {
  const site = seo?.site || SITE_FALLBACK;
  const fallbackImage = seo?.fallbackImage || "/images/og.png?v=2";
  /* one canonical form per page: "/blog/" and "/blog" are the same page, and
     a shared trailing-slash URL must not land on the noindex catch-all */
  const pathname =
    rawPath.length > 1 ? rawPath.replace(/\/+$/, "") || "/" : rawPath;

  const page = seo?.pages?.[pathname];
  if (page) {
    return { kind: "page", path: pathname, site, title: page.t, desc: page.d, image: absUrl(site, fallbackImage), url: `${site}${pathname}` };
  }

  if (pathname.startsWith(POST_PREFIX)) {
    let slug = pathname.slice(POST_PREFIX.length);
    try {
      slug = decodeURIComponent(slug);
    } catch {}
    slug = slug.replace(/\/+$/, "");
    const post = seo?.posts?.[slug];
    if (post) {
      return {
        kind: "post",
        site,
        slug,
        /* client renders `${title} — Blog` — keep the preview identical */
        title: `${post.t} — Blog`,
        desc: post.d,
        image: absUrl(site, post.img || fallbackImage),
        hasOwnImage: !!post.img,
        url: `${site}${pathname}`,
        dir: post.dir || "",
        pub: post.pub,
        mod: post.mod,
      };
    }
    return {
      kind: "noindex",
      site,
      title: "Post not found",
      desc: "The page you are looking for does not exist.",
      image: absUrl(site, fallbackImage),
      url: `${site}${pathname}`,
      robots: "noindex,follow",
    };
  }

  /* SPA catch-all — anything the router doesn't know is a 404 */
  return {
    kind: "noindex",
    site,
    title: "Page Not Found",
    desc: "The page you are looking for does not exist.",
    image: absUrl(site, fallbackImage),
    url: `${site}${pathname}`,
    robots: "noindex,follow",
  };
}

function buildTags(entry, seo) {
  const siteName = seo?.siteName || "Sachin Yadav";
  const handle = seo?.handle || "@samtagon38824";
  const alt = seo?.imageAlt || "Sachin Yadav Portfolio";
  const person = seo?.person || `${entry.site}/#person`;
  const isPost = entry.kind === "post";
  const isHome = entry.kind === "page" && entry.url === `${entry.site}/`;
  /* an empty og:description renders as a blank snippet on WhatsApp/X */
  const desc =
    entry.desc && entry.desc.trim()
      ? entry.desc
      : "Notes on programming, full-stack development and computer science from Sachin Yadav's Obsidian vault.";
  const fullTitle = entry.title.includes(siteName)
    ? entry.title
    : `${entry.title} | ${siteName}`;
  const defaultImage = `${entry.site}/images/og.png?v=2`;
  const useCardDims = entry.image === defaultImage;

  let jsonLd;
  if (isPost) {
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: entry.title,
      description: desc,
      image: entry.image,
      url: entry.url,
      mainEntityOfPage: { "@type": "WebPage", "@id": entry.url },
      author: { "@type": "Person", "@id": person, name: siteName },
      publisher: { "@type": "Person", "@id": person, name: siteName },
      ...(entry.pub && { datePublished: entry.pub }),
      ...(entry.mod && { dateModified: entry.mod }),
    };
  } else if (isHome) {
    jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Person",
          "@id": person,
          name: siteName,
          url: entry.site,
          jobTitle: "Full-Stack Developer",
          sameAs: seo?.sameAs || [],
        },
        {
          "@type": "WebSite",
          "@id": `${entry.site}/#website`,
          url: entry.site,
          name: siteName,
          publisher: { "@id": person },
          inLanguage: "en",
        },
      ],
    };
  } else if (entry.path === "/blog") {
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: entry.title,
      description: desc,
      url: entry.url,
      publisher: { "@id": person },
    };
  } else if (entry.path === "/graph") {
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: entry.title,
      description: desc,
      url: entry.url,
      isPartOf: { "@id": `${entry.site}/#website` },
    };
  } else if (entry.path === "/links") {
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      name: entry.title,
      description: desc,
      url: entry.url,
      mainEntity: {
        "@type": "Person",
        "@id": person,
        name: siteName,
        url: entry.site,
        jobTitle: "Full-Stack Developer",
        sameAs: seo?.sameAs || [],
      },
    };
  } else if (entry.kind === "page") {
    /* section mirror routes (/contact, /experience, …) and future pages */
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: entry.title,
      description: desc,
      url: entry.url,
      isPartOf: { "@id": `${entry.site}/#website` },
    };
  }

  const section = isPost && entry.dir ? entry.dir.split("/").pop() : "";

  return [
    `<title>${esc(fullTitle)}</title>`,
    `<meta name="description" content="${esc(desc)}" />`,
    `<link rel="canonical" href="${esc(entry.url)}" />`,
    entry.robots ? `<meta name="robots" content="${esc(entry.robots)}" />` : "",
    `<meta property="og:title" content="${esc(entry.title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:url" content="${esc(entry.url)}" />`,
    `<meta property="og:type" content="${isPost ? "article" : "website"}" />`,
    `<meta property="og:site_name" content="${esc(siteName)}" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta property="og:image" content="${esc(entry.image)}" />`,
    `<meta property="og:image:alt" content="${esc(alt)}" />`,
    useCardDims ? `<meta property="og:image:type" content="image/png" />` : "",
    useCardDims ? `<meta property="og:image:width" content="1200" />` : "",
    useCardDims ? `<meta property="og:image:height" content="630" />` : "",
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(entry.title)}" />`,
    `<meta name="twitter:description" content="${esc(desc)}" />`,
    `<meta name="twitter:image" content="${esc(entry.image)}" />`,
    `<meta name="twitter:image:alt" content="${esc(alt)}" />`,
    `<meta name="twitter:site" content="${esc(handle)}" />`,
    `<meta name="twitter:creator" content="${esc(handle)}" />`,
    isPost && entry.pub ? `<meta property="article:published_time" content="${esc(entry.pub)}" />` : "",
    isPost && entry.mod ? `<meta property="article:modified_time" content="${esc(entry.mod)}" />` : "",
    isPost && section ? `<meta property="article:section" content="${esc(section)}" />` : "",
    isPost ? `<meta property="article:author" content="${esc(person)}" />` : "",
    jsonLd ? `<script type="application/ld+json" data-seo="jsonld">${JSON.stringify(jsonLd)}</script>` : "",
  ]
    .filter(Boolean)
    .join("\n  ");
}

/* strip the tags we manage from <head>, then insert the new block — the
   client-side head manager upserts with the same selectors, so both layers
   stay consistent and never duplicate */
function injectHead(html, block) {
  const end = html.lastIndexOf("</head>");
  if (end === -1) return html;
  const start = html.indexOf("<head");
  if (start === -1) return html;
  let head = html.slice(start, end);

  const keys = [
    "description",
    "robots",
    "og:title",
    "og:description",
    "og:url",
    "og:type",
    "og:site_name",
    "og:locale",
    "og:image",
    "og:image:type",
    "og:image:secure_url",
    "og:image:width",
    "og:image:height",
    "og:image:alt",
    "twitter:card",
    "twitter:title",
    "twitter:description",
    "twitter:image",
    "twitter:image:alt",
    "twitter:site",
    "twitter:creator",
    "article:published_time",
    "article:modified_time",
    "article:section",
    "article:author",
  ];
  for (const key of keys) {
    head = head.replace(new RegExp(`<meta[^>]*\\s(?:name|property)="${key}"[^>]*>\\s*`, "gi"), "");
  }
  head = head.replace(/<title[^>]*>[\s\S]*?<\/title>\s*/i, "");
  head = head.replace(/<link[^>]*rel="canonical"[^>]*>\s*/gi, "");
  head = head.replace(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>\s*/gi, "");

  return `${html.slice(0, start)}\n<head>${head}\n  ${block}\n  ${html.slice(end)}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/views" || url.pathname.startsWith("/api/views/")) {
      const slug = url.pathname.replace("/api/views/", "");
      if (!slug) {
        return new Response(JSON.stringify({ error: "missing slug" }), { status: 400 });
      }
      if (slug.length > 200) {
        return new Response(JSON.stringify({ error: "slug too long" }), { status: 400 });
      }
      const key = `views:${slug}`;
      const current = parseInt((await env.BLOG_VIEWS.get(key)) ?? "0", 10);
      const increment = url.searchParams.get("increment") === "1";
      const views = increment ? current + 1 : current;
      if (increment) {
        await env.BLOG_VIEWS.put(key, String(views));
      }
      return new Response(JSON.stringify({ views }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    /* GitHub contribution calendar — scraped once at the edge and cached;
       the SPA falls back to the last persisted payload if this 502s. */
    if (url.pathname === "/api/github/contributions") {
      const cache = caches.default;
      const cacheKey = new Request(new URL("/api/github/contributions", url.origin));
      try {
        const hit = await cache.match(cacheKey);
        if (hit) return hit;
      } catch {
        /* cache unavailable — fall through */
      }

      try {
        const data = await buildGithubActivity();
        const body = JSON.stringify(data);
        const response = new Response(body, {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${ACTIVITY_TTL}, stale-while-revalidate=86400`,
          },
        });
        try {
          await cache.put(
            cacheKey,
            new Response(body, {
              headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${ACTIVITY_TTL}` },
            }),
          );
        } catch {
          /* best-effort */
        }
        return response;
      } catch {
        return new Response(JSON.stringify({ error: "unavailable" }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    /* GitHub OSS activity — merged PRs, PR reviews, push events from the
       public Events feed. Used by the GitHub card to show "what you're
       doing in the wild" — gives it vertical weight to match the LeetCode
       card. */
    if (url.pathname === "/api/github/oss") {
      const cache = caches.default;
      /* v param so a code change can bust the stale dev cache */
      const cacheKey = new Request(new URL("/api/github/oss?v=2", url.origin));
      try {
        const hit = await cache.match(cacheKey);
        if (hit) return hit;
      } catch {
        /* fall through */
      }

      try {
        const oss = await buildGithubOss();
        const body = JSON.stringify(oss);
        const response = new Response(body, {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${ACTIVITY_TTL}, stale-while-revalidate=86400`,
          },
        });
        try {
          await cache.put(
            cacheKey,
            new Response(body, {
              headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${ACTIVITY_TTL}` },
            }),
          );
        } catch { /* best-effort */ }
        return response;
      } catch (e) {
        return new Response(JSON.stringify({ error: "unavailable", details: e?.message }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    /* Full LeetCode dashboard payload. One batched query — every field below
       was verified against the live schema (userContestRankingV2, attempted,
       globalRanking etc. do NOT exist / need auth). The exact global rank is
       only exposed to logged-in sessions, so it's derived from the rating
       histogram instead and flagged as an estimate. */
    if (url.pathname === "/api/leetcode") {
      const cache = caches.default;
      const cacheKey = new Request(new URL("/api/leetcode", url.origin));
      try {
        const hit = await cache.match(cacheKey);
        if (hit) return hit;
      } catch {
        /* cache unavailable — fall through to a live fetch */
      }

      const QUERY = `query{
        userContestRanking(username:"b2mIkNz0h5"){
          rating topPercentage attendedContestsCount totalParticipants
        }
        userContestRankingHistory(username:"b2mIkNz0h5"){
          attended rating ranking contest{ title startTime }
        }
        matchedUser(username:"b2mIkNz0h5"){
          profile{ realName userAvatar }
          submitStatsGlobal{ acSubmissionNum{ difficulty count } }
          submissionCalendar
          badges{ id name displayName icon }
        }
        userProfileUserQuestionProgressV2(userSlug:"b2mIkNz0h5"){
          numAcceptedQuestions{ difficulty count }
          numFailedQuestions{ difficulty count }
        }
        allQuestionsCount{ difficulty count }
        contestRatingHistogram{ userCount topPercentage }
      }`;

      try {
        const res = await fetch("https://leetcode.com/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Origin": "https://leetcode.com" },
          body: JSON.stringify({ query: QUERY }),
        });
        const payload = await res.json();
        if (payload.errors?.length || !payload.data) throw new Error("graphql error");
        const out = leetcodePayload(payload.data);

        const body = JSON.stringify(out);
        const response = new Response(body, {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${ACTIVITY_TTL}, stale-while-revalidate=86400`,
          },
        });
        try {
          await cache.put(
            cacheKey,
            new Response(body, {
              headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${ACTIVITY_TTL}` },
            }),
          );
        } catch {
          /* caching is best-effort */
        }
        return response;
      } catch {
        return new Response(JSON.stringify({ error: "unavailable" }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const res = (await env.ASSETS?.fetch(request)) ?? new Response(null, { status: 404 });
    const type = res.headers.get("content-type") || "";

    /* /assets/* is content-hashed — pin it for a year; images and models
       change rarely — a day plus SWR; the JSON build artifacts (graph, seo,
       blog-tree) stay fresh for 5 minutes then revalidate in the background.
       Repeat visits stop paying revalidation round-trips. ASSETS headers are
       immutable, so a matching file gets a fresh Response instead. */
    if ((request.method === "GET" || request.method === "HEAD") && res.status === 200) {
      const p = url.pathname;
      const cache = p.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : p.startsWith("/images/") || p.startsWith("/models/")
          ? "public, max-age=86400, stale-while-revalidate=604800"
          : /^\/(seo|graph|dates|backlinks|blog-tree)\.json$/.test(p)
            ? "public, max-age=300, stale-while-revalidate=3600"
            : null;
      if (cache) {
        const headers = new Headers(res.headers);
        headers.set("Cache-Control", cache);
        return new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers,
        });
      }
    }

    if (request.method !== "GET" || !type.includes("text/html")) return res;

    /* HTML navigation (SPA routes fall back to index.html inside ASSETS) —
       rewrite the head with this page's social tags before it leaves the edge */
    try {
      const seo = await loadSeo(env, url);
      const html = await res.text();
      const entry = resolveEntry(url.pathname, seo);
      const block = buildTags(entry, seo);
      return new Response(injectHead(html, block), {
        status: res.status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": res.headers.get("cache-control") || "public, max-age=0, must-revalidate",
        },
      });
    } catch (err) {
      console.error("seo: head injection failed:", err);
      return res;
    }
  },
};
