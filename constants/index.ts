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
