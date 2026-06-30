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
  { value: 300, text: "Problems Solved", suffix: "+", url: "" },
  { value: 500, text: "Git Commits", suffix: "+", url: "https://github.com/SachinyadavAug20#contributions-calendar" },
  { value: 4, text: "Production Systems", suffix: "+", url: "" },
  { value: 2, text: "Games Built", suffix: "+", url: "" },
];
