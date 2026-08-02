import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const OWNER = "SachinyadavAug20";
const REPO = "My-Obsidian-notes";
const BRANCH = "main";
const BLOG_ROOT = "Notes";

const SITEMAP_PATH = resolve(import.meta.dirname, "../public/sitemap.xml");

function getBaseUrl() {
  try {
    const existing = readFileSync(SITEMAP_PATH, "utf-8");
    const match = existing.match(/<loc>(.+?)<\/loc>/);
    if (match) return match[1].replace(/\/$/, "");
  } catch {}
  return "https://portfolio.samtagon777.workers.dev";
}

function escapeXml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function getLastmod(slug) {
  return new Date().toISOString().split("T")[0];
}

async function main() {
  const baseUrl = getBaseUrl();

  let tree;
  try {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "sitemap-generator" },
    });
    if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
    const data = await res.json();
    tree = data.tree;
  } catch (err) {
    console.error("Failed to fetch GitHub tree:", err.message);
    process.exit(1);
  }

  const prefix = `${BLOG_ROOT}/`;
  const slugs = tree
    .filter((item) => item.type === "blob" && item.path.endsWith(".md") && item.path.startsWith(prefix))
    .map((item) => item.path.slice(prefix.length).replace(/\.md$/, ""));

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <url>",
    `    <loc>${escapeXml(baseUrl)}/</loc>`,
    `    <lastmod>${getLastmod("/")}</lastmod>`,
    "    <changefreq>monthly</changefreq>",
    "    <priority>1.0</priority>",
    "  </url>",
    "  <url>",
    `    <loc>${escapeXml(baseUrl)}/blog</loc>`,
    `    <lastmod>${getLastmod("/blog")}</lastmod>`,
    "    <changefreq>weekly</changefreq>",
    "    <priority>0.8</priority>",
    "  </url>",
  ];

  for (const slug of slugs) {
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(baseUrl)}/blog/post/${escapeXml(slug)}</loc>`);
    lines.push("    <priority>0.6</priority>");
    lines.push(`    <lastmod>${getLastmod(slug)}</lastmod>`);
    lines.push("  </url>");
  }

  lines.push("</urlset>");
  writeFileSync(SITEMAP_PATH, lines.join("\n") + "\n");
  console.log(`Generated sitemap with ${slugs.length} blog post URLs at ${SITEMAP_PATH}`);
}

main();
