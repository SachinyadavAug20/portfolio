import { useEffect } from "react";
import { SITE_URL, SITE_NAME, OG_IMAGE, OG_IMAGE_ALT } from "./config";
import { applyHead, composeTags, baseTags, type HeadTag } from "./head";

interface SEOHeadProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  datePublished?: string;
  dateModified?: string;
  robots?: string;
  jsonLd?: unknown;
}

const SEOHead = ({
  title,
  description,
  path = "",
  image = OG_IMAGE,
  type = "website",
  datePublished,
  dateModified,
  robots,
  jsonLd,
}: SEOHeadProps) => {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const url = `${SITE_URL}${path}`;
  const imageUrl = image.startsWith("http") ? image : `${SITE_URL}${image}`;
  /* article pages still mint their own BlogPosting graph; callers may also
     pass a home-grown payload. Stringified once per render — a stable
     primitive for the effect below. */
  const articleLd =
    type === "article"
      ? {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: title,
          description,
          image: imageUrl,
          url,
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          author: { "@type": "Person", "@id": `${SITE_URL}/#person`, name: SITE_NAME },
          publisher: { "@type": "Person", "@id": `${SITE_URL}/#person`, name: SITE_NAME },
          ...(datePublished && { datePublished }),
          ...(dateModified && { dateModified }),
        }
      : null;
  const jsonLdStr =
    jsonLd !== undefined
      ? JSON.stringify(jsonLd)
      : articleLd
        ? JSON.stringify(articleLd)
        : undefined;

  useEffect(() => {
    const tags: HeadTag[] = [
      { kind: "title", content: fullTitle },
      { kind: "meta", attr: "name", key: "description", content: description },
      { kind: "link", rel: "canonical", href: url },
      ...(robots
        ? [{ kind: "meta", attr: "name", key: "robots", content: robots } as HeadTag]
        : []),

      { kind: "meta", attr: "property", key: "og:title", content: title },
      { kind: "meta", attr: "property", key: "og:description", content: description },
      { kind: "meta", attr: "property", key: "og:image", content: imageUrl },
      /* real dimensions only for the branded card — note screenshots carry
         their own size and a fake 1200×630 makes scrapers crop badly */
      ...(image === OG_IMAGE
        ? [
            { kind: "meta", attr: "property", key: "og:image:width", content: "1200" } as HeadTag,
            { kind: "meta", attr: "property", key: "og:image:height", content: "630" } as HeadTag,
          ]
        : []),
      { kind: "meta", attr: "property", key: "og:image:alt", content: OG_IMAGE_ALT },
      { kind: "meta", attr: "property", key: "og:url", content: url },
      { kind: "meta", attr: "property", key: "og:type", content: type },

      { kind: "meta", attr: "name", key: "twitter:title", content: title },
      { kind: "meta", attr: "name", key: "twitter:description", content: description },
      { kind: "meta", attr: "name", key: "twitter:image", content: imageUrl },
      { kind: "meta", attr: "name", key: "twitter:image:alt", content: OG_IMAGE_ALT },

      ...(jsonLdStr
        ? [{ kind: "jsonLd", content: jsonLdStr } as HeadTag]
        : []),
    ];
    applyHead(composeTags(tags));
    return () => applyHead(baseTags);
  }, [fullTitle, title, description, url, imageUrl, image, type, robots, jsonLdStr]);

  return null;
};

export default SEOHead;
