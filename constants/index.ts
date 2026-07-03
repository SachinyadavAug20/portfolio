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
  { value: 4, text: "Projects in Production", suffix: "+", url: "" },
  { value: 2, text: "Games Built", suffix: "+", url: "" },
];
export const navLinks = [
  {
    name: "Work",
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
    link: "#games",
  },
];

export const logoIconsList = [
  { Icon: SiReact, name: "React", link: "https://react.dev/" },
  { Icon: SiNextdotjs, name: "Next.js", link: "https://nextjs.org/" },
  { Icon: SiTailwindcss, name: "Tailwind", link: "https://tailwindcss.com/" },
  { Icon: SiUnity, name: "Unity", link: "https://unity.com/" },
  { Icon: SiMongodb, name: "MongoDB", link: "https://www.mongodb.com/" },
  { Icon: SiNeovim, name: "Neovim", link: "https://neovim.io/" },
  { Icon: SiZod, name: "Zod", link: "https://zod.dev/" },
  { Icon: SiNodedotjs, name: "Node.js", link: "https://nodejs.org/" },
  { Icon: SiGit, name: "Git", link: "https://git-scm.com/" },
  { Icon: SiCplusplus, name: "C++", link: "https://isocpp.org/" },
  { Icon: SiArchlinux, name: "Arch Linux", link: "https://archlinux.org/" },
  {
    Icon: SiSpringboot,
    name: "Spring Boot",
    link: "https://spring.io/projects/spring-boot",
  },
];


export const abilities = [
  {
    imgPath: "/images/logic.svg",
    title: "Algorithmic Problem Solving",
    desc: "Thriving on rigorous logic. Consistently solving complex Data Structures and Algorithms (DSA) challenges to write highly optimized, efficient code."
  },
  {
    imgPath: "/images/learn.svg",
    title: "Rapid Skill Acquisition",
    desc: "Highly adaptable and quick to master new technologies, languages, and system architectures to engineer the best possible solutions."
  },
  {
    imgPath: "/images/compass.svg",
    title: "Relentless Exploration",
    desc: "Driven by curiosity to continuously explore new technical domains—from configuring custom Linux environments to experimenting with game engines and modern backends."
  }
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
    review: "Entering my 2nd year of Computer Science, transitioning into advanced backend systems, strict data architecture, and enterprise frameworks.",
    imgPath: "/images/exp-college-2.svg", 
    logoPath: "/images/ltcoe-logo.svg",
    title: "B.Tech Computer Engineering — 2nd Year",
    date: "July 2026 - Present",
    responsibilities: [
      "Deepening core computer science fundamentals, data structures, and algorithmic optimization at Lokmanya Tilak College of Engineering.",
      "Architecting 'Meow Mega Corp Bank', a secure full-stack banking backend using Spring Boot to handle transactional states and robust validations.",
      "Scaling backend systems with strict schema modeling and performance optimization across local and production databases."
    ],
  },
  {
    review: "Completed major full-stack milestones, moving beyond simple layouts into complex database relationships and hackathon sprints.",
    imgPath: "/images/exp-fullstack.svg", 
    logoPath: "/images/logoIcons/2.svg", 
    title: "Full-Stack Development & Sprints",
    date: "Early 2026 - Mid 2026",
    responsibilities: [
      "Engineered 'BaseCase', a robust full-stack StackOverflow alternative featuring MDX rendering, complex MongoDB schemas, and an algorithmic recommendation system.",
      "Competed in the Genesis 1.0 Hackathon, developing 'Priority Task' under high-pressure conditions using NextAuth.js for clean authentication loops.",
      "Refined low-level problem-solving approaches, using custom data structures to write efficient code on LeetCode and Codeforces."
    ],
  },
  {
    review: "Laid the programming foundations during my 1st year of college, mastering fundamental logic execution and interactive software mechanics.",
    imgPath: "/images/exp-college-1.svg",
    logoPath: "/images/ltcoe-logo.svg",
    title: "B.Tech Computer Engineering — 1st Year",
    date: "Mid 2025 - Early 2026",
    responsibilities: [
      "Mastered low-level systems programming foundations using C and C++ alongside core university mathematics.",
      "Developed a multi-platform 2D adventure game ('First-Game') in Unity/Godot, translating mathematical concepts into functional game physics loops.",
      "Built 'Dhun', a custom folder-based local music player, and configured a high-performance, keyboard-driven Linux development workflow."
    ],
  },
  {
    review: "Began my self-taught development journey by reverse-engineering high-fidelity production interfaces.",
    imgPath: "/images/exp-frontend.svg",
    logoPath: "/images/logoIcons/1.svg", 
    title: "Frontend Explorations",
    date: "Mid 2025",
    responsibilities: [
      "Learned the absolute fundamentals of web architectures, mastering JavaScript, semantic layouts, and Tailwind CSS configuration.",
      "Built a pixel-perfect Netflix Clone, implementing high-fidelity styling patterns and working with external third-party streaming APIs.",
      "Established a disciplined Git version control workflow, focusing on semantic commits and detailed documentation structures."
    ],
  }
];
export const techStackImgs = [
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

export const techStackIcons = [
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
    name: "Interactive Developer",
    modelPath: "/models/three.js-transformed.glb",
    scale: 0.05,
    rotation: [0, 0, 0],
  },
  {
    name: "Project Manager",
    modelPath: "/models/git-svg-transformed.glb",
    scale: 0.05,
    rotation: [0, -Math.PI / 4, 0],
  },
];
