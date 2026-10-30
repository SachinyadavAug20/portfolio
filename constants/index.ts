import {
  SiReact,
  SiNextdotjs,
  SiTailwindcss,
  SiUnity,
  SiMongodb,
  SiNeovim,
  SiZod,
  SiNodedotjs,
  SiGit,
  SiCplusplus,
  SiArchlinux,
  SiSpringboot,
} from "react-icons/si";

import RaylibIcon from "../src/components/icons/RaylibIcon";

interface word {
  text: string;
  imgPath: string;
}
export const words: word[] = [
  { text: "Logic", imgPath: "/images/concepts.svg" },
  { text: "Systems", imgPath: "/images/code.svg" },
  { text: "Algorithms", imgPath: "/images/designs.svg" },
  { text: "Architecture", imgPath: "/images/architecture.svg" },
  { text: "Data", imgPath: "/images/data.svg" },
  { text: "State", imgPath: "/images/stack.svg" },
  { text: "Code", imgPath: "/images/terminal.svg" },
];
interface counterItem {
  url: string;
  value: number;
  text: string;
  suffix: string;
}
export const counterItems: counterItem[] = [
  {
    value: 150,
    text: "Problems Solved",
    suffix: "+",
    url: "https://leetcode.com/u/b2mIkNz0h5/",
  },
  {
    value: 500,
    text: "Git Commits",
    suffix: "+",
    url: "https://github.com/SachinyadavAug20#contributions-calendar",
  },
  { value: 5, text: "Production Projects", suffix: "+", url: "https://github.com/SachinyadavAug20" },
  { value: 6, text: "Games on itch.io", suffix: "+", url: "https://sachinapr20.itch.io/" },
];
export const GITHUB_REPO = "SachinyadavAug20/portfolio";
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO}`;

export const navLinks = [
  {
    name: "Project",
    link: "#work",
  },
  {
    name: "Experience",
    link: "#experience",
  },
  {
    name: "Skills",
    link: "#skills",
  },
  {
    name: "Games",
    link: "https://sachinapr20.itch.io/",
  },
  {
    name: "Blog",
    link: "/blog",
  },
];

export const logoIconsList = [
  { 
    Icon: SiReact, 
    name: "React", 
    link: "https://github.com/SachinyadavAug20/Dhun", // Highlights custom UI and media state controls
    proof: "Used in Dhun & frontend web applications" 
  },
  { 
    Icon: SiNextdotjs, 
    name: "Next.js", 
    link: "https://github.com/SachinyadavAug20/BaseCase", // Flagship full-stack Q&A platform
    proof: "Core framework for BaseCase & Horizon Banking" 
  },
  { 
    Icon: SiTailwindcss, 
    name: "Tailwind", 
    link: "https://github.com/SachinyadavAug20/BaseCase", // Responsive dark/light mode styling
    proof: "Applied for scalable, responsive UI styling" 
  },
  { 
    Icon: SiUnity, 
    name: "Unity", 
    link: "https://github.com/SachinyadavAug20/AlienBlaster", // Directs to your game dev explorations
    proof: "Game mechanics & 2D physics controllers" 
  },
  { 
    Icon: SiMongodb, 
    name: "MongoDB", 
    link: "https://github.com/SachinyadavAug20/BaseCase", // Persistent database
    proof: "Relational schema modeling & persistent storage" 
  },
  { 
    Icon: SiNeovim, 
    name: "Neovim", 
    link: "https://github.com/SachinyadavAug20/Arch-config", // Reflects your terminal-native commit history
    proof: "Primary keyboard-driven development editor" 
  },
  { 
    Icon: SiZod, 
    name: "Zod", 
    link: "https://github.com/SachinyadavAug20/BaseCase", // Strict data validation and auth schemas
    proof: "Strict schema and authentication validation" 
  },
  { 
    Icon: SiNodedotjs, 
    name: "Node.js", 
    link: "https://github.com/SachinyadavAug20/Meow", // Backend routing and CLI execution
    proof: "Backend API routing & CLI AST execution" 
  },
  { 
    Icon: SiGit, 
    name: "Git", 
    link: "https://github.com/SachinyadavAug20/My-Obsidian-notes/tree/main/Notes", // Showcases your active commit history and clean workflows
    proof: "Disciplined version control & documentation" 
  },
  { 
    Icon: SiCplusplus, 
    name: "C++", 
    link: "https://github.com/SachinyadavAug20/My-Coding-Notes", // Points to your algorithmic problem solving
    proof: "Data Structures, Algorithms & LeetCode logic" 
  },
  { 
    Icon: RaylibIcon, 
    name: "Raylib", 
    link: "https://github.com/SachinyadavAug20/Raylib-boilerplate",
    proof: "2D game prototyping & graphics programming" 
  },
  { 
    Icon: SiArchlinux, 
    name: "Arch Linux", 
    link: "https://github.com/SachinyadavAug20/Arch-config", // Backed by your custom Linux terminal workflows
    proof: "Custom Linux development environment" 
  },
  {
    Icon: SiSpringboot,
    name: "Spring Boot",
    link: "https://github.com/SachinyadavAug20",
    proof: "Enterprise backend architecture & banking transactions" 
  },
];

export const abilities = [
  {
    imgPath: "/images/logic.svg",
    title: "Algorithmic Problem Solving",
    desc: "150+ DSA problems solved across LeetCode & Codeforces. Thriving on rigorous logic, optimal time-space complexity, and weekly contests.",
  },
  {
    imgPath: "/images/learn.svg",
    title: "Rapid Skill Acquisition",
    desc: "Highly adaptable across tech stacks—from modern Next.js/React frontends to Java Spring Boot, FastAPI, Bun, and C/C++ low-level systems.",
  },
  {
    imgPath: "/images/compass.svg",
    title: "Relentless Systems Exploration",
    desc: "Driven by curiosity to explore deep internals—custom Arch Linux environments, terminal CLI tools, RAG AI agents, and 3D WebGL graphics.",
  },
  {
    imgPath: "/images/craft.svg",
    title: "Full-Stack & Backend Engineering",
    desc: "Building reliable, scalable systems end-to-end—from Spring Boot banking backends and Plaid/Dwolla integrations to interactive 3D WebGL experiences.",
  },
];

export interface expCardProps {
  review: string;
  imgPath: string;
  logoPath: string;
  title: string;
  date: string;
  responsibilities: string[];
}

export const expCards = [
  {
    review:
      "Core contributor to GDGltce/ClubHub (Next.js, Tailwind, TypeScript), authoring developer onboarding guides, and standardizing GitHub PR templates.",
    imgPath: "/images/exp-fullstack.svg",
    logoPath: "/images/ltcoe-logo.svg",
    title: "GDG on Campus LTCE — Core Documentation & Open Source",
    date: "09/2026 – Present",
    responsibilities: [
      "Contributing to GDGltce/ClubHub (Next.js, Tailwind, TypeScript), authoring developer onboarding guides, and standardizing GitHub PR templates.",
      "Merged PR #21 (docs restructure), PR #26 (component testing guide), and PR #29 (API route specs).",
      "Mentoring incoming contributors on Git workflows, semantic commit practices, and high-quality pull requests.",
    ],
  },
  {
    review:
      "Designed and built the official LTCE Coding Club Platform using React and Supabase, enabling 200+ members to track hackathons and share problem solutions.",
    imgPath: "/images/exp-college-2.svg",
    logoPath: "/images/ltcoe-logo.svg",
    title: "Coding Club & Competitive Programming — LTCE",
    date: "08/2025 – Present",
    responsibilities: [
      "Designed and built the official LTCE Coding Club Platform using React and Supabase for 200+ members to track hackathons and share problem solutions.",
      "Solved 150+ algorithmic problems across LeetCode and Codeforces; regular participant in weekly contests.",
      "Collaborated on data structure problem sets and technical workshops for student engineers.",
    ],
  },
  {
    review:
      "Pursuing B.Tech in Computer Engineering with focus on systems programming, algorithmic rigor, and distributed web architectures.",
    imgPath: "/images/exp-college-1.svg",
    logoPath: "/images/ltcoe-logo.svg",
    title: "B.Tech Computer Engineering (2nd Year)",
    date: "2025 – 04/2029",
    responsibilities: [
      "Deepening core computer science fundamentals: Data Structures & Algorithms, OS, DBMS, Computer Networks, and OOP at LTCE Navi Mumbai.",
      "Academic foundation: 12th HSC (84%) at CHM College Ulhasnagar and 10th SSC (89%) at New English School Badlapur.",
      "Active systems exploration in C, C++, and TypeScript with custom Linux environments and Neovim workflows.",
    ],
  },
  {
    review:
      "Engineering full-stack architectures and low-level CLI engines with strict performance and transactional integrity.",
    imgPath: "/images/exp-frontend.svg",
    logoPath: "/images/logoIcons/2.svg",
    title: "Systems & Full-Stack Engineering Sprints",
    date: "2025 – 2026",
    responsibilities: [
      "Built 'Horizon' Banking Platform (Next.js 14, Appwrite, Plaid, Dwolla) with real-time fund transfers and financial analytics.",
      "Engineered 'BaseCase' Developer Q&A Platform with complex MongoDB aggregations, NextAuth, and AI-assisted answers.",
      "Created 'Meow CLI' (TypeScript/AST Parser/Gemini RAG) and 'TermDeck' (C/ncurses presentation engine).",
    ],
  },
];
export interface techStackImgProps {
  name: string;
  imgPath: string;
}

export const techStackImgs: techStackImgProps[] = [
  {
    name: "React Developer",
    imgPath: "/images/logos/react.png",
  },
  {
    name: "Python Developer",
    imgPath: "/images/logos/python.svg",
  },
  {
    name: "Backend Developer",
    imgPath: "/images/logos/node.png",
  },
  {
    name: "Interactive Developer",
    imgPath: "/images/logos/three.png",
  },
  {
    name: "Project Manager",
    imgPath: "/images/logos/git.svg",
  },
];

export interface techStackIconsProps {
  name: string;
  modelPath: string;
  scale: number;
  rotation: [x: number, y: number, z: number];
}

export const techStackIcons: techStackIconsProps[] = [
  {
    name: "React Developer",
    modelPath: "/models/react_logo-transformed.glb",
    scale: 1,
    rotation: [0, 0, 0],
  },
  {
    name: "Python Developer",
    modelPath: "/models/python-transformed.glb",
    scale: 0.8,
    rotation: [0, 0, 0],
  },
  {
    name: "Backend Developer",
    modelPath: "/models/node-transformed.glb",
    scale: 5,
    rotation: [0, -Math.PI / 2, 0],
  },
  {
    name: "Interactive 3D Developer",
    modelPath: "/models/three.js-transformed.glb",
    scale: 0.05,
    rotation: [0, 0, 0],
  },
  {
    name: "Project handling",
    modelPath: "/models/git-svg-transformed.glb",
    scale: 0.05,
    rotation: [0, -Math.PI / 4, 0],
  },
];

interface socialImgProps{
  name:string,
  link:string,
  imgPath:string,
  imgPathLight:string
}
export const socialImg:socialImgProps[]=[
  {
    name:"linkedin",
    link:"https://www.linkedin.com/in/sachin-yadav-05a105374/",
    imgPath:"/images/linkedin.png",
    imgPathLight:"/images/linkedin-light.png"
  },
  {
    name:"github",
    link:"https://github.com/SachinyadavAug20",
    imgPath:"/images/github.png",
    imgPathLight:"/images/github-light.png"
  },
  {
    name:"leetcode",
    link:"https://leetcode.com/u/b2mIkNz0h5/",
    imgPath:"/images/leetcode.png",
    imgPathLight:"/images/leetcode-light.png"
  },
  {
    name:"x",
    link:"https://x.com/samtagon38824",
    imgPath:"/images/x.png",
    imgPathLight:"/images/x-light.png"
  },
]
