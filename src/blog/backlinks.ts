/* backlinks.json = the graph's wiki links, inverted: which notes point HERE.
   scripts/generate-graph.js emits it alongside graph.json (and re-derives it
   from the kept graph when the API is down). One fetch, reversed in memory. */

type BacklinksFile = {
  titles: Record<string, string>;
  links: [string, string][];
};

export type Backlinks = {
  from: string[];
  titles: Record<string, string>;
};

let loader: Promise<BacklinksFile> | null = null;
let reverse: Map<string, string[]> | null = null;

function load(): Promise<BacklinksFile> {
  loader ??= fetch("/backlinks.json")
    .then((r) => (r.ok ? (r.json() as Promise<BacklinksFile>) : { titles: {}, links: [] }))
    .catch(() => ({ titles: {}, links: [] }));
  return loader;
}

function buildReverse(links: [string, string][]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [src, target] of links) {
    const arr = map.get(target);
    if (arr) arr.push(src);
    else map.set(target, [src]);
  }
  for (const arr of map.values()) arr.sort();
  return map;
}

export async function getBacklinks(slug: string): Promise<Backlinks> {
  try {
    const file = await load();
    reverse ??= buildReverse(file.links);
    return { from: reverse.get(slug) ?? [], titles: file.titles };
  } catch {
    return { from: [], titles: {} };
  }
}
