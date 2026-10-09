import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const OWNER = "SachinyadavAug20";
const REPO = "My-Obsidian-notes";
const BRANCH = "main";
const BLOG_ROOT = "Notes";

const OUT_PATH = resolve(import.meta.dirname, "../public/graph.json");
const DATES_PATH = resolve(import.meta.dirname, "../public/dates.json");
const BACKLINKS_PATH = resolve(import.meta.dirname, "../public/backlinks.json");
const SEO_PATH = resolve(import.meta.dirname, "../public/seo.json");
const SITEMAP_PATH = resolve(import.meta.dirname, "../public/sitemap.xml");

const FETCH_CONCURRENCY = 8;
const MAX_ATTEMPTS = 3;
const MAX_FAILED_FETCHES = 40; // bail (keep existing file) if the vault is mostly unreachable
const RECENT_COMMITS = 30; // how far back "last updated" reaches
const FRESH_DAYS = 21; // notes touched this recently get the fresh ring

function githubHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "graph-generator",
  };
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchWithRetry(url, headers, attempts = MAX_ATTEMPTS) {
  let lastErr = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) return res;
      if (res.status === 403 || res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status}`);
        if (attempt < attempts) {
          await new Promise((r) => setTimeout(r, attempt * 1000));
          continue;
        }
        throw lastErr;
      }
      throw new Error(`HTTP ${res.status}`); // 4xx other than rate-limit: no point retrying
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) {
        await new Promise((r) => setTimeout(r, attempt * 1000));
        continue;
      }
    }
  }
  throw lastErr;
}

/* every blob in the tree — first-image lookup for seo.json resolves against
   this instead of guessing attachment folder names (attachement/attachements/
   attachment/attachments all exist in the vault) */
let treeBlobSet = null;

async function fetchSlugs() {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`;
  const res = await fetchWithRetry(url, githubHeaders());
  const data = await res.json();
  const prefix = `${BLOG_ROOT}/`;
  treeBlobSet = new Set(
    (data.tree || [])
      .filter((item) => item.type === "blob" && item.path.startsWith(prefix))
      .map((item) => item.path),
  );
  return (data.tree || [])
    .filter(
      (item) =>
        item.type === "blob" &&
        item.path.endsWith(".md") &&
        item.path.startsWith(prefix) &&
        !item.path.includes("/.obsidian/"),
    )
    .map((item) => item.path.slice(prefix.length).replace(/\.md$/, ""));
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function fetchNote(slug) {
  const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${encodeURI(`${BLOG_ROOT}/${slug}.md`)}`;
  const res = await fetchWithRetry(url, githubHeaders());
  return res.text();
}

/**
 * Map each note slug → the date of the newest commit that touched it.
 * 1 list request + RECENT_COMMITS detail requests (within the unauth
 * rate limit); any failure degrades to a partial/empty map — the graph
 * still builds, previous dates are kept via mergeUpdates().
 */
async function fetchRecentUpdates() {
  const headers = githubHeaders();
  const updates = new Map();
  let list;
  try {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/commits?path=${BLOG_ROOT}&per_page=${RECENT_COMMITS}`;
    const res = await fetchWithRetry(url, headers);
    list = await res.json();
  } catch (err) {
    console.warn(`generate-graph: commit list failed (${err.message}); reusing previous dates`);
    return updates;
  }
  if (!Array.isArray(list) || list.length === 0) return updates;

  const details = await mapPool(list, FETCH_CONCURRENCY, async (c) => {
    try {
      const res = await fetchWithRetry(
        `https://api.github.com/repos/${OWNER}/${REPO}/commits/${c.sha}`,
        headers,
      );
      return await res.json();
    } catch {
      return null; // rate-limited or flaky — partial dates are fine
    }
  });

  for (const detail of details) {
    if (!detail || !Array.isArray(detail.files)) continue;
    const date = detail.commit?.author?.date || detail.commit?.committer?.date;
    if (!date) continue;
    for (const f of detail.files) {
      if (!f.filename || !f.filename.startsWith(`${BLOG_ROOT}/`)) continue;
      const slug = f.filename.slice(BLOG_ROOT.length + 1).replace(/\.md$/, "");
      const prev = updates.get(slug);
      if (!prev || date > prev) updates.set(slug, date);
    }
  }
  return updates;
}

