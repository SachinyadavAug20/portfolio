import { rand } from "./cat";

/*
 * Curated reading list the cat offers after long idle — top 50 notes,
 * each with a tailored line. Paths are exact GitHub fullSlugs
 * (SachinyadavAug20/My-Obsidian-notes, Notes/ root).
 */

export interface BlogSuggestion {
  path: string;
  title: string;
  msg: string;
}

export const BLOG_SUGGESTIONS: BlogSuggestion[] = [
  // java
  { path: "Programing/languages/java/26.Stream", title: "Java Streams", msg: "loops that learned manners. this one made streams click for me." },
  { path: "Programing/languages/java/31.Mulithreading", title: "Multithreading", msg: "threads racing is better than cats racing. mostly." },
  { path: "Programing/languages/java/35.CompletableFuture, Fork-Join Pool, ThreadLocal & Virtual Threads", title: "Futures & Virtual Threads", msg: "virtual threads: naps that count as work. start here." },
  { path: "Programing/languages/java/19.Generics", title: "Generics", msg: "generics: a cat in a box. works for anything until it doesn't." },
  { path: "Programing/languages/java/25.Lambdas and functional interface", title: "Lambdas", msg: "function-sized treats. one line, big flavor." },
  { path: "Programing/languages/java/30.Memory management", title: "Memory Management", msg: "heap, stack, and where toys go to be collected." },
  { path: "Programing/languages/java/17.Interface", title: "Interfaces", msg: "promises a class makes and (hopefully) keeps." },
  { path: "Programing/languages/java/20.Collection framwork", title: "Collections", msg: "lists, sets, maps — my toy inventory, organized." },
  // spring boot
  { path: "Programing/languages/SpringBoot/4.Circular Dependency", title: "Circular Dependencies", msg: "two cats tangled in one yarn. how to untie it." },
  { path: "Programing/languages/SpringBoot/25.JWT internals", title: "JWT Internals", msg: "the passport everyone carries, nobody reads. i read it." },
  { path: "Programing/languages/SpringBoot/5.Bean lifecycle", title: "Bean Lifecycle", msg: "beans are born, live, and get composted. whole drama." },
  { path: "Programing/languages/SpringBoot/16.AOP", title: "AOP", msg: "sneak up on code from the side. very cat-like." },
  { path: "Programing/languages/SpringBoot/20.Hibernate", title: "Hibernate", msg: "my favorite word for an ORM. it also naps like me." },
  { path: "Programing/languages/SpringBoot/24.Spring Security", title: "Spring Security", msg: "the closed door i sit in front of. worth understanding." },
  // design
  { path: "Programing/Concepts/LLD/4.SOLID design principles", title: "SOLID Principles", msg: "five rules that keep code from becoming a hairball." },
  { path: "Programing/Concepts/LLD/7.Strategy Design Pattern", title: "Strategy Pattern", msg: "pick the hunting style, keep the cat." },
  { path: "Programing/Concepts/LLD/9.Singleton design pattern", title: "Singleton Pattern", msg: "one per house. (i am the singleton here.)" },
  { path: "Programing/Concepts/LLD/11.Observer design pattern", title: "Observer Pattern", msg: "tap the glass, everyone looks. fewer cats though." },
  { path: "Programing/Concepts/LLD/6.Design patterns", title: "Design Patterns", msg: "the field guide to objects in costumes." },
  { path: "Programing/Concepts/LLD/10.Zomato Clone", title: "Zomato Clone (LLD)", msg: "delivery, ratings, and a menu that won't sit still." },
  // dsa
  { path: "Programing/DSA/Methods/Merge sort", title: "Merge Sort", msg: "divide, conquer, nap. it gets me." },
  { path: "Programing/DSA/Algorithum/Disjoint set union", title: "Disjoint Set Union", msg: "union-find: friends list for boxes. oddly satisfying." },
  { path: "Programing/DSA/Methods/Recursion", title: "Recursion", msg: "cat in a box in a cat in a box. base case, please." },
  { path: "Programing/DSA/Methods/Pre-computation and hashing", title: "Pre-computation & Hashing", msg: "precompute now, pounce later. the lazy-cat way." },
  { path: "Programing/DSA/Basic cpp/7.Time complexity", title: "Time Complexity", msg: "count steps without counting sheep." },
  // git
  { path: "Tools/Git/4. Branching and Merging", title: "Branching & Merging", msg: "nine lives for your code. the merge is the tricky part." },
  { path: "Tools/Git/4.1 Non–Fast-Forward Merge", title: "Non-Fast-Forward Merge", msg: "the merge that refuses. reflog is the way back." },
  { path: "Tools/Git/7. Common Issues", title: "Git Common Issues", msg: "the ways git bites, and a treat for each." },
  { path: "Tools/Git/Summary/Git × Obsidian push incident", title: "A Push Incident", msg: "one push, many regrets. i watched from the shelf." },
  // neovim
  { path: "Tools/Neovim/Advent of vim/Day 6) Motions f,F,t,T", title: "Vim Motions f, t", msg: "teleport through a line like it's furniture." },
  { path: "Tools/Neovim/Neovim for beginners", title: "Neovim for Beginners", msg: "hurt first, fly later. worth it, says the cat." },
  { path: "Tools/Neovim/Advent of vim/Day 11) Undo, Redo and time travel", title: "Undo & Time Travel", msg: "the closest thing to nine lives for text." },
  // blender
  { path: "Tools/Blender/2.Modeling/7.Loop Cuts", title: "Loop Cuts", msg: "slicing without the mess. i approve." },
  { path: "Tools/Blender/2.Modeling/10.modifiers", title: "Modifiers", msg: "change your mind, keep your mesh." },
  { path: "Tools/Blender/3.Sculpting/1.Basic Sculpting", msg: "digital clay: knead, repeat, never sheds.", title: "Basic Sculpting" },
  // web
  { path: "Programing/webdev/GSAP/basic/1.Scroll Trigger", title: "GSAP Scroll Trigger", msg: "the page wakes as you walk. like me." },
  { path: "Programing/webdev/GSAP/basic/3.Cursor effect", title: "Cursor Effects", msg: "i chase that for a living. take notes." },
  { path: "Programing/webdev/JSMastery/MasterJS course/40.Optimization", title: "Web Optimization", msg: "users notice speed. i pretend not to." },
  { path: "Programing/webdev/JSMastery/MasterJS course/11.Server and client components", title: "Server vs Client Components", msg: "who does the work while you blink." },
  { path: "Programing/webdev/JSMastery/MasterJS course/NextJS(basic)/11.Server side rendering (SSR)", title: "Server Side Rendering", msg: "html baked fresh, served warm." },
  { path: "Programing/webdev/Backend development/Basic of internet", title: "Basics of the Internet", msg: "the internet, explained without puns. almost." },
  // games
  { path: "Programing/Unity/AlienBlaster/13.Double jump", title: "Double Jump", msg: "gravity is a suggestion — twice." },
  { path: "Programing/Unity/AlienBlaster/11.Animations", title: "Game Animations", msg: "easing in, easing out, never tripping." },
  { path: "Programing/Raylib/3.Conways game of life", title: "Conway's Game of Life", msg: "cells roleplaying society. oddly calming." },
  { path: "Programing/Godot/GDScript", title: "GDScript", msg: "gd-friendlier python. gd. i'll stop now." },
  // lectures & rest
  { path: "lectures/CS50/L5-Memory", title: "CS50: Memory", msg: "pointers, malloc, and the art of not leaking." },
  { path: "lectures/CS50/L4-Algorithm", title: "CS50: Algorithms", msg: "the recipe card for problems." },
  { path: "lectures/Mathematics for computer/lecture 4) State machines", title: "State Machines", msg: "life in boxes and arrows. very me." },
  { path: "Programing/Concepts/UTF-8(Unicode transformation Format)", title: "UTF-8", msg: "every character's apartment building." },
  { path: "Thoughts/Ideas", title: "Ideas", msg: "an ideas note. i have those too, mostly about food." },
];

export const pickSuggestion = (
  currentPath: string,
  used: Set<string>,
): BlogSuggestion | null => {
  let pool = BLOG_SUGGESTIONS.filter(
    (s) => !used.has(s.path) && !currentPath.includes(s.path),
  );
  if (pool.length === 0) {
    used.clear();
    pool = BLOG_SUGGESTIONS.filter((s) => !currentPath.includes(s.path));
  }
  if (pool.length === 0) return null;
  const pick = pool[rand(pool.length)];
  used.add(pick.path);
  return pick;
};
