import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  Briefcase,
  Check,
  ChefHat,
  Copy,
  FileText,
  Gamepad2,
  GitBranch,
  Globe,
  Mail,
  PenLine,
  PenTool,
  Share2,
  Swords,
  Terminal,
} from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import SEOHead from "../seo/SEOHead";
import { buildLinksSchema } from "../lib/schema";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { tap } from "../lib/haptics";
import { notify } from "../lib/toast";

interface LinkItem {
  id: string;
  label: string;
  sub: string;
  href: string;
  internal?: boolean;
  icon?: LucideIcon;
  img?: { dark: string; light: string };
  badge?: string;
  accentBorderHover?: string;
  accentBgIcon?: string;
  accentTextIcon?: string;
}

const RESUME_URL =
  "https://docs.google.com/document/d/1RFTuBerLRMMHeu0Ac4GvaXu7lUuRUDXo/edit?usp=sharing&ouid=104382201638634718035&rtpof=true&sd=true";

const CORE_PLATFORMS: LinkItem[] = [
  {
    id: "portfolio",
    label: "Portfolio Site",
    sub: "Interactive 3D web experience, selected projects & stack",
    href: "/",
    internal: true,
    icon: Globe,
    badge: "Main site",
    accentBorderHover: "hover:border-blue-500/70",
    accentBgIcon: "bg-blue-500/15",
    accentTextIcon: "text-blue-400",
  },
  {
    id: "blog",
    label: "Digital Garden & Vault",
    sub: "Engineering notes, architecture thoughts & vault logs",
    href: "/blog",
    internal: true,
    icon: PenLine,
    badge: "Obsidian",
    accentBorderHover: "hover:border-purple-500/70",
    accentBgIcon: "bg-purple-500/15",
    accentTextIcon: "text-purple-400",
  },
];

const CODING_PROFILES: LinkItem[] = [
  {
    id: "leetcode",
    label: "LeetCode",
    sub: "b2mIkNz0h5",
    href: "https://leetcode.com/u/b2mIkNz0h5/",
    img: { dark: "/images/leetcode.png", light: "/images/leetcode-light.png" },
    accentBorderHover: "hover:border-amber-500/70",
  },
  {
    id: "codeforces",
    label: "Codeforces",
    sub: "sachinapr20",
    href: "https://codeforces.com/profile/sachinapr20",
    icon: Swords,
    accentBorderHover: "hover:border-rose-500/70",
  },
  {
    id: "codechef",
    label: "CodeChef",
    sub: "sachinaug_20",
    href: "https://www.codechef.com/users/sachinaug_20",
    icon: ChefHat,
    accentBorderHover: "hover:border-orange-500/70",
  },
  {
    id: "hackerrank",
    label: "HackerRank",
    sub: "samtagon777",
    href: "https://www.hackerrank.com/profile/samtagon777",
    icon: Terminal,
    accentBorderHover: "hover:border-emerald-500/70",
  },
];

