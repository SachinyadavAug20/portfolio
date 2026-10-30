import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
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
  MessageCircle,
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
  accentBorderHover?: string;
  accentBgIcon?: string;
  accentTextIcon?: string;
}

const RESUME_URL =
  "https://docs.google.com/document/d/1RFTuBerLRMMHeu0Ac4GvaXu7lUuRUDXo/edit?usp=sharing";

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

const SOCIAL_PROFILES: LinkItem[] = [
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
    id: "discord",
    label: "Discord",
    sub: "@samtagon · Chat, projects & community",
    href: "https://discord.com/users/1388334913601671219",
    icon: MessageCircle,
    accentBorderHover: "hover:border-indigo-400",
  },
  {
    id: "figma",
    label: "Figma",
    sub: "@sachinyadavaug · UI/UX designs & prototypes",
    href: "https://www.figma.com/@sachinyadavaug",
    icon: PenTool,
    accentBorderHover: "hover:border-purple-400",
  },
];

const CODE_REPOS: LinkItem[] = [
  {
    id: "github",
    label: "GitHub",
    sub: "SachinyadavAug20 · Open source repositories & code",
    href: "https://github.com/SachinyadavAug20",
    img: { dark: "/images/github.png", light: "/images/github-light.png" },
    accentBorderHover: "hover:border-zinc-400",
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
  {
    id: "itch",
    label: "itch.io",
    sub: "sachinapr20.itch.io · Indie games & web prototypes",
    href: "https://sachinapr20.itch.io/",
    icon: Gamepad2,
    accentBorderHover: "hover:border-rose-400",
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
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.25, delay: 0.03 + i * 0.025, ease: "easeOut" as const },
      };

const ProCard = ({
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

  const containerClasses = [
    "group relative flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border",
    "border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950",
    "transition-all duration-200 ease-out",
    "hover:-translate-y-0.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/90",
    item.accentBorderHover || "hover:border-zinc-400 dark:hover:border-zinc-600",
    "active:scale-[0.985] active:translate-y-0",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
    "shadow-sm hover:shadow cursor-pointer",
    grid ? "w-full" : "w-full",
  ].join(" ");

  const inner = (
    <>
      <span
        className={`size-10 rounded-xl flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-800 transition-all duration-200 group-hover:scale-105 ${
          item.accentBgIcon || "bg-zinc-100 dark:bg-zinc-900"
        }`}
      >
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
          Icon && (
            <Icon
              className={`size-4 transition-colors ${
                item.accentTextIcon || "text-zinc-700 dark:text-zinc-300 group-hover:text-foreground"
              }`}
              aria-hidden="true"
            />
          )
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="block font-medium text-zinc-900 dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white text-xs sm:text-sm tracking-tight truncate transition-colors">
            {item.label}
          </span>
          {item.badge && (
            <span className="hidden sm:inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
              {item.badge}
            </span>
          )}
        </span>
        <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
          {item.sub}
        </span>
      </span>

      <ArrowUpRight
        className="size-4 shrink-0 text-zinc-400 dark:text-zinc-500 transition-all duration-200 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
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

const SectionDivider = ({ title }: { title: string }) => (
  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 font-semibold mb-2.5">
    <span className="h-px w-3 bg-zinc-300 dark:bg-zinc-800" />
    <span>{title}</span>
    <span className="h-px flex-1 bg-zinc-300 dark:bg-zinc-800" />
  </div>
);

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
      notify("success", "Page link copied to clipboard");
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
        description="Everywhere to find Sachin Yadav — portfolio, blog, resume, GitHub, LinkedIn, X, LeetCode, Codeforces and more."
        path="/links"
        jsonLd={buildLinksSchema()}
      />

      <main className="relative min-h-[100svh] bg-background text-foreground flex flex-col items-center px-4 sm:px-6 py-10 sm:py-14 selection:bg-cyan-500/20">
        {/* Subtle Ambient Particle Constellation Canvas (Zero blur) */}
        <InteractiveLinksCanvas />

        {/* Navigation Bar: Back & Status */}
        <div className="w-full max-w-xl flex items-center justify-between relative z-20 mb-6">
          <Link
            to="/"
            onClick={() => tap(8)}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3.5 py-1 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 shadow-sm"
          >
            <ArrowLeft className="size-3" />
            <span>Portfolio</span>
          </Link>

          <Link
            to="/#contact"
            onClick={() => tap(8)}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium hover:border-emerald-500/50 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 shadow-sm"
            title="Available for roles"
          >
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Available for work</span>
            <ArrowUpRight className="size-3" />
          </Link>
        </div>

        <div className="w-full max-w-xl relative z-10 space-y-6">
          {/* Profile Header */}
          <motion.header {...rise(1)} className="text-center space-y-3">
            {/* Avatar with status indicator */}
            <div className="relative mx-auto size-24">
              <div className="size-24 rounded-full overflow-hidden border-2 border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 shadow-xl mx-auto p-0.5 select-none">
                {avatarOk ? (
                  <img
                    src={GITHUB_AVATAR}
                    alt="Sachin Yadav"
                    width={96}
                    height={96}
                    className="size-full rounded-full object-cover transition-transform duration-300 hover:scale-105"
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

            {/* Name + Verified Pro Badge */}
            <div className="flex items-center justify-center gap-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Sachin Yadav
              </h1>
              <span title="Verified Profile" className="inline-flex items-center">
                <BadgeCheck className="size-5 text-sky-400" />
              </span>
            </div>

            {/* Sharp Bio matching resume */}
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              Full-Stack Engineer & Creative Developer. Crafting interactive 3D web experiences, tools & systems.
            </p>

            {/* Interactive Handle Copy */}
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={copyHandle}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-900 px-3.5 py-1 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 active:scale-95 transition-all duration-200 shadow-sm"
                title="Click to copy handle"
              >
                <span>@samtagon38824</span>
                {copiedHandle ? (
                  <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="size-3 text-zinc-400 dark:text-zinc-500" />
                )}
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
                  className="size-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 hover:bg-zinc-200 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-sm"
                  title={s.label}
                >
                  {s.img && (
                    <>
                      <img
                        src={s.img.dark}
                        alt=""
                        className="hidden dark:block size-4"
                      />
                      <img
                        src={s.img.light}
                        alt=""
                        className="dark:hidden size-4"
                      />
                    </>
                  )}
                </a>
              ))}
              <Link
                to="/#contact"
                onClick={() => tap(6)}
                className="size-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 hover:bg-zinc-200 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-sm"
                title="Contact via email"
              >
                <Mail className="size-4" />
              </Link>
            </nav>
          </motion.header>

          {/* Primary Action Buttons: Work With Me & See My Resume (Bento 2-Col Grid) */}
          <motion.div
            {...rise(2)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1"
          >
            <Link
              to="/#contact"
              data-linkrow
              onClick={() => tap(10)}
              className="group relative flex items-center gap-3.5 p-4 rounded-2xl border border-emerald-500/35 bg-white dark:bg-zinc-950 hover:border-emerald-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.985] shadow-sm hover:shadow cursor-pointer"
            >
              <span className="size-10 shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/15 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                <Briefcase className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base tracking-tight">
                  Work with me
                </span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Contracts & full-time
                </span>
              </span>
              <ArrowUpRight
                className="size-4 shrink-0 text-emerald-600/70 dark:text-emerald-400/70 transition-all duration-200 group-hover:text-emerald-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>

            <a
              href={RESUME_URL}
              target="_blank"
              rel="noreferrer"
              data-linkrow
              onClick={() => tap(10)}
              className="group relative flex items-center gap-3.5 p-4 rounded-2xl border border-sky-500/35 bg-white dark:bg-zinc-950 hover:border-sky-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.985] shadow-sm hover:shadow cursor-pointer"
            >
              <span className="size-10 shrink-0 rounded-xl border border-sky-500/30 bg-sky-500/15 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                <FileText className="size-5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base tracking-tight">
                  See my resume
                </span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  CV, skills & track record
                </span>
              </span>
              <ArrowUpRight
                className="size-4 shrink-0 text-sky-600/70 dark:text-sky-400/70 transition-all duration-200 group-hover:text-sky-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </a>
          </motion.div>

          {/* Core Platforms */}
          <div className="space-y-2.5 pt-2">
            <SectionDivider title="Core Platforms" />
            <ul aria-label="Core platforms" className="space-y-2.5">
              {CORE_PLATFORMS.map((item, i) => (
                <ProCard key={item.id} item={item} index={i + 3} />
              ))}
            </ul>
          </div>

          {/* Coding & Competitive Profiles (2x2 Grid) */}
          <div className="space-y-2.5 pt-2">
            <SectionDivider title="Coding & Competitive Profiles" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CODING_PROFILES.map((item, i) => (
                <ProCard
                  key={item.id}
                  item={item}
                  index={i + 6}
                  grid={true}
                />
              ))}
            </div>
          </div>

          {/* Social & Community (2x2 Grid) */}
          <div className="space-y-2.5 pt-2">
            <SectionDivider title="Social & Community" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SOCIAL_PROFILES.map((item, i) => (
                <ProCard
                  key={item.id}
                  item={item}
                  index={i + 10}
                  grid={true}
                />
              ))}
            </div>
          </div>

          {/* Code & Repositories (2x2 Grid) */}
          <div className="space-y-2.5 pt-2">
            <SectionDivider title="Code & Repositories" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CODE_REPOS.map((item, i) => (
                <ProCard
                  key={item.id}
                  item={item}
                  index={i + 14}
                  grid={true}
                />
              ))}
            </div>
          </div>

          {/* Bottom Share Action & Navigation Tip */}
          <div className="pt-4 pb-6 text-center space-y-2">
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 px-4 py-2 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-sm"
            >
              <Share2 className="size-3.5" />
              <span>Share this page</span>
            </button>
            <p className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
              tip: use ↑ ↓ arrow keys to walk the cards
            </p>
          </div>
        </div>
      </main>
    </>
  );
};

export default Links;
