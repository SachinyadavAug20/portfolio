export type Project = {
  title: string;
  blurb: string;
  description: string;
  image: string;
  url: string;
  github: string;
};

export const projects: Project[] = [
  {
    title: "BaseCase",
    blurb: "A full-stack Q&A platform built for developers.",
    description:
      "Features a responsive UI with full MDX support, allowing users to easily write and format complex code snippets. A custom engine tracks user interactions to award reputation badges and algorithmically recommend questions based on past activity. Secured via OAuth and Zod validation, backed by an optimized, relational MongoDB schema for efficient data querying.",
    image: "/images/project1.webp",
    url: "https://base-case-nu.vercel.app/",
    github: "https://github.com/SachinyadavAug20/BaseCase",
  },
  {
    title: "Meow Mega Corp Bank",
    blurb: "A secure full-stack banking platform.",
    description:
      "A secure full-stack banking backend using Spring Boot to handle transactional states and robust validations.",
    image: "/images/project2.webp",
    url: "https://banking-app-nine-jet.vercel.app/",
    github: "https://github.com/SachinyadavAug20/banking-app",
  },
  {
    title: "Meow Terminal AI Agent",
    blurb: "A terminal-native AI agent.",
    description: "A terminal-native AI agent that lives in the command line.",
    image: "/images/project3.webp",
    url: "https://github.com/SachinyadavAug20/Meow",
    github: "https://github.com/SachinyadavAug20/Meow",
  },
];
