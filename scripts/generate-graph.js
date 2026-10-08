import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const OWNER = "SachinyadavAug20";
const REPO = "My-Obsidian-notes";
const BRANCH = "main";
const BLOG_ROOT = "Notes";

const OUT_PATH = resolve(import.meta.dirname, "../public/graph.json");
const DATES_PATH = resolve(import.meta.dirname, "../public/dates.json");

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

async function fetchSlugs() {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`;
  const res = await fetchWithRetry(url, githubHeaders());
  const data = await res.json();
  const prefix = `${BLOG_ROOT}/`;
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
  return match ? match[1].trim() : fallback;
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

function keepExisting(reason) {
  if (existsSync(OUT_PATH)) {
    console.warn(`generate-graph: ${reason}; keeping existing graph.json.`);
    process.exit(0);
  }
  console.error(`generate-graph: ${reason}; no existing graph.json to keep.`);
  process.exit(1);
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
