import { socialImg } from "../../constants";
import { SITE_URL, SITE_NAME } from "../seo/config";

const ITCH_IO_URL = "https://sachinapr20.itch.io/";

const sameAs = [...socialImg.map((s) => s.link), ITCH_IO_URL];

export const buildHomeGraph = () => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: SITE_NAME,
      url: SITE_URL,
      jobTitle: "Full-Stack Developer",
      sameAs,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { "@id": `${SITE_URL}/#person` },
      inLanguage: "en",
    },
  ],
});

/* mirrors the worker's server-side payloads (src/worker.js buildTags) so
   scrapers and rendered DOM see the same structured data */
export const buildBlogSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Blog",
  description:
    "Read about programming, full-stack development, and computer science from my Obsidian vault.",
  url: `${SITE_URL}/blog`,
  publisher: { "@id": `${SITE_URL}/#person` },
});

export const buildGraphSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Knowledge Graph",
  description:
    "An interactive map of the ideas in my Obsidian vault — browse how my notes on programming, tools, and computer science connect, and jump straight into any note.",
  url: `${SITE_URL}/graph`,
  isPartOf: { "@id": `${SITE_URL}/#website` },
});

export const buildLinksSchema = () => ({
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  name: "Links",
  description:
    "Everywhere to find me — portfolio, blog, X, LinkedIn, GitHub, LeetCode, Codeforces, itch.io and more, all in one place.",
  url: `${SITE_URL}/links`,
  mainEntity: {
    "@type": "Person",
    "@id": `${SITE_URL}/#person`,
    name: SITE_NAME,
    url: SITE_URL,
    jobTitle: "Full-Stack Developer",
    sameAs,
  },
});