import type { LucideIcon } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Boxes,
  Briefcase,
  ChefHat,
  Gamepad2,
  GitBranch,
  Home,
  Mail,
  PenLine,
  Share2,
  Swords,
  Terminal,
} from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import SEOHead from "../seo/SEOHead";
import { buildLinksSchema } from "../lib/schema";
import { useReducedMotion } from "../hooks/useReducedMotion";

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

/* compact quick-access row under the avatar — the linktree-style social strip */
const SOCIALS: { label: string; href: string; img: LinkRow["img"] }[] = [
  { label: "GitHub", href: "https://github.com/SachinyadavAug20", img: { dark: "/images/github.png", light: "/images/github-light.png" } },
  { label: "X", href: "https://x.com/samtagon38824", img: { dark: "/images/x.png", light: "/images/x-light.png" } },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/sachin-yadav-05a105374/", img: { dark: "/images/linkedin.png", light: "/images/linkedin-light.png" } },
];

/* GitHub serves this from the profile picture and re-caches on change —
   swap the avatar on GitHub and this page follows */
const GITHUB_AVATAR = "https://github.com/SachinyadavAug20.png?size=160";

const riseWith = (reduced: boolean) => (i: number) =>
  reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, delay: 0.08 + i * 0.05, ease: "easeOut" as const },
      };

/* the card lights up under the pointer — coordinates feed .link-row's ::before */
const trackGlow = (e: ReactPointerEvent<HTMLAnchorElement>) => {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
};