const ECOSYSTEM: LinkItem[] = [
  {
    id: "github",
    label: "GitHub",
    sub: "SachinyadavAug20 · Open source repositories & code",
    href: "https://github.com/SachinyadavAug20",
    img: { dark: "/images/github.png", light: "/images/github-light.png" },
    accentBorderHover: "hover:border-zinc-400",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    sub: "sachin-yadav-05a105374 · Experience & professional network",
    href: "https://www.linkedin.com/in/sachin-yadav-05a105374/",
    img: { dark: "/images/linkedin.png", light: "/images/linkedin-light.png" },
    accentBorderHover: "hover:border-blue-400",
  },
  {
    id: "x",
    label: "X (Twitter)",
    sub: "@samtagon38824 · Thoughts, updates & tech insights",
    href: "https://x.com/samtagon38824",
    img: { dark: "/images/x.png", light: "/images/x-light.png" },
    accentBorderHover: "hover:border-zinc-400",
  },
  {
    id: "figma",
    label: "Figma",
    sub: "@sachinyadavaug · UI/UX designs & prototypes",
    href: "https://www.figma.com/@sachinyadavaug",
    icon: PenTool,
    accentBorderHover: "hover:border-purple-400",
  },
  {
    id: "itch",
    label: "itch.io",
    sub: "sachinapr20.itch.io · Indie games & web prototypes",
    href: "https://sachinapr20.itch.io/",
    icon: Gamepad2,
    accentBorderHover: "hover:border-rose-400",
  },
  {
    id: "gitlab",
    label: "GitLab",
    sub: "SachinyadavAug20 · Project mirrors & code",
    href: "https://gitlab.com/SachinyadavAug20",
    icon: GitBranch,
    accentBorderHover: "hover:border-orange-400",
  },
  {
    id: "codeberg",
    label: "Codeberg",
    sub: "SachinyadavAug20 · FOSS git hosting & mirrors",
    href: "https://codeberg.org/SachinyadavAug20",
    icon: Boxes,
    accentBorderHover: "hover:border-sky-400",
  },
];

const SOCIALS: { label: string; href: string; img: LinkItem["img"] }[] = [
  { label: "GitHub", href: "https://github.com/SachinyadavAug20", img: { dark: "/images/github.png", light: "/images/github-light.png" } },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/sachin-yadav-05a105374/", img: { dark: "/images/linkedin.png", light: "/images/linkedin-light.png" } },
  { label: "X", href: "https://x.com/samtagon38824", img: { dark: "/images/x.png", light: "/images/x-light.png" } },
];

const GITHUB_AVATAR = "https://github.com/SachinyadavAug20.png?size=160";

const riseWith = (reduced: boolean) => (i: number) =>
  reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35, delay: 0.05 + i * 0.04, ease: "easeOut" as const },
      };

const FACTS = [
  "Built from an Obsidian vault — view source, it is markdown all the way down.",
  "The graph page maps every note I have ever hoarded. Go get lost.",
  "psst — press ? anywhere for the shortcut sheet.",
  "Luna the cat naps between your clicks. Pet her.",
  "Press t and the lights flip. I dare you.",
];
const DAILY_FACT = FACTS[new Date().getDate() % FACTS.length];

