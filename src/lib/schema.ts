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