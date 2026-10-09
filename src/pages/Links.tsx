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
  /* one logo variant only: the terminal window is dark in both themes,
     so the dark (light-glyph) asset is always the right one */
  img?: string;
}

const PRIMARY: LinkRow[] = [
  { label: "Portfolio", sub: "This site", href: "/", internal: true, icon: Home },
  { label: "Blog", sub: "Notes from my vault", href: "/blog", internal: true, icon: PenLine },
  {
    label: "X",
    sub: "x.com/samtagon38824",
    href: "https://x.com/samtagon38824",
    img: "/images/x.png",
  },
  {
    label: "LinkedIn",
    sub: "sachin-yadav-05a105374",
    href: "https://www.linkedin.com/in/sachin-yadav-05a105374/",
    img: "/images/linkedin.png",
  },
  {
    label: "GitHub",
    sub: "SachinyadavAug20",
    href: "https://github.com/SachinyadavAug20",
    img: "/images/github.png",
  },
  {
    label: "LeetCode",
    sub: "b2mIkNz0h5",
    href: "https://leetcode.com/u/b2mIkNz0h5/",
    img: "/images/leetcode.png",
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

/* the shell command each row runs — `open leetcode`, `open itch.io` */
const cmd = (label: string) => label.toLowerCase().replace(/\s+/g, "-");

const Prompt = () => (
  <span aria-hidden="true" className="shrink-0 select-none text-green-400">
    $
  </span>
);

const Row = ({ item, index }: { item: LinkRow; index: number }) => {
  const Icon = item.icon;
  const cls =
    "group -mx-2 flex items-start gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-400/60";
  const inner = (
    <>
      <Prompt />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] text-white/85 transition-colors group-hover:text-white">
          <span className="text-white/45">open</span>{" "}
          <span className="text-sky-400">{cmd(item.label)}</span>
          {item.img ? (
            <img
              src={item.img}
              alt=""
              loading="lazy"
              decoding="async"
              className="ml-1.5 inline-block size-4 translate-y-[3px] opacity-80"
            />
          ) : Icon ? (
            <Icon
              className="ml-1.5 inline-block size-4 translate-y-[3px] text-white/50"
              aria-hidden="true"
            />
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-xs text-white/40">
          <span aria-hidden="true" className="text-white/25"># </span>
          {item.sub}
        </span>
      </span>
      <ArrowUpRight
        className="mt-1 size-4 shrink-0 text-white/30 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-green-400"
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
      {/* phosphor haze behind the terminal — visible in both themes */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[560px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-500/10 blur-3xl"
      />
      {/* corner badge — the status card, promoted to the page edge and made
          tappable so the only call-to-action on the page still reaches the
          contact form */}
      <motion.a
        {...rise(0)}
        href="/#contact"
        className="group absolute top-4 right-4 sm:top-6 sm:right-6 inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-green-500/30 bg-black-100/85 backdrop-blur px-3 py-1.5 font-mono text-[11px] text-white-50/85 shadow-lg transition-colors hover:border-green-500/60 hover:text-foreground"
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-green-400" />
        </span>
        Open to work · replies within ~24h
      </motion.a>

      <div className="w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#0b0d12] font-mono shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
        {/* window chrome */}
        <div className="relative flex items-center gap-1.5 border-b border-white/10 bg-white/[0.04] px-4 py-2.5">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span aria-hidden="true" className="size-2.5 rounded-full bg-[#febc2e]" />
          <span aria-hidden="true" className="size-2.5 rounded-full bg-[#28c840]" />
          <span className="absolute left-1/2 -translate-x-1/2 text-[11px] whitespace-nowrap text-white/45">
            luna@portfolio: ~/links
          </span>
          <span className="ml-auto text-[10px] text-white/25">zsh</span>
        </div>

        {/* terminal body */}
        <div className="relative p-5 sm:p-6">
          <div aria-hidden="true" className="term-scanlines pointer-events-none absolute inset-0" />

          <div className="relative">
            <motion.div {...rise(1)}>
              <div className="flex gap-2.5 text-[13px]">
                <Prompt />
                <span className="text-white/75">
                  whoami{" "}
                  <span className="text-white/30"># the human behind the vault</span>
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-12 shrink-0 place-items-center rounded-lg border border-green-500/35 bg-green-500/10 text-base font-bold text-green-400"
                >
                  SY
                </span>
                <div className="min-w-0">
                  <h1 className="font-mono text-lg font-semibold text-white">Sachin Yadav</h1>
                  <p className="text-xs text-white/55">
                    @samtagon38824 · full-stack developer
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.p
              {...rise(2)}
              className="mt-6 flex gap-2.5 text-xs text-white/35"
            >
              <span aria-hidden="true" className="select-none text-white/25">
                #
              </span>
              <span>eight ways in. pick your poison.</span>
            </motion.p>

            <ul aria-label="Primary links" className="mt-2 space-y-1">
              {PRIMARY.map((item, i) => (
                <Row key={item.href} item={item} index={i + 3} />
              ))}
            </ul>

            <motion.div
              {...rise(PRIMARY.length + 3)}
              className="mt-7 flex gap-2.5 text-[13px]"
            >
              <Prompt />
              <span className="text-white/75">
                ls <span className="text-sky-400">.also</span>{" "}
                <span className="text-white/30"># four more corners</span>
              </span>
            </motion.div>

            <ul aria-label="Also around" className="mt-2 space-y-1">
              {ALSO.map((item, i) => (
                <Row key={item.href} item={item} index={i + PRIMARY.length + 4} />
              ))}
            </ul>

            <motion.div
              {...rise(PRIMARY.length + ALSO.length + 4)}
              className="mt-7"
            >
              <div className="flex gap-2.5 text-[13px]">
                <Prompt />
                <span className="text-white/75">
                  cat <span className="text-sky-400">daily-fact.txt</span>
                </span>
              </div>
              <p className="mt-1.5 flex gap-2.5 text-xs text-white/55">
                <span aria-hidden="true" className="select-none text-white/25">
                  #
                </span>
                <span className="min-w-0">{DAILY_FACT}</span>
              </p>
              <div className="mt-5 flex items-center gap-2 text-[13px]">
                <Prompt />
                <span
                  aria-hidden="true"
                  className="term-blink inline-block h-3.5 w-2 bg-green-400/80"
                />
              </div>
              <p className="mt-4 text-[11px] text-white/30">
                © {new Date().getFullYear()} Sachin Yadav · built from my Obsidian vault
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  </>
);

export default Links;
