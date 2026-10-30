import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Briefcase,
  Check,
  ChefHat,
  Copy,
  FileText,
  Globe,
  Mail,
  MessageCircle,
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
import { tap } from "../lib/haptics";
import { notify } from "../lib/toast";
import InteractiveLinksCanvas from "../components/InteractiveLinksCanvas";

interface LinkItem {
  id: string;
  label: string;
  sub: string;
  href: string;
  internal?: boolean;
  icon?: LucideIcon;
  img?: { dark: string; light: string };
  badge?: string;
}

const RESUME_URL =
  "https://docs.google.com/document/d/1RFTuBerLRMMHeu0Ac4GvaXu7lUuRUDXo/edit?usp=sharing";

const FEATURED_PLATFORMS: LinkItem[] = [
  {
    id: "ccltce",
    label: "CCLTCE — Coding Club Platform",
    sub: "3D Minecraft-themed community hub with 1100vh scroll & chat",
    href: "https://ccltce.vercel.app/",
    icon: Globe,
    badge: "Top Project",
  },
  {
    id: "samtagon",
    label: "Samtagon Game Studio",
    sub: "3D low-poly island world with Pinecone AI vector search",
    href: "https://samtagon.vercel.app/",
    icon: Globe,
  },
  {
    id: "portfolio",
    label: "Main 3D Portfolio",
    sub: "Full-stack portfolio featuring Three.js & system architecture",
    href: "/",
    internal: true,
    icon: Terminal,
  },
  {
    id: "blog",
    label: "Digital Garden & Vault",
    sub: "Engineering notes, architecture thoughts & vault logs",
    href: "/blog",
    internal: true,
    icon: PenLine,
    badge: "Obsidian",
  },
];

const CODING_PROFILES: LinkItem[] = [
  {
    id: "leetcode",
    label: "LeetCode",
    sub: "b2mIkNz0h5 · 165+ Streak",
    href: "https://leetcode.com/u/b2mIkNz0h5/",
    img: { dark: "/images/leetcode.png", light: "/images/leetcode-light.png" },
  },
  {
    id: "codeforces",
    label: "Codeforces",
    sub: "sachinapr20 · CP Problem Solving",
    href: "https://codeforces.com/profile/sachinapr20",
    icon: Swords,
  },
  {
    id: "codechef",
    label: "CodeChef",
    sub: "sachinaug_20 · Competitive Contests",
    href: "https://www.codechef.com/users/sachinaug_20",
    icon: ChefHat,
  },
  {
    id: "hackerrank",
    label: "HackerRank",
    sub: "samtagon777 · Algorithms & Data",
    href: "https://www.hackerrank.com/profile/samtagon777",
    icon: Terminal,
  },
];

const SOCIAL_PROFILES: LinkItem[] = [
  {
    id: "github",
    label: "GitHub",
    sub: "SachinyadavAug20 · Open source repositories",
    href: "https://github.com/SachinyadavAug20",
    img: { dark: "/images/github.png", light: "/images/github-light.png" },
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    sub: "sachin-yadav-05a105374 · Experience & network",
    href: "https://www.linkedin.com/in/sachin-yadav-05a105374/",
    img: { dark: "/images/linkedin.png", light: "/images/linkedin-light.png" },
  },
  {
    id: "x",
    label: "X (Twitter)",
    sub: "@samtagon38824 · Thoughts & build updates",
    href: "https://x.com/samtagon38824",
    img: { dark: "/images/x.png", light: "/images/x-light.png" },
  },
  {
    id: "discord",
    label: "Discord",
    sub: "@samtagon · Direct chat & collaboration",
    href: "https://discord.com/users/1388334913601671219",
    icon: MessageCircle,
  },
];

const SOCIALS: { label: string; href: string; img: LinkItem["img"] }[] = [
  {
    label: "GitHub",
    href: "https://github.com/SachinyadavAug20",
    img: { dark: "/images/github.png", light: "/images/github-light.png" },
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/sachin-yadav-05a105374/",
    img: { dark: "/images/linkedin.png", light: "/images/linkedin-light.png" },
  },
  {
    label: "X",
    href: "https://x.com/samtagon38824",
    img: { dark: "/images/x.png", light: "/images/x-light.png" },
  },
];

