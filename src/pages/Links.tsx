import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  Boxes,
  ChefHat,
  Gamepad2,
  GitBranch,
  Home,
  PenLine,
  Swords,
  Terminal,
} from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import SEOHead from "../seo/SEOHead";
import { buildLinksSchema } from "../lib/schema";

interface LinkRow {
  label: string;
  sub: string;
  href: string;
  internal?: boolean;
  icon?: LucideIcon;
  img?: { dark: string; light: string };
}

const PRIMARY: LinkRow[] = [
  { label: "Portfolio", sub: "This site", href: "/", internal: true, icon: Home },
  { label: "Blog", sub: "Notes from my vault", href: "/blog", internal: true, icon: PenLine },
  {
    label: "X",
    sub: "x.com/samtagon38824",
    href: "https://x.com/samtagon38824",
    img: { dark: "/images/x.png", light: "/images/x-light.png" },
  },
  {
    label: "LinkedIn",
    sub: "sachin-yadav-05a105374",
    href: "https://www.linkedin.com/in/sachin-yadav-05a105374/",
    img: { dark: "/images/linkedin.png", light: "/images/linkedin-light.png" },
  },
  {
    label: "GitHub",
    sub: "SachinyadavAug20",
    href: "https://github.com/SachinyadavAug20",
    img: { dark: "/images/github.png", light: "/images/github-light.png" },
  },
  {
    label: "LeetCode",
    sub: "b2mIkNz0h5",
    href: "https://leetcode.com/u/b2mIkNz0h5/",
    img: { dark: "/images/leetcode.png", light: "/images/leetcode-light.png" },
  },
  { label: "Codeforces", sub: "sachinapr20", href: "https://codeforces.com/profile/sachinapr20", icon: Swords },
  { label: "itch.io", sub: "sachinapr20.itch.io", href: "https://sachinapr20.itch.io/", icon: Gamepad2 },
];

const ALSO: LinkRow[] = [
  { label: "CodeChef", sub: "sachinaug_20", href: "https://www.codechef.com/users/sachinaug_20", icon: ChefHat },
  { label: "HackerRank", sub: "samtagon777", href: "https://www.hackerrank.com/profile/samtagon777", icon: Terminal },
  { label: "GitLab", sub: "SachinyadavAug20", href: "https://gitlab.com/SachinyadavAug20", icon: GitBranch },
  { label: "Codeberg", sub: "codeberg.org", href: "https://codeberg.org/", icon: Boxes },
];

const rise = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: 0.08 + i * 0.05, ease: "easeOut" as const },
});

const Row = ({ item, index }: { item: LinkRow; index: number }) => {
  const Icon = item.icon;
  const cls =
    "group flex items-center gap-3 p-3.5 rounded-2xl card-border transition-all hover:bg-black-200 active:scale-[0.98]";
  const inner = (
    <>
      <span className="size-10 rounded-xl bg-black-200 flex-center shrink-0">
        {item.img ? (
          <>
            <img src={item.img.dark} alt="" className="hidden dark:block size-5" loading="lazy" decoding="async" />
            <img src={item.img.light} alt="" className="dark:hidden size-5" loading="lazy" decoding="async" />
          </>
        ) : (
          Icon && <Icon className="size-5 text-blue-50" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-foreground text-sm sm:text-base">{item.label}</span>
        <span className="block text-xs text-white-50/60 truncate">{item.sub}</span>
      </span>
      <ArrowUpRight
        className="size-4 shrink-0 text-white-50/40 transition-all group-hover:text-blue-50 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </>
  );

  return (
    <motion.li {...rise(index)}>
      {item.internal ? (
        <Link to={item.href} className={cls}>
          {inner}
        </Link>
      ) : (
        <a href={item.href} target="_blank" rel="noreferrer" className={cls}>
          {inner}
        </a>
      )}
    </motion.li>
  );
};

/* one line of the day — the footer stays link-free (the corner badge owns
   the contact funnel) but never says nothing twice */
const FACTS = [
  "Built from an Obsidian vault — view source, it is markdown all the way down.",
  "The graph page maps every note I have ever hoarded. Go get lost.",
  "psst — press ? anywhere for the shortcut sheet.",
  "Luna the cat naps between your clicks. Pet her.",
  "Press t and the lights flip. I dare you.",
];
const DAILY_FACT = FACTS[new Date().getDate() % FACTS.length];

const Links = () => (
  <>
    <SEOHead
      title="Links"
      description="Everywhere to find me — portfolio, blog, X, LinkedIn, GitHub, LeetCode, Codeforces, itch.io and more, all in one place."
      path="/links"
      jsonLd={buildLinksSchema()}
    />
    <section className="relative min-h-[100svh] flex-center px-5 py-14">
      {/* corner badge — the status card, promoted to the page edge and made
          tappable so the only call-to-action on the page still reaches the
          contact form */}
      <motion.a
        {...rise(0)}
        href="/#contact"
        className="group absolute top-4 right-4 sm:top-6 sm:right-6 inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-black-50 bg-black-100/85 backdrop-blur px-3 py-1.5 text-xs text-white-50/85 shadow-lg transition-colors hover:border-green-500/40 hover:text-foreground"
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-green-400" />
        </span>
        Open to work · replies within ~24h
      </motion.a>

      <div className="w-full max-w-md">
        <motion.header {...rise(1)} className="text-center">
          <div className="mx-auto size-20 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 flex-center text-white text-3xl font-bold shadow-lg shadow-blue-500/25 select-none">
            SY
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-foreground">Sachin Yadav</h1>
          <p className="mt-1 text-sm text-white-50/70">@samtagon38824 · Full-stack developer</p>
        </motion.header>

        <ul aria-label="Primary links" className="mt-8 space-y-3">
          {PRIMARY.map((item, i) => (
            <Row key={item.href} item={item} index={i + 2} />
          ))}
        </ul>

        <motion.p
          {...rise(PRIMARY.length + 2)}
          className="mt-8 mb-3 flex items-center gap-3 text-[11px] uppercase tracking-widest text-white-50/50"
        >
          <span className="h-px flex-1 bg-black-50" />
          Also around
          <span className="h-px flex-1 bg-black-50" />
        </motion.p>

        <ul aria-label="Also around" className="space-y-2.5">
          {ALSO.map((item, i) => (
            <Row key={item.href} item={item} index={i + PRIMARY.length + 3} />
          ))}
        </ul>

        <motion.footer
          {...rise(PRIMARY.length + ALSO.length + 3)}
          className="mt-10 text-center"
        >
          <p className="text-xs text-white-50/60">
            <span aria-hidden="true" className="text-blue-50/70">
              &#10022;{" "}
            </span>
            {DAILY_FACT}
          </p>
          <p className="mt-4 text-[11px] text-white-50/50">
            © {new Date().getFullYear()} Sachin Yadav · Built from my Obsidian vault
          </p>
        </motion.footer>
      </div>
    </section>
  </>
);

export default Links;
