/* Cloudflare worker: API routes + SPA serving with server-side <head> injection.

   Social scrapers (X, LinkedIn, WhatsApp, Slack, Facebook…) fetch the HTML
   once and never run JavaScript, so the client-side head manager in src/seo
   is invisible to them. Every HTML response is rewritten here with the page's
   og/twitter/canonical/json-ld tags, looked up from /seo.json (emitted by
   scripts/generate-graph.js from the same content the SPA reads). */

const POST_PREFIX = "/blog/post/";
const SITE_FALLBACK = "https://portfolio.samtagon777.workers.dev";

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
  if (!image) return `${site}/images/og.png`;
  return /^https?:\/\//i.test(image) ? image : `${site}${image.startsWith("/") ? "" : "/"}${image}`;
}

function resolveEntry(pathname, seo) {
  const site = seo?.site || SITE_FALLBACK;
  const fallbackImage = seo?.fallbackImage || "/images/og.png";

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
  const fullTitle = `${entry.title} | ${siteName}`;
  const defaultImage = `${entry.site}/images/og.png`;
  const useCardDims = entry.image === defaultImage;

  let jsonLd;
  if (isPost) {
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: entry.title,
      description: entry.desc,
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
      description: entry.desc,
      url: entry.url,
      publisher: { "@id": person },
    };
  } else if (entry.path === "/graph") {
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: entry.title,
      description: entry.desc,
      url: entry.url,
      isPartOf: { "@id": `${entry.site}/#website` },
    };
  } else if (entry.path === "/links") {
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      name: entry.title,
      description: entry.desc,
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
  }

  const section = isPost && entry.dir ? entry.dir.split("/").pop() : "";

  return [
    `<title>${esc(fullTitle)}</title>`,
    `<meta name="description" content="${esc(entry.desc)}" />`,
    `<link rel="canonical" href="${esc(entry.url)}" />`,
    entry.robots ? `<meta name="robots" content="${esc(entry.robots)}" />` : "",
    `<meta property="og:title" content="${esc(entry.title)}" />`,
    `<meta property="og:description" content="${esc(entry.desc)}" />`,
    `<meta property="og:url" content="${esc(entry.url)}" />`,
    `<meta property="og:type" content="${isPost ? "article" : "website"}" />`,
    `<meta property="og:site_name" content="${esc(siteName)}" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta property="og:image" content="${esc(entry.image)}" />`,
    `<meta property="og:image:alt" content="${esc(alt)}" />`,
    useCardDims ? `<meta property="og:image:width" content="1200" />` : "",
    useCardDims ? `<meta property="og:image:height" content="630" />` : "",
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(entry.title)}" />`,
    `<meta name="twitter:description" content="${esc(entry.desc)}" />`,
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

    if (url.pathname === "/api/leetcode") {
      try {
        const res = await fetch("https://leetcode.com/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query:
              `query{matchedUser(username:"b2mIkNz0h5"){submitStats{acSubmissionNum{difficulty count}}}}`,
          }),
        });
        const data = await res.json();
        const solved = data?.data?.matchedUser?.submitStats?.acSubmissionNum?.[0]?.count;
        if (typeof solved !== "number") throw new Error("bad response");
        return new Response(JSON.stringify({ solved }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ error: "unavailable" }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const res = (await env.ASSETS?.fetch(request)) ?? new Response(null, { status: 404 });
    const type = res.headers.get("content-type") || "";
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
