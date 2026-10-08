import { SITE_DESCRIPTION, SITE_NAME, SOCIAL_HANDLE } from "./config";

/**
 * Hand-rolled <head> manager — react-helmet-async cost ~13.6KB in the entry
 * bundle to do what a dozen upserts do. A tag is identified by its role
 * (meta name/property, canonical link, json-ld script); applyHead upserts in
 * place — static tags from index.html are updated, never duplicated — and
 * drops managed tags the new spec doesn't mention.
 */

export type HeadTag =
  | { kind: "title"; content: string }
  | { kind: "meta"; attr: "name" | "property"; key: string; content: string }
  | { kind: "link"; rel: string; href: string }
  | { kind: "jsonLd"; content: string };

const tagId = (t: HeadTag): string =>
  t.kind === "title"
    ? "title"
    : t.kind === "link"
      ? `link:${t.rel}`
      : t.kind === "jsonLd"
        ? "jsonld"
        : `${t.attr}:${t.key}`;

/** pages without their own SEOHead fall back to whatever index.html shipped */
const BASE_TAGS: HeadTag[] = [
  { kind: "title", content: document.title },
  { kind: "meta", attr: "name", key: "description", content: SITE_DESCRIPTION },
  { kind: "meta", attr: "name", key: "author", content: SITE_NAME },
  { kind: "meta", attr: "property", key: "og:site_name", content: SITE_NAME },
  { kind: "meta", attr: "property", key: "og:locale", content: "en_IN" },
  { kind: "meta", attr: "name", key: "twitter:card", content: "summary_large_image" },
  { kind: "meta", attr: "name", key: "twitter:site", content: SOCIAL_HANDLE },
  { kind: "meta", attr: "name", key: "twitter:creator", content: SOCIAL_HANDLE },
];

/** later tags with the same id win — page specs replace base entries */
export const composeTags = (page: HeadTag[]): HeadTag[] => {
  const byId = new Map<string, HeadTag>();
  for (const t of [...BASE_TAGS, ...page]) byId.set(tagId(t), t);
  return [...byId.values()];
};

const upsert = (tag: HeadTag) => {
  if (tag.kind === "title") {
    document.title = tag.content;
    return;
  }
  if (tag.kind === "jsonLd") {
    let el = document.head.querySelector<HTMLScriptElement>(
      'script[data-seo="jsonld"]',
    );
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.dataset.seo = "jsonld";
      document.head.appendChild(el);
    }
    el.textContent = tag.content;
    return;
  }
  const sel =
    tag.kind === "link"
      ? `link[rel="${tag.rel}"]`
      : `meta[${tag.attr}="${tag.key}"]`;
  let el = document.head.querySelector(sel);
  if (!el) {
    el = document.createElement(tag.kind === "link" ? "link" : "meta");
    if (tag.kind === "link") el.setAttribute("rel", tag.rel);
    else el.setAttribute(tag.attr, tag.key);
    document.head.appendChild(el);
  }
  const content = tag.kind === "link" ? tag.href : tag.content;
  if (tag.kind === "link") el.setAttribute("href", content);
  else el.setAttribute("content", content);
};

let appliedIds: string[] = [];

/**
 * Replace the managed tag set. Called with the composed spec on mount and
 * with the base spec on unmount — route swaps clean up before the next
 * effect runs, so tags never linger across pages.
 */
export const applyHead = (tags: HeadTag[]) => {
  const seen = new Set<string>();
  for (const tag of tags) {
    const id = tagId(tag);
    seen.add(id);
    upsert(tag);
  }
  for (const id of appliedIds) {
    if (seen.has(id)) continue;
    if (id === "title") continue; // base always carries a title
    if (id === "jsonld") {
      document.head.querySelector('script[data-seo="jsonld"]')?.remove();
      continue;
    }
    if (id.startsWith("link:")) {
      document.head.querySelector(`link[rel="${id.slice(5)}"]`)?.remove();
      continue;
    }
    const [attr, key] = id.split(/:(.*)/s);
    document.head
      .querySelector(`meta[${attr}="${key}"]`)
      ?.remove();
  }
  appliedIds = [...seen];
};

export const baseTags = BASE_TAGS;