const Row = ({ item, index }: { item: LinkRow; index: number }) => {
  const Icon = item.icon;
  const rise = riseWith(useReducedMotion());
  const cls =
    "link-row group relative flex items-center gap-3 p-3.5 rounded-2xl card-border transition-all hover:bg-black-200 hover:-translate-y-0.5 hover:border-blue-500/25 hover:shadow-[0_14px_30px_-18px_rgba(56,189,248,0.55)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const inner = (
    <>
      <span className="size-10 rounded-xl bg-black-200 flex-center shrink-0 transition-colors group-hover:bg-blue-500/15">
        {item.img ? (
          <>
            <img src={item.img.dark} alt="" className="hidden dark:block size-5" loading="lazy" decoding="async" />
            <img src={item.img.light} alt="" className="dark:hidden size-5" loading="lazy" decoding="async" />
          </>
        ) : (
          Icon && (
            <Icon
              className="size-5 text-blue-50 transition-colors group-hover:text-blue-400"
              aria-hidden="true"
            />
          )
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
        <Link to={item.href} className={cls} onPointerMove={trackGlow} data-linkrow>
          {inner}
        </Link>
      ) : (
        <a
          href={item.href}
          target="_blank"
          rel="noreferrer"
          className={cls}
          onPointerMove={trackGlow}
          data-linkrow
        >
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

const Links = () => {
  const reduced = useReducedMotion();
  const rise = riseWith(reduced);
  const [avatarOk, setAvatarOk] = useState(true);
  const [shareNote, setShareNote] = useState("");

  /* arrow keys walk the list like a gallery — only once a row holds focus,
     so plain scrolling elsewhere is never hijacked */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const el = document.activeElement;
      if (!(el instanceof HTMLAnchorElement)) return;
      const rows = [...document.querySelectorAll<HTMLAnchorElement>("[data-linkrow]")];
      const i = rows.indexOf(el);
      if (i === -1) return;
      e.preventDefault();
      rows[i + (e.key === "ArrowDown" ? 1 : -1)]?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Sachin Yadav — Links", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareNote("Link copied");
      window.setTimeout(() => setShareNote(""), 2000);
    } catch {
      /* share sheet dismissed */
    }
  };

  return (
    <>
      <SEOHead
        title="Links"
        description="Everywhere to find me — portfolio, blog, X, LinkedIn, GitHub, LeetCode, Codeforces, itch.io and more, all in one place."
        path="/links"
        jsonLd={buildLinksSchema()}
      />
      <main className="relative min-h-[100svh] flex-center px-5 py-14">
      {/* atmosphere — a soft brand glow behind the header, a whisper of green
          near the status badge, and a faint dot grid for depth */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-140px] h-[460px] w-[720px] -translate-x-1/2 rounded-full bg-blue-500/[0.09] blur-[110px]" />
        <div className="absolute right-[-90px] top-[-50px] h-56 w-72 rounded-full bg-green-500/[0.06] blur-[90px]" />
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(148,163,184,0.2)_1px,transparent_1px)] [background-size:24px_24px] dark:opacity-25" />
      </div>

      {/* corner badge — the status card, promoted to the page edge and made
          tappable so the only call-to-action on the page still reaches the
          contact form; wears terminal chrome while the cards stay cards */}
      <motion.a
        {...rise(0)}
        href="/#contact"
        className="group absolute top-3 right-3 sm:top-6 sm:right-6 inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-green-500/30 bg-black-100/85 backdrop-blur px-2.5 py-1.5 sm:px-3 font-mono text-[10px] sm:text-[11px] text-white-50/85 shadow-lg transition-all hover:border-green-500/60 hover:text-foreground hover:shadow-[0_0_20px_-6px_rgba(74,222,128,0.5)]"
      >
        <span
          aria-hidden="true"
          className="term-scanlines pointer-events-none absolute inset-0 rounded-md"
        />
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-green-400" />
        </span>
        <span className="relative">
          Open to work · replies within ~24h
          <span
            aria-hidden="true"
            className="term-blink ml-1 inline-block h-3 w-[5px] translate-y-[1px] bg-green-400/80"
          />
        </span>
      </motion.a>

      <div className="w-full max-w-md">
        <motion.header {...rise(1)} className="text-center">
          <div className="relative mx-auto size-20 sm:size-24">
            <div
              aria-hidden="true"
              className="links-avatar-ring absolute -inset-1 rounded-[1.6rem]"
            />
            <div className="relative size-20 sm:size-24 rounded-3xl overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 flex-center shadow-[0_18px_44px_-14px_rgba(59,130,246,0.6)] select-none">
              {avatarOk ? (
                <img
                  src={GITHUB_AVATAR}
                  alt=""
                  width={96}
                  height={96}
                  className="size-full object-cover"
                  decoding="async"
                  onError={() => setAvatarOk(false)}
                />
              ) : (
                <span className="text-white text-3xl font-bold">SY</span>
              )}
            </div>
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-foreground">Sachin Yadav</h1>
          <p className="mt-1 text-sm text-white-50/70">
            <span className="font-mono text-[13px] text-white-50/85">@samtagon38824</span>
            <span className="text-white-50/40"> · </span>
            Full-stack developer
          </p>
        </motion.header>

        {/* quick social strip — one tap to the profiles people check first */}
        <motion.nav {...rise(2)} aria-label="Quick links" className="mt-5 flex items-center justify-center gap-2.5">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              aria-label={s.label}
              className="size-10 rounded-full border border-black-50 bg-black-100 flex-center transition-all hover:border-blue-500/40 hover:bg-black-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {s.img && (
                <>
                  <img src={s.img.dark} alt="" className="hidden dark:block size-[18px]" loading="lazy" decoding="async" />
                  <img src={s.img.light} alt="" className="dark:hidden size-[18px]" loading="lazy" decoding="async" />
                </>
              )}
            </a>
          ))}
          <Link
            to="/#contact"
            aria-label="Contact"
            className="size-10 rounded-full border border-black-50 bg-black-100 flex-center transition-all hover:border-green-500/40 hover:bg-black-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Mail className="size-[18px] text-foreground" aria-hidden="true" />
          </Link>
        </motion.nav>

        {/* featured call-to-action — the one link that outranks the rest */}
        <motion.div {...rise(3)} className="mt-6">
          <Link
            to="/#contact"
            className="group flex items-center gap-3.5 rounded-2xl border border-green-500/25 bg-gradient-to-br from-green-500/[0.09] via-transparent to-transparent p-4 transition-all hover:border-green-500/50 hover:shadow-[0_0_30px_-8px_rgba(74,222,128,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="size-11 shrink-0 rounded-xl border border-green-500/25 bg-green-500/15 flex-center">
              <Briefcase className="size-5 text-green-600 dark:text-green-400" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-green-600 dark:text-green-400">
                Featured · open to work
              </span>
              <span className="mt-0.5 block font-semibold text-foreground">Work with me</span>
              <span className="block text-xs text-white-50/60">Roles &amp; freelance — replies within ~24h</span>
            </span>
            <ArrowUpRight
              className="size-4 shrink-0 text-green-600 dark:text-green-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </motion.div>

        <ul aria-label="Primary links" className="mt-6 space-y-3">
          {PRIMARY.map((item, i) => (
            <Row key={item.href} item={item} index={i + 4} />
          ))}
        </ul>

        <motion.p
          {...rise(PRIMARY.length + 4)}
          className="mt-8 mb-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white-50/50"
        >
          <span className="h-px flex-1 bg-black-50" />
          Also around
          <span className="h-px flex-1 bg-black-50" />
        </motion.p>

        <ul aria-label="Also around" className="space-y-2.5">
          {ALSO.map((item, i) => (
            <Row key={item.href} item={item} index={i + PRIMARY.length + 5} />
          ))}
        </ul>

        <motion.div
          {...rise(PRIMARY.length + ALSO.length + 5)}
          className="mt-9 flex flex-col items-center gap-2.5"
        >
          <button
            type="button"
            onClick={share}
            className="inline-flex items-center gap-2 rounded-full border border-black-50 bg-black-100 px-3.5 py-2 font-mono text-[11px] text-white-50/80 transition-all hover:border-blue-500/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Share2 className="size-3.5" aria-hidden="true" />
            Share this page
          </button>
          <p aria-live="polite" className="h-4 font-mono text-[11px] text-green-500 empty:hidden">
            {shareNote}
          </p>
          <p className="hidden sm:block font-mono text-[10px] text-white-50/40">
            tip: arrow keys walk the list
          </p>
        </motion.div>

        <motion.footer
          {...rise(PRIMARY.length + ALSO.length + 6)}
          className="mt-8 text-center"
        >
          <p className="font-mono text-xs text-white-50/60">
            <span aria-hidden="true" className="text-blue-50/70">
              &#10022;{" "}
            </span>
            {DAILY_FACT}
          </p>
          <p className="mt-4 font-mono text-[11px] text-white-50/50">
            © {new Date().getFullYear()} Sachin Yadav · Built from my Obsidian vault
          </p>
        </motion.footer>
      </div>
      </main>
    </>
  );
};

export default Links;