/** dates already shipped in graph.json — so a rate-limited run never
 *  forgets what the previous build knew */
function loadPreviousUpdates() {
  const map = new Map();
  try {
    if (!existsSync(OUT_PATH)) return map;
    const prev = JSON.parse(readFileSync(OUT_PATH, "utf8"));
    for (const n of prev.nodes || []) {
      if (n.id && n.updated) map.set(n.id, n.updated);
    }
  } catch {
    /* unreadable previous graph — start fresh */
  }
  return map;
}

/** Strip image embeds, then pull every [[...]] target (alias + heading + Notes/ prefix stripped). */
function extractLinkTargets(content) {
  const withoutEmbeds = content.replace(/!\[\[[^\]]*\]\]/g, "");
  const targets = [];
  for (const match of withoutEmbeds.matchAll(/\[\[([^\]]+)\]\]/g)) {
    let target = match[1];
    const pipe = target.indexOf("|");
    if (pipe !== -1) target = target.slice(0, pipe);
    const hash = target.indexOf("#");
    if (hash !== -1) target = target.slice(0, hash);
    target = target.trim();
    if (!target) continue;
    if (target.startsWith(`${BLOG_ROOT}/`)) target = target.slice(BLOG_ROOT.length + 1);
    if (target.endsWith(".md")) target = target.slice(0, -3);
    targets.push(target);
  }
  return targets;
}