const ProCard = ({
  item,
  index,
  variant: _variant = "row",
}: {
  item: LinkItem;
  index: number;
  variant?: "row" | "grid";
}) => {
  const Icon = item.icon;
  const reduced = useReducedMotion();
  const rise = riseWith(reduced);

  const containerClasses = [
    "group relative flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border border-black-50 bg-black-100",
    "transition-all duration-200 ease-out",
    "hover:-translate-y-1 hover:bg-black-200",
    item.accentBorderHover || "hover:border-zinc-500",
    "active:scale-[0.985] active:translate-y-0",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ].join(" ");

  const inner = (
    <>
      <span
        className={`size-11 rounded-xl flex-center shrink-0 border border-black-50 transition-all duration-200 group-hover:scale-105 group-hover:-rotate-3 ${
          item.accentBgIcon || "bg-black-200"
        }`}
      >
        {item.img ? (
          <>
            <img src={item.img.dark} alt="" className="hidden dark:block size-5" loading="lazy" decoding="async" />
            <img src={item.img.light} alt="" className="dark:hidden size-5" loading="lazy" decoding="async" />
          </>
        ) : (
          Icon && (
            <Icon
              className={`size-5 transition-colors ${
                item.accentTextIcon || "text-foreground"
              }`}
              aria-hidden="true"
            />
          )
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="block font-semibold text-foreground text-sm sm:text-base tracking-tight">
            {item.label}
          </span>
          {item.badge && (
            <span className="hidden sm:inline-flex items-center rounded-md border border-black-50 bg-black-200 px-1.5 py-0.5 text-[10px] font-mono font-medium text-white-50/70">
              {item.badge}
            </span>
          )}
        </span>
        <span className="block text-xs text-white-50/60 truncate mt-0.5">{item.sub}</span>
      </span>

      <ArrowUpRight
        className="size-4 shrink-0 text-white-50/40 transition-all duration-200 group-hover:text-foreground group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </>
  );

  return (
    <motion.li {...rise(index)}>
      {item.internal ? (
        <Link
          to={item.href}
          className={containerClasses}
          data-linkrow
          onClick={() => tap(10)}
        >
          {inner}
        </Link>
      ) : (
        <a
          href={item.href}
          target="_blank"
          rel="noreferrer"
          className={containerClasses}
          data-linkrow
          onClick={() => tap(10)}
        >
          {inner}
        </a>
      )}
    </motion.li>
  );
};

const Links = () => {
  const reduced = useReducedMotion();
  const rise = riseWith(reduced);
  const [avatarOk, setAvatarOk] = useState(true);
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [shareNote, setShareNote] = useState("");

  /* Keyboard arrow navigation */
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

  const copyHandle = async () => {
    tap(15);
    try {
      await navigator.clipboard.writeText("@samtagon38824");
      setCopiedHandle(true);
      notify("success", "Handle copied to clipboard");
      setTimeout(() => setCopiedHandle(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const share = async () => {
    tap(15);
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareNote("Profile link copied!");
      notify("success", "Page link copied to clipboard");
      setTimeout(() => setShareNote(""), 2200);
    } catch {
      /* clipboard blocked */
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Sachin Yadav — Links", url });
      } catch {
        /* share dismissed */
      }
    }
  };

  return (
    <>
      <SEOHead
        title="Links"
        description="Everywhere to find me — portfolio, blog, resume, GitHub, LinkedIn, X, LeetCode, Codeforces and more."
        path="/links"
        jsonLd={buildLinksSchema()}
      />

      <main className="relative min-h-[100svh] flex-center px-4 sm:px-6 py-12 sm:py-16 selection:bg-blue-500/30">
        {/* Zero blur, zero gradient crisp micro-grid */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <svg
            className="absolute inset-0 size-full stroke-white/[0.04] dark:stroke-white/[0.04]"
            width="100%"
            height="100%"
          >
            <defs>
              <pattern id="pro-links-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M.5 28V.5H28" fill="none" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#pro-links-grid)" />
          </svg>
        </div>

        {/* Pro status badge - fixed top right */}
        <motion.div {...rise(0)} className="fixed top-4 right-4 sm:top-6 sm:right-6 z-20">
          <Link
            to="/#contact"
            onClick={() => tap(10)}
            className="group inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-black-100 px-3 py-1.5 font-mono text-xs text-white-50/90 transition-all duration-200 hover:border-emerald-500 hover:bg-black-200 hover:-translate-y-0.5 active:scale-95 shadow-md"
            title="Available for freelance & full-time roles"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            <span className="font-medium text-emerald-400">Available for work</span>
            <ArrowUpRight className="size-3 text-emerald-400/60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </motion.div>

        <div className="w-full max-w-lg relative z-10">
          {/* Pro Header Profile */}
          <motion.header {...rise(1)} className="text-center">
            {/* Avatar with status dot */}
            <div className="relative mx-auto size-24 sm:size-28">
              <div className="size-24 sm:size-28 rounded-3xl overflow-hidden border-2 border-black-50 bg-black-100 hover:border-zinc-500 transition-colors duration-200 select-none shadow-xl">
                {avatarOk ? (
                  <img
                    src={GITHUB_AVATAR}
                    alt="Sachin Yadav"
                    width={112}
                    height={112}
                    className="size-full object-cover transition-transform duration-300 hover:scale-105"
                    decoding="async"
                    onError={() => setAvatarOk(false)}
                  />
                ) : (
                  <span className="text-foreground text-3xl font-bold flex-center size-full">SY</span>
                )}
              </div>
              <span
                title="Online & Available"
                className="absolute -bottom-1 -right-1 size-5 rounded-full border-2 border-background bg-emerald-500 flex-center shadow"
              >
                <span className="size-2 rounded-full bg-white animate-pulse" />
              </span>
            </div>

            {/* Name + Verified Badge */}
            <div className="mt-4 flex items-center justify-center gap-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Sachin Yadav
              </h1>
              <span title="Verified Pro Profile" className="inline-flex items-center" aria-label="Verified Profile">
                <BadgeCheck className="size-5 text-sky-400 transition-transform duration-200 hover:scale-125" />
              </span>
            </div>

            {/* Interactive Handle Button */}
            <div className="mt-1.5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={copyHandle}
                className="group/handle inline-flex items-center gap-1.5 rounded-full border border-black-50 bg-black-100 hover:border-zinc-500 hover:bg-black-200 px-3 py-1 text-xs font-mono text-white-50/80 transition-all duration-200 active:scale-95"
                title="Click to copy handle"
              >
                <span>@samtagon38824</span>
                {copiedHandle ? (
                  <Check className="size-3 text-emerald-400" />
                ) : (
                  <Copy className="size-3 text-white-50/40 group-hover/handle:text-white-50 transition-colors" />
                )}
              </button>
            </div>

            {/* Sharp, alive Bio */}
            <p className="mt-2 text-sm text-white-50/75 max-w-sm mx-auto leading-relaxed">
              Full-Stack Engineer & Creative Developer. Crafting interactive 3D web experiences, tools & systems.
            </p>

            {/* Quick 1-Tap Social Row */}
            <nav aria-label="Quick socials" className="mt-4 flex items-center justify-center gap-2.5">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  onClick={() => tap(8)}
                  className="group size-10 rounded-xl border border-black-50 bg-black-100 flex-center transition-all duration-200 hover:border-zinc-500 hover:bg-black-200 hover:-translate-y-0.5 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                  title={s.label}
                >
                  {s.img && (
                    <>
                      <img src={s.img.dark} alt="" className="hidden dark:block size-[18px] transition-transform duration-200 group-hover:scale-110" loading="lazy" decoding="async" />
                      <img src={s.img.light} alt="" className="dark:hidden size-[18px] transition-transform duration-200 group-hover:scale-110" loading="lazy" decoding="async" />
                    </>
                  )}
                </a>
              ))}
              <Link
                to="/#contact"
                aria-label="Contact"
                onClick={() => tap(8)}
                className="group size-10 rounded-xl border border-black-50 bg-black-100 flex-center transition-all duration-200 hover:border-emerald-500/60 hover:bg-black-200 hover:-translate-y-0.5 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                title="Send Message"
              >
                <Mail className="size-[18px] text-foreground transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
              </Link>
            </nav>
          </motion.header>

          {/* Featured Hero Actions (Bento 2-Col Grid) */}
          <motion.div {...rise(2)} className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to="/#contact"
              data-linkrow
              onClick={() => tap(12)}
              className="group relative flex items-center gap-3.5 p-4 rounded-2xl border border-emerald-500/35 bg-black-100 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-400 hover:bg-black-200 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
            >
              <span className="size-11 shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/15 flex-center transition-transform duration-200 group-hover:scale-105 group-hover:-rotate-3">
                <Briefcase className="size-5 text-emerald-400" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-foreground text-sm sm:text-base tracking-tight">
                  Work with me
                </span>
                <span className="block text-xs text-white-50/60 mt-0.5">
                  Contracts & full-time
                </span>
              </span>
              <ArrowUpRight
                className="size-4 shrink-0 text-emerald-400/70 transition-all duration-200 group-hover:text-emerald-400 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>

            <a
              href={RESUME_URL}
              target="_blank"
              rel="noreferrer"
              data-linkrow
              onClick={() => tap(12)}
              className="group relative flex items-center gap-3.5 p-4 rounded-2xl border border-sky-500/35 bg-black-100 transition-all duration-200 hover:-translate-y-1 hover:border-sky-400 hover:bg-black-200 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
            >
              <span className="size-11 shrink-0 rounded-xl border border-sky-500/30 bg-sky-500/15 flex-center transition-transform duration-200 group-hover:scale-105 group-hover:-rotate-3">
                <FileText className="size-5 text-sky-400" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-foreground text-sm sm:text-base tracking-tight">
                  See my resume
                </span>
                <span className="block text-xs text-white-50/60 mt-0.5">
                  CV, skills & track record
                </span>
              </span>
              <ArrowUpRight
                className="size-4 shrink-0 text-sky-400/70 transition-all duration-200 group-hover:text-sky-400 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </a>
          </motion.div>

          {/* Core Platforms (Bento 2-Col) */}
          <div className="mt-6">
            <motion.p
              {...rise(3)}
              className="mb-2.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white-50/50"
            >
              <span className="h-px w-3 bg-black-50" />
              Core Platforms
              <span className="h-px flex-1 bg-black-50" />
            </motion.p>
            <ul aria-label="Core platforms" className="space-y-2.5">
              {CORE_PLATFORMS.map((item, i) => (
                <ProCard key={item.id} item={item} index={i + 4} />
              ))}
            </ul>
          </div>

          {/* Coding & Competitive Profiles (Bento 2x2 Grid) */}
          <div className="mt-7">
            <motion.p
              {...rise(6)}
              className="mb-2.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white-50/50"
            >
              <span className="h-px w-3 bg-black-50" />
              Coding & Competitive Profiles
              <span className="h-px flex-1 bg-black-50" />
            </motion.p>
            <ul aria-label="Coding profiles" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CODING_PROFILES.map((item, i) => (
                <ProCard key={item.id} item={item} index={i + 7} variant="grid" />
              ))}
            </ul>
          </div>

          {/* Ecosystem & Repositories */}
          <div className="mt-7">
            <motion.p
              {...rise(11)}
              className="mb-2.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white-50/50"
            >
              <span className="h-px w-3 bg-black-50" />
              Ecosystem & Repositories
              <span className="h-px flex-1 bg-black-50" />
            </motion.p>
            <ul aria-label="Ecosystem" className="space-y-2.5">
              {ECOSYSTEM.map((item, i) => (
                <ProCard key={item.id} item={item} index={i + 12} />
              ))}
            </ul>
          </div>

          {/* Interactive Share / Controls */}
          <motion.div {...rise(18)} className="mt-9 flex flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={share}
              className="group inline-flex items-center gap-2 rounded-full border border-black-50 bg-black-100 hover:border-zinc-500 hover:bg-black-200 px-4 py-2 font-mono text-xs text-white-50/90 transition-all duration-200 active:scale-95 shadow-sm"
            >
              <Share2 className="size-3.5 text-white-50/60 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
              <span>Share this page</span>
            </button>
            <p aria-live="polite" className="h-4 font-mono text-xs text-emerald-400 empty:hidden">
              {shareNote}
            </p>
            <p className="hidden sm:block font-mono text-[10px] text-white-50/40">
              tip: use ↑ ↓ arrow keys to walk the cards
            </p>
          </motion.div>

          {/* Footer with Daily Vault Thought */}
          <motion.footer {...rise(19)} className="mt-8 text-center pb-8">
            <p className="font-mono text-xs text-white-50/60 leading-relaxed">
              <span aria-hidden="true" className="text-blue-400">
                ✦{" "}
              </span>
              {DAILY_FACT}
            </p>
            <p className="mt-4 font-mono text-[11px] text-white-50/50">
              © {new Date().getFullYear()} Sachin Yadav · Crafted with precision
            </p>
          </motion.footer>
        </div>
      </main>
    </>
  );
};

export default Links;