const GITHUB_AVATAR = "https://github.com/SachinyadavAug20.png?size=160";

const riseWith = (reduced: boolean) => (i: number) =>
  reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, delay: 0.04 + i * 0.03, ease: "easeOut" as const },
      };

const LinkRow = ({
  item,
  index,
  grid = false,
}: {
  item: LinkItem;
  index: number;
  grid?: boolean;
}) => {
  const Icon = item.icon;
  const reduced = useReducedMotion();
  const rise = riseWith(reduced);

  const containerClasses = `group relative flex items-center gap-3 p-3 sm:p-3.5 rounded-xl border border-zinc-200/90 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/70 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 active:scale-[0.985] shadow-sm hover:shadow-md ${
    grid ? "w-full" : "w-full"
  }`;

  const inner = (
    <>
      <span className="size-9 rounded-lg flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white group-hover:scale-105 transition-all">
        {item.img ? (
          <>
            <img
              src={item.img.dark}
              alt=""
              className="hidden dark:block size-4"
              loading="lazy"
              decoding="async"
            />
            <img
              src={item.img.light}
              alt=""
              className="dark:hidden size-4"
              loading="lazy"
              decoding="async"
            />
          </>
        ) : (
          Icon && <Icon className="size-4" aria-hidden="true" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="block font-medium text-zinc-900 dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white text-xs sm:text-sm tracking-tight truncate transition-colors">
            {item.label}
          </span>
          {item.badge && (
            <span className="hidden sm:inline-flex items-center rounded px-1.5 py-0.2 font-mono text-[9px] uppercase tracking-wider font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
              {item.badge}
            </span>
          )}
        </span>
        <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
          {item.sub}
        </span>
      </span>

      <ArrowUpRight
        className="size-3.5 shrink-0 text-zinc-400 dark:text-zinc-500 transition-all duration-200 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </>
  );

  return (
    <motion.li {...rise(index)} className="list-none">
      {item.internal ? (
        <Link
          to={item.href}
          className={containerClasses}
          data-linkrow
          onClick={() => tap(8)}
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
          onClick={() => tap(8)}
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

  /* Keyboard arrow navigation */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const el = document.activeElement;
      if (!(el instanceof HTMLAnchorElement)) return;
      const rows = [
        ...document.querySelectorAll<HTMLAnchorElement>("[data-linkrow]"),
      ];
      const i = rows.indexOf(el);
      if (i === -1) return;
      e.preventDefault();
      rows[i + (e.key === "ArrowDown" ? 1 : -1)]?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const copyHandle = async () => {
    tap(12);
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
    tap(12);
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      notify("success", "Link copied to clipboard");
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
        description="Everywhere to find Sachin Yadav — projects, resume, GitHub, LinkedIn, X, LeetCode, Codeforces and more."
        path="/links"
        jsonLd={buildLinksSchema()}
      />

      <main className="relative min-h-[100svh] bg-background text-foreground flex flex-col items-center px-4 sm:px-6 py-10 sm:py-14 selection:bg-cyan-500/20">
        {/* Subtle Ambient Particle Constellation Canvas */}
        <InteractiveLinksCanvas />

        {/* Navigation Bar: Back & Status */}
        <div className="w-full max-w-xl flex items-center justify-between relative z-20 mb-6">
          <Link
            to="/"
            onClick={() => tap(8)}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 px-3 py-1 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm"
          >
            <ArrowLeft className="size-3" />
            <span>Portfolio</span>
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-mono text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Available for work</span>
          </div>
        </div>

        <div className="w-full max-w-xl relative z-10 space-y-6">
          {/* Profile Header */}
          <motion.header {...rise(1)} className="text-center space-y-3">
            {/* Avatar */}
            <div className="relative mx-auto size-24">
              <div className="size-24 rounded-full overflow-hidden border-2 border-zinc-300 dark:border-zinc-700/80 bg-zinc-100 dark:bg-zinc-900 shadow-xl mx-auto p-0.5">
                {avatarOk ? (
                  <img
                    src={GITHUB_AVATAR}
                    alt="Sachin Yadav"
                    width={96}
                    height={96}
                    className="size-full rounded-full object-cover"
                    decoding="async"
                    onError={() => setAvatarOk(false)}
                  />
                ) : (
                  <span className="text-zinc-700 dark:text-zinc-200 text-2xl font-bold flex items-center justify-center size-full">
                    SY
                  </span>
                )}
              </div>
              <span
                title="Active"
                className="absolute bottom-1 right-1 size-4 rounded-full border-2 border-background bg-emerald-500 flex items-center justify-center shadow"
              />
            </div>

            {/* Name */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Sachin Yadav
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Computer Engineering undergraduate (2nd Year) · Full-Stack & 3D Web
              </p>
            </div>

            {/* Handle & Quick Share */}
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={copyHandle}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/80 hover:border-zinc-300 dark:hover:border-zinc-700 px-3 py-1 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                title="Copy handle"
              >
                <span>@samtagon38824</span>
                {copiedHandle ? (
                  <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="size-3 text-zinc-400 dark:text-zinc-500" />
                )}
              </button>

              <button
                type="button"
                onClick={share}
                className="inline-flex items-center gap-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/80 hover:border-zinc-300 dark:hover:border-zinc-700 p-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                title="Share link"
              >
                <Share2 className="size-3" />
              </button>
            </div>

            {/* Quick 1-Tap Social Icons */}
            <nav
              aria-label="Social links"
              className="flex items-center justify-center gap-2 pt-1"
            >
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => tap(6)}
                  className="size-8 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/80 dark:bg-zinc-900/60 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 flex items-center justify-center transition-colors"
                  title={s.label}
                >
                  {s.img && (
                    <>
                      <img
                        src={s.img.dark}
                        alt=""
                        className="hidden dark:block size-3.5"
                      />
                      <img
                        src={s.img.light}
                        alt=""
                        className="dark:hidden size-3.5"
                      />
                    </>
                  )}
                </a>
              ))}
              <Link
                to="/#contact"
                onClick={() => tap(6)}
                className="size-8 rounded-lg border border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/80 dark:bg-zinc-900/60 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                title="Contact via email"
              >
                <Mail className="size-3.5" />
              </Link>
            </nav>
          </motion.header>

          {/* Primary Action Buttons */}
          <motion.div
            {...rise(2)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1"
          >
            <a
              href={RESUME_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => tap(10)}
              className="group flex items-center justify-center gap-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 px-4 py-3 text-xs sm:text-sm font-semibold shadow-md transition-all active:scale-[0.99]"
            >
              <FileText className="size-4" />
              <span>See My Resume</span>
              <ArrowUpRight className="size-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>

            <Link
              to="/#contact"
              onClick={() => tap(10)}
              className="group flex items-center justify-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/80 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-200 px-4 py-3 text-xs sm:text-sm font-semibold shadow-md transition-all active:scale-[0.99]"
            >
              <Briefcase className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>Work With Me</span>
              <ArrowUpRight className="size-3.5 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </motion.div>

          {/* Featured Platforms */}
          <div className="space-y-2 pt-2">
            <h2 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium px-1">
              Selected Platforms & Systems
            </h2>
            <ul className="space-y-2">
              {FEATURED_PLATFORMS.map((item, i) => (
                <LinkRow key={item.id} item={item} index={i + 3} />
              ))}
            </ul>
          </div>

          {/* Coding & Competitive Programming */}
          <div className="space-y-2 pt-2">
            <h2 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium px-1">
              Competitive Programming
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CODING_PROFILES.map((item, i) => (
                <LinkRow
                  key={item.id}
                  item={item}
                  index={i + 7}
                  grid={true}
                />
              ))}
            </div>
          </div>

          {/* Socials & Code Repositories */}
          <div className="space-y-2 pt-2">
            <h2 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-medium px-1">
              Socials & Open Source
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SOCIAL_PROFILES.map((item, i) => (
                <LinkRow
                  key={item.id}
                  item={item}
                  index={i + 11}
                  grid={true}
                />
              ))}
            </div>
          </div>

          {/* Clean Footer */}
          <footer className="text-center pt-6 pb-2 text-xs font-mono text-zinc-400 dark:text-zinc-500">
            <p>Sachin Yadav · 2026</p>
          </footer>
        </div>
      </main>
    </>
  );
};

export default Links;