function extractTitle(content, fallback) {
  const match = content.match(/^#{1,6}\s+(.+)$/m);
  return cleanTitle(match ? match[1] : "", fallback);
}

/* headings in the vault routinely embed images (`![[Pasted image …]]`) or
   markdown — scrapers show this string as the card title, so strip the syntax
   and fall back to the filename when nothing readable survives */
function cleanTitle(raw, fallback) {
  const cleaned = raw
    .replace(/!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, " ")
    .replace(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`#>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[\s"'“”‘’.,:;!?()[\]=+/\\-]+/, "")
    .replace(/[\s"'“”‘’.,:;!?()[\]=+/\\|-]+$/, "");
  if (!/[\p{L}\p{N}]/u.test(cleaned)) return fallback;
  if (cleaned.length <= 100) return cleaned;
  return cleaned.slice(0, 97).replace(/\s+\S*$/, "") + "…";
}

/**
 * Obsidian-style resolution: exact slug → same-folder basename → global basename
 * (first-wins, collisions logged) → path-suffix match.
 */
function buildResolver(slugs, notesById) {
  const byLower = new Map();
  const byBase = new Map();
  const byDirBase = new Map();
  const collisions = new Map();

  for (const slug of slugs) {
    const lower = slug.toLowerCase();
    if (!byLower.has(lower)) byLower.set(lower, slug);
    const base = lower.split("/").pop();
    const dir = lower.includes("/") ? lower.slice(0, lower.lastIndexOf("/")) : "";
    const dirKey = `${dir}::${base}`;
    if (!byDirBase.has(dirKey)) byDirBase.set(dirKey, slug);
    if (byBase.has(base)) {
      collisions.set(base, (collisions.get(base) || 1) + 1);
    } else {
      byBase.set(base, slug);
    }
  }

  return function resolve(target, fromSlug) {
    const lower = target.toLowerCase();
    const direct = byLower.get(lower);
    if (direct) return direct;

    const base = lower.split("/").pop();
    if (lower.includes("/")) {
      // path-shaped but not a full slug: try matching as a suffix of a real slug
      for (const [slugLower, slug] of byLower) {
        if (slugLower.endsWith(`/${lower}`)) return slug;
      }
    }
    // prefer a note with that basename in the same folder as the linking note
    const fromLower = fromSlug.toLowerCase();
    const fromDir = fromLower.includes("/")
      ? fromLower.slice(0, fromLower.lastIndexOf("/"))
      : "";
    const sameDir = byDirBase.get(`${fromDir}::${base}`);
    if (sameDir) return sameDir;

    const global = byBase.get(base);
    if (global) return global;

    return null;
  };
}

function ensureFolders(dirs) {
  const folders = new Set();
  for (const dir of dirs) {
    if (!dir) continue;
    const parts = dir.split("/");
    let acc = "";
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      folders.add(acc);
    }
  }
  return [...folders];
}

/* a rate-limited run still ships the current static routes — posts and
   graph stay as-is, but new/renamed pages reach seo.json either way */
function refreshStaticSeo() {
  try {
    const prev = JSON.parse(readFileSync(SEO_PATH, "utf-8"));
    prev.generatedAt = new Date().toISOString();
    prev.pages = STATIC_PAGES;
    writeFileSync(SEO_PATH, JSON.stringify(prev) + "\n");
  } catch {}
}

function keepExisting(reason) {
  if (existsSync(OUT_PATH)) {
    console.warn(`generate-graph: ${reason}; keeping existing graph.json.`);
    try {
      writeBacklinks(JSON.parse(readFileSync(OUT_PATH, "utf-8")));
    } catch {}
    refreshStaticSeo();
    process.exit(0);
  }
  console.error(`generate-graph: ${reason}; no existing graph.json to keep.`);
  process.exit(1);
}

/* backlinks.json = wiki links inverted for the article page; titles limited
   to notes that actually take part so the artifact stays small */
function writeBacklinks(graph) {
  const wiki = (graph.links || []).filter((l) => l.kind === "wiki");
  const linked = new Set(wiki.flatMap((l) => [l.source, l.target]));
  const titles = {};
  for (const n of graph.nodes || []) {
    if (n.kind === "note" && linked.has(n.id)) titles[n.id] = n.title;
  }
  writeFileSync(
    BACKLINKS_PATH,
    JSON.stringify({
      generatedAt: graph.generatedAt,
      titles,
      links: wiki.map((l) => [l.source, l.target]),
    }) + "\n",
  );
  const kb = Math.round(readFileSync(BACKLINKS_PATH).byteLength / 1024);
  console.log(
    `generate-backlinks: ${Object.keys(titles).length} titles, ${wiki.length} wiki links, ${kb}KB → ${BACKLINKS_PATH}`,
  );
}

/* --- seo.json: what social scrapers read (the worker injects it into the
   HTML head — crawlers don't run JS, so client-side tags never reach them) --- */

/* same extraction BlogPost.tsx uses — server and client excerpts match */
function extractExcerpt(markdown) {
  const cleaned = markdown
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/!\[\[.*?\]\]/g, "")
    .replace(/[#*_~>|\[\]`-]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= 160) return cleaned;
  return cleaned.slice(0, 157).replace(/\s+\S*$/, "") + "...";
}

const IMG_EXT = /\.(png|jpe?g|gif|webp|bmp)$/i;

/* first embedded image, resolved against the real tree — the vault spreads
   attachments across attachement/attachements/attachment/attachments/ */
