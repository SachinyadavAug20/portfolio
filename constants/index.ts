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

export const expCards = [
  {
    review: "Architecting a highly secure financial platform with robust data validation and scalable backend infrastructure.",
    imgPath: "/images/exp-meowbank.png", // Screenshot of the bank dashboard/code
    logoPath: "/images/logoIcons/12.png", // Spring Boot or Database logo
    title: "Backend & Systems Architecture (Meow Mega Corp Bank)",
    date: "Mid 2026 - Present",
    responsibilities: [
      "Developing 'Meow Mega Corp Bank', a full-stack financial application focused on secure state management and fast transactions.",
      "Implementing strict database schemas and heavy Zod validation to ensure zero-fault data integrity.",
      "Applying advanced architectural patterns learned from scaling previous Next.js and MongoDB systems."
    ],
  },
  {
    review: "Built complex, interactive web platforms, heavily utilizing competitive programming logic for optimal performance.",
    imgPath: "/images/exp-basecase.png", // Screenshot of BaseCase or Hackathon
    logoPath: "/images/logoIcons/2.png", // Next.js logo
    title: "Full-Stack Developer (BaseCase & Genesis Hackathon)",
    date: "Early 2026 - Mid 2026",
    responsibilities: [
      "Engineered 'BaseCase', a Q&A platform with MDX support, algorithmic recommendations, and a dynamic badge system.",
      "Developed 'Priority Task' for the Genesis 1.0 Hackathon using NextAuth.js for secure, persistent authentication.",
      "Created 'RootNode' (a minimal TreeSetter clone) and 'Dhun' (a local music player) prioritizing clean UI and minimal overhead."
    ],
  },
  {
    review: "Bridged the gap between raw algorithmic logic and visual, interactive environments using custom mechanics.",
    imgPath: "/images/exp-godot.png", // Screenshot of First-game
    logoPath: "/images/logoIcons/4.png", // Unity/Godot logo
    title: "Game Developer (First-Game)",
    date: "Late 2025 - Early 2026",
    responsibilities: [
      "Prototyped and shipped a functional 2D adventure game utilizing the Godot Engine and GDScript.",
      "Programmed core gameplay loops, player controllers, and level progression mechanics from scratch.",
      "Translated low-level programming concepts into functional physics controllers and interactive game states."
    ],
  },
  {
    review: "Mastered API integration and complex state management by reverse-engineering industry-standard streaming interfaces.",
    imgPath: "/images/exp-netflix.png", // Screenshot of the Netflix Clone
    logoPath: "/images/logoIcons/1.png", // React logo
    title: "Frontend Engineer (Netflix Clone)",
    date: "Mid 2025 - Late 2025",
    responsibilities: [
      "Developed a high-fidelity Netflix clone, focusing on responsive design and scalable CSS/Tailwind layouts.",
      "Integrated external database APIs to fetch, parse, and display thousands of media assets dynamically.",
      "Optimized DOM rendering and media load times to ensure a seamless, interactive user experience."
    ],
  },
  {
    review: "Building core computer science foundations while executing a highly optimized, keyboard-driven development workflow.",
    imgPath: "/images/exp-terminal.png", // Screenshot of your Neovim/Arch setup
    logoPath: "/images/logoIcons/11.png", // Arch Linux logo
    title: "Computer Engineering Undergrad",
    date: "Expected Graduation: April 2029",
    responsibilities: [
      "Pursuing a B.Tech in Computer Engineering at Lokmanya Tilak College of Engineering, Navi Mumbai.",
      "Mastering low-level programming paradigms in C/C++ and practicing advanced Data Structures and Algorithms.",
      "Executing all development within a custom Arch Linux environment utilizing Neovim and purely terminal-based workflows."
    ],
  }
];
