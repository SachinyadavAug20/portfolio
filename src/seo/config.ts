export const SITE_URL = import.meta.env.VITE_SITE_URL || "http://localhost:5173";
export const SITE_NAME = "Sachin Yadav";
export const SITE_TITLE = "Sachin Yadav — Full-Stack Developer";
export const SITE_DESCRIPTION =
  "Hi, I'm Sachin, a developer based in India with a passion for code.";
export const SOCIAL_HANDLE = "@samtagon38824";
export const OG_IMAGE = "/images/og.png?v=2";
export const OG_IMAGE_ALT = "Sachin Yadav Portfolio";

/* mirror routes for the home-page sections (/contact etc.) — t/d must stay
   in sync with STATIC_PAGES in scripts/generate-graph.js so the edge-injected
   og:title and the client head manager agree */
export const SECTION_SEO: Record<
  string,
  { title: string; description: string }
> = {
  work: {
    title: "Projects",
    description:
      "Selected projects and case studies by Sachin Yadav — web apps, games, and systems.",
  },
  experience: {
    title: "Experience",
    description:
      "Work experience and timeline — roles, responsibilities, and projects shipped by Sachin Yadav.",
  },
  skills: {
    title: "Skills",
    description:
      "Tech stack and skills — languages, frameworks, tools, and platforms I work with.",
  },
  contact: {
    title: "Contact",
    description:
      "Get in touch with Sachin Yadav — contact form, email, and social links.",
  },
};