function firstImageUrl(content, dir) {
  if (!treeBlobSet) return null;
  const wiki = content.match(/!\[\[([^|\]]+?)(?:\|\d+)?\]\]/);
  const md = content.match(/!\[[^\]]*\]\(([^)]+)\)/);
  const raw = wiki ? wiki[1].trim() : md ? md[1].trim() : null;
  if (!raw) return null;
  /* already-absolute images are used as-is — scrapers fetch them fine */
  if (/^https?:\/\//i.test(raw)) {
    return IMG_EXT.test(raw.split(/[?#]/)[0]) ? raw : null;
  }
  if (!IMG_EXT.test(raw)) return null;
  const file = raw.split("/").pop();
  const root = dir ? `${BLOG_ROOT}/${dir}` : BLOG_ROOT;
  const folders = ["attachement", "attachements", "attachment", "attachments", ""];
  for (const folder of folders) {
    const path = folder ? `${root}/${folder}/${file}` : `${root}/${file}`;
    if (treeBlobSet.has(path)) {
      const encoded = path.split("/").map(encodeURIComponent).join("/");
      return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${encoded}`;
    }
  }
  return null;
}

function siteUrlFromSitemap() {
  try {
    const match = readFileSync(SITEMAP_PATH, "utf-8").match(/<loc>(.+?)<\/loc>/);
    if (match) return match[1].replace(/\/$/, "");
  } catch {}
  return "https://portfolio.samtagon777.workers.dev";
}

/* static routes the router knows — kept in seo.json so the worker can
   server-render their og tags (and never mark them noindex) */
const STATIC_PAGES = {
  "/": {
    t: "Sachin Yadav — Full-Stack Developer",
    d: "Hi, I'm Sachin, a developer based in India with a passion for code.",
  },
  "/blog": {
    t: "Blog",
    d: "Read about programming, full-stack development, and computer science from my Obsidian vault.",
  },
  "/graph": {
    t: "Knowledge Graph",
    d: "An interactive map of the ideas in my Obsidian vault — browse how my notes on programming, tools, and computer science connect, and jump straight into any note.",
  },
  "/links": {
    t: "Links",
    d: "Everywhere to find me — portfolio, blog, X, LinkedIn, GitHub, LeetCode, Codeforces, itch.io and more, all in one place.",
  },
};

function writeSeo(notes) {
  const site = siteUrlFromSitemap();
  const posts = {};
  let withImages = 0;
  for (const n of notes) {
    const entry = {
      t: n.title,
      /* an empty og:description renders as a blank snippet on WhatsApp/X —
         every post ships something scrapers can show */
      d: extractExcerpt(n.content) || "A note on programming and computer science from my Obsidian vault.",
    };
    const img = firstImageUrl(n.content, n.dir);
    if (img) {
      entry.img = img;
      withImages++;
    }
    if (n.updated) {
      entry.pub = n.updated;
      entry.mod = n.updated;
    }
    if (n.dir) entry.dir = n.dir;
    posts[n.id] = entry;
  }
  const seo = {
    generatedAt: new Date().toISOString(),
    site,
    siteName: "Sachin Yadav",
    handle: "@samtagon38824",
    person: `${site}/#person`,
    fallbackImage: "/images/og.png",
    imageAlt: "Sachin Yadav Portfolio",
    sameAs: [
      "https://www.linkedin.com/in/sachin-yadav-05a105374/",
      "https://github.com/SachinyadavAug20",
      "https://leetcode.com/u/b2mIkNz0h5/",
      "https://x.com/samtagon38824",
      "https://sachinapr20.itch.io/",
    ],
    pages: STATIC_PAGES,
    posts,
  };
  writeFileSync(SEO_PATH, JSON.stringify(seo) + "\n");
  const kb = Math.round(readFileSync(SEO_PATH).byteLength / 1024);
  console.log(
    `generate-seo: ${Object.keys(posts).length} posts, ${withImages} with images, ${Object.keys(seo.pages).length} pages, ${kb}KB → ${SEO_PATH}`,
  );
}

async function main() {
  const started = Date.now();
  let slugs;
  try {
    slugs = await fetchSlugs();
  } catch (err) {
    keepExisting(`failed to fetch git tree (${err.message})`);
    return;
  }
  if (!slugs || slugs.length === 0) keepExisting("empty git tree");

  /* last-update dates in parallel with the note fetches */
  const updatesPromise = (async () => {
    const fresh = await fetchRecentUpdates();
    const prev = loadPreviousUpdates();
    for (const [slug, date] of prev) {
      const cur = fresh.get(slug);
      if (!cur || date > cur) fresh.set(slug, date);
    }
    return fresh;
  })();

  const contents = await mapPool(slugs, FETCH_CONCURRENCY, async (slug) => {
    try {
      return await fetchNote(slug);
    } catch (err) {
      console.warn(`generate-graph: failed to fetch "${slug}": ${err.message}`);
      return null;
    }
  });

  const failed = contents.filter((c) => c === null).length;
  if (failed > MAX_FAILED_FETCHES) {
    keepExisting(`${failed}/${slugs.length} note fetches failed`);
    return;
  }

  const notes = [];
  const notesById = new Map();
  const dirs = new Set();

  slugs.forEach((slug, i) => {
    const content = contents[i];
    if (content === null) return;
    const dir = slug.includes("/") ? slug.slice(0, slug.lastIndexOf("/")) : "";
    const basename = slug.split("/").pop();
    const note = {
      id: slug,
      title: extractTitle(content, basename),
      kind: "note",
      dir,
      content,
    };
    notes.push(note);
    notesById.set(slug, note);
    if (dir) dirs.add(dir);
  });

  const resolveLink = buildResolver([...notesById.keys()], notesById);

  // --- last-update dates (fresh = touched within FRESH_DAYS of this build) ---
  const updates = await updatesPromise;
  const freshCutoff = Date.now() - FRESH_DAYS * 86400000;
  let updatedCount = 0;
  let freshCount = 0;
  for (const note of notes) {
    const updated = updates.get(note.id);
    if (!updated) continue;
    note.updated = updated;
    updatedCount += 1;
    if (Date.parse(updated) >= freshCutoff) {
      note.fresh = true;
      freshCount += 1;
    }
  }

  // --- edges ---
  const edgeKeys = new Set();
  const links = [];
  const addLink = (source, target, kind) => {
    if (!source || !target || source === target) return;
    const key =
      kind === "wiki"
        ? `wiki::${[source, target].sort().join("→")}`
        : `${kind}::${source}→${target}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    links.push({ source, target, kind });
  };

  let resolvedWiki = 0;
  let unresolvedWiki = 0;
  /* seo.json reads raw content — emit it before the markdown is stripped */
  writeSeo(notes);

  for (const note of notes) {
    const targets = extractLinkTargets(note.content);
    for (const target of targets) {
      const resolved = resolveLink(target, note.id);
      if (resolved) {
        resolvedWiki++;
        addLink(note.id, resolved, "wiki");
      } else {
        unresolvedWiki++;
      }
    }
    delete note.content; // never ship raw markdown in graph.json
  }

  // --- folders (leaf dirs get posts; intermediates give the tree a backbone) ---
  const folderPaths = ensureFolders([...dirs]);
  const folderNodes = folderPaths.map((path) => ({
    id: `dir:${path}`,
    title: path.split("/").pop(),
    kind: "folder",
    path,
  }));

  for (const note of notes) {
    if (note.dir) addLink(note.id, `dir:${note.dir}`, "member");
  }
  for (const path of folderPaths) {
    const idx = path.lastIndexOf("/");
    if (idx !== -1) addLink(`dir:${path.slice(0, idx)}`, `dir:${path}`, "parent");
  }

  const graph = {
    generatedAt: new Date().toISOString(),
    counts: {
      notes: notes.length,
      folders: folderNodes.length,
      links: links.length,
      wikiLinks: links.filter((l) => l.kind === "wiki").length,
      fresh: freshCount,
    },
    nodes: [...notes, ...folderNodes],
    links,
  };

  writeFileSync(OUT_PATH, JSON.stringify(graph, null, 1) + "\n");
  writeBacklinks(graph);
  /* BlogList only wants slug → updated; a slim artifact beats 154KB of graph */
  const dates = {};
  for (const n of notes) if (n.updated) dates[n.id] = n.updated;
  writeFileSync(
    DATES_PATH,
    JSON.stringify({ generatedAt: graph.generatedAt, dates }, null, 1) + "\n",
  );
  const kb = Math.round(readFileSync(OUT_PATH).byteLength / 1024);
  const datesKb = Math.round(readFileSync(DATES_PATH).byteLength / 1024);
  console.log(
    `generate-graph: ${graph.counts.notes} notes, ${graph.counts.folders} folders, ` +
      `${graph.counts.wikiLinks} wiki links (${resolvedWiki} resolved, ${unresolvedWiki} dangling dropped), ` +
      `${graph.counts.links} total edges, ${updatedCount} dated, ${freshCount} fresh, ` +
      `${kb}KB, ${Date.now() - started}ms → ${OUT_PATH} (+${datesKb}KB dates.json)`,
  );
}

main();
