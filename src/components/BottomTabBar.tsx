import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Home, LayoutGrid, Briefcase, Calendar, BookOpen, Plus } from "lucide-react";
import { tap } from "../lib/haptics";
import { scrollToY } from "../lib/smoothScroll";

const MotionLink = motion.create(Link);

/* Brand SVG Icons for Satellite Social Island */
const GitHubIcon = ({ className = "size-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

const XIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const CodeforcesIcon = ({ className = "size-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path
      fill="#2980b9"
      d="M4.5 9a1.5 1.5 0 0 1 1.5 1.5V20a1.5 1.5 0 0 1-3 0V10.5A1.5 1.5 0 0 1 4.5 9z"
    />
    <path
      fill="#f1c40f"
      d="M12 4a1.5 1.5 0 0 1 1.5 1.5V20a1.5 1.5 0 0 1-3 0V5.5A1.5 1.5 0 0 1 12 4z"
    />
    <path
      fill="#e84118"
      d="M19.5 13a1.5 1.5 0 0 1 1.5 1.5V20a1.5 1.5 0 0 1-3 0v-5.5a1.5 1.5 0 0 1 1.5-1.5z"
    />
  </svg>
);

const LeetCodeIcon = ({ className = "size-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path
      d="M16.1 17.9l-2.7 2.6c-.5.5-1.1.7-1.8.7s-1.4-.2-1.8-.7l-4.3-4.4c-.5-.5-.7-1.1-.7-1.9s.2-1.4.7-1.8l4.3-4.4c.5-.5 1.1-.6 1.8-.6s1.4.2 1.8.7l2.7 2.6c.5.5 1.4.5 1.9 0 .5-.5.6-1.4 0-1.9l-2.6-2.6c-1-1-2.4-1.5-3.8-1.5s-2.8.6-3.8 1.5l-4.3 4.4C2.6 11.6 2 13 2 14.4c0 1.4.6 2.8 1.6 3.8l4.3 4.4c1 1 2.3 1.5 3.8 1.5s2.8-.6 3.8-1.5l2.6-2.6c.5-.5.5-1.4 0-1.9-.5-.6-1.4-.6-2 0z"
      fill="#FFA116"
    />
    <path
      d="M10 12.5h11c.8 0 1.5-.7 1.5-1.5s-.7-1.5-1.5-1.5H10c-.8 0-1.5.7-1.5 1.5s.7 1.5 1.5 1.5z"
      fill="#E7A41E"
    />
  </svg>
);

const SOCIAL_LINKS = [
  {
    id: "github",
    name: "GitHub",
    href: "https://github.com/SachinyadavAug20",
    icon: GitHubIcon,
  },
  {
    id: "x",
    name: "X (Twitter)",
    href: "https://x.com/samtagon38824",
    icon: XIcon,
  },
  {
    id: "codeforces",
    name: "Codeforces",
    href: "https://codeforces.com/profile/sachinapr20",
    icon: CodeforcesIcon,
  },
  {
    id: "leetcode",
    name: "LeetCode",
    href: "https://leetcode.com/u/b2mIkNz0h5/",
    icon: LeetCodeIcon,
  },
];

const BottomTabBar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dockRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<string>("home");
  const [isSocialOpen, setIsSocialOpen] = useState<boolean>(false);

  /* Native live scroll-spy */
  useEffect(() => {
    if (pathname.startsWith("/blog")) {
      setActiveSection("blog");
      return;
    }
    if (pathname !== "/") {
      setActiveSection("");
      return;
    }

    let raf = 0;
    const compute = () => {
      raf = 0;
      const vh = window.innerHeight;
      const mid = vh * 0.4;

      const scheduleEl = document.getElementById("schedule") || document.getElementById("contact");
      if (scheduleEl && scheduleEl.getBoundingClientRect().top <= mid) {
        setActiveSection("schedule");
        return;
      }

      const expEl = document.getElementById("experience");
      if (expEl && expEl.getBoundingClientRect().top <= mid) {
        setActiveSection("experience");
        return;
      }

      const workEl = document.getElementById("work");
      if (workEl && workEl.getBoundingClientRect().top <= mid) {
        setActiveSection("work");
        return;
      }

      setActiveSection("home");
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  /* Close satellite popup on click-outside, Escape, or page scroll */
  useEffect(() => {
    if (!isSocialOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setIsSocialOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSocialOpen(false);
      }
    };
    const handleScroll = () => {
      setIsSocialOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isSocialOpen]);

  const handleNav = (e: React.MouseEvent, targetId: string, href: string) => {
    tap(10);
    setIsSocialOpen(false);
    if (!href.startsWith("/#")) return;
    e.preventDefault();
    const wasHome = pathname === "/";
    setActiveSection(targetId);

    const scroll = () => {
      const el = targetId === "schedule"
        ? (document.getElementById("schedule") || document.getElementById("contact"))
        : document.getElementById(targetId);
      if (el) {
        scrollToY(el.getBoundingClientRect().top + window.scrollY);
      }
    };

    if (wasHome) {
      navigate({ pathname: "/", hash: `#${targetId}` }, { replace: true });
      requestAnimationFrame(scroll);
    } else {
      navigate({ pathname: "/", hash: `#${targetId}` });
      setTimeout(scroll, 350);
    }
  };

  const toggleSocial = (e: React.MouseEvent) => {
    e.stopPropagation();
    tap(8);
    setIsSocialOpen((prev) => !prev);
  };

  return (
    <nav className="bottom-tabbar" aria-label="Mobile Navigation" ref={dockRef}>
      <div className="relative flex flex-col items-center select-none">

        {/* 1. Floating Satellite Island (Social Links: GitHub, X, Codeforces, LeetCode) */}
        <AnimatePresence>
          {isSocialOpen && (
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.88 }}
              transition={{ type: "spring", stiffness: 450, damping: 26 }}
              className="absolute bottom-full mb-3.5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 dark:bg-[#0d1527]/95 border border-zinc-200 dark:border-slate-700/80 shadow-[0_16px_36px_rgba(0,0,0,0.3)] dark:shadow-[0_16px_36px_rgba(0,0,0,0.7)] backdrop-blur-2xl z-20"
              role="menu"
              aria-label="Social profiles"
            >
              {SOCIAL_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.a
                    key={item.id}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => tap(6)}
                    whileHover={{ scale: 1.15, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="size-9 rounded-full hover:bg-zinc-100 dark:hover:bg-slate-800/80 text-zinc-700 dark:text-slate-300 hover:text-black dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    title={item.name}
                    aria-label={item.name}
                  >
                    <Icon className={item.id === "x" ? "size-4" : item.id === "leetcode" ? "size-4.5" : "size-5"} />
                  </motion.a>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. Classic Dock Body with Cradle Notch */}
        <div className="relative w-[348px] h-[58px] flex items-center justify-between px-3">
          {/* Background SVG with Gentle U-Notch Curve around Center FAB */}
          <svg
            className="absolute inset-0 w-full h-full -z-10 drop-shadow-[0_12px_32px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_16px_36px_rgba(0,0,0,0.7)]"
            viewBox="0 0 348 58"
            fill="none"
          >
            <path
              d="M 28 0 
                 L 136 0 
                 C 148 0 154 20 174 20 
                 C 194 20 200 0 212 0 
                 L 320 0 
                 A 28 28 0 0 1 348 28 
                 L 348 30 
                 A 28 28 0 0 1 320 58 
                 L 28 58 
                 A 28 28 0 0 1 0 30 
                 L 0 28 
                 A 28 28 0 0 1 28 0 Z"
              fill="var(--tab-bar-bg)"
              stroke="var(--nav-border)"
              strokeWidth="1.2"
            />
          </svg>

          {/* Left Wing: Home & Projects (Pure Icons, No Text) */}
          <div className="flex items-center gap-3 w-[122px] justify-center">
            {/* Home */}
            <MotionLink
              to="/"
              onClick={(e) => handleNav(e, "home", "/")}
              aria-label="Home"
              title="Home"
              aria-current={activeSection === "home" ? "page" : undefined}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 600, damping: 25 }}
              className="relative size-10 rounded-full flex items-center justify-center transition-colors hover:text-cyan-400 dark:hover:text-cyan-300"
            >
              <Home
                className="size-5 stroke-2 transition-colors duration-200 stroke-zinc-400 dark:stroke-zinc-500"
              />
            </MotionLink>

            {/* Projects */}
            <MotionLink
              to="/#work"
              onClick={(e) => handleNav(e, "work", "/#work")}
              aria-label="Projects"
              title="Projects"
              aria-current={activeSection === "work" ? "page" : undefined}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 600, damping: 25 }}
              className="relative size-10 rounded-full flex items-center justify-center transition-colors hover:text-cyan-400 dark:hover:text-cyan-300"
            >
              <LayoutGrid
                className="size-5 stroke-2 transition-colors duration-200 stroke-zinc-400 dark:stroke-zinc-500"
              />
            </MotionLink>
          </div>

          {/* Center FAB: (+) rotates smoothly to (x) and opens social links */}
          <div className="relative -top-3 flex items-center justify-center">
            <motion.button
              type="button"
              onClick={toggleSocial}
              aria-label={isSocialOpen ? "Close social profiles" : "Open social profiles (+ / x)"}
              aria-expanded={isSocialOpen}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 500, damping: 24 }}
              className={`size-12 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                isSocialOpen
                  ? "bg-gradient-to-b from-cyan-500 to-cyan-600 text-white border-cyan-400 shadow-[0_8px_24px_rgba(34,211,238,0.45)]"
                  : "bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-[#1b253b] dark:to-[#0f172a] text-zinc-900 dark:text-slate-100 border-zinc-300 dark:border-slate-600/90 shadow-[0_8px_22px_rgba(0,0,0,0.2)] dark:shadow-[0_8px_22px_rgba(0,0,0,0.6)] hover:border-cyan-500/50"
              }`}
            >
              <motion.div
                animate={{ rotate: isSocialOpen ? 135 : 0 }}
                transition={{ type: "spring", stiffness: 450, damping: 24 }}
                className="flex items-center justify-center"
              >
                <Plus className="size-5.5" strokeWidth={2.5} />
              </motion.div>
            </motion.button>
          </div>

          {/* Right Wing: Book Call (in animated circle!), Timeline & Blog */}
          <div className="flex items-center gap-1 w-[140px] justify-between">
            {/* Book a Call: Circular button with live animated pulse */}
            <MotionLink
              to="/#schedule"
              onClick={(e) => handleNav(e, "schedule", "/#schedule")}
              aria-label="Book a Call"
              title="Book a Call"
              aria-current={activeSection === "schedule" ? "page" : undefined}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 600, damping: 25 }}
              className={`relative size-10 rounded-full flex items-center justify-center transition-all ${
                activeSection === "schedule"
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.45)]"
                  : "bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border border-cyan-500/35 hover:border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.25)]"
              }`}
            >
              {/* Outer live breathing ping ring */}
              <span className="absolute inset-0 rounded-full bg-cyan-400/25 animate-ping pointer-events-none" />
              {/* Live status beacon dot */}
              <span className="absolute top-0 right-0 size-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)] animate-pulse" />
              <Calendar className="size-4.5" strokeWidth={2} />
            </MotionLink>

            {/* Timeline */}
            <MotionLink
              to="/#experience"
              onClick={(e) => handleNav(e, "experience", "/#experience")}
              aria-label="Timeline"
              title="Timeline"
              aria-current={activeSection === "experience" ? "page" : undefined}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 600, damping: 25 }}
              className={`relative size-10 rounded-full flex items-center justify-center transition-colors ${
                activeSection === "experience"
                  ? "text-cyan-500 dark:text-cyan-400 bg-cyan-500/10 border border-cyan-500/25 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <Briefcase className="size-4.5" strokeWidth={activeSection === "experience" ? 2.2 : 1.8} />
            </MotionLink>

            {/* Blog */}
            <MotionLink
              to="/blog"
              onClick={() => {
                tap(10);
                setIsSocialOpen(false);
              }}
              aria-label="Blog"
              title="Blog"
              aria-current={activeSection === "blog" ? "page" : undefined}
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 600, damping: 25 }}
              className={`relative size-10 rounded-full flex items-center justify-center transition-colors ${
                activeSection === "blog"
                  ? "text-cyan-500 dark:text-cyan-400 bg-cyan-500/10 border border-cyan-500/25 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <BookOpen className="size-4.5" strokeWidth={activeSection === "blog" ? 2.2 : 1.8} />
            </MotionLink>
          </div>

        </div>
      </div>
    </nav>
  );
};

export default BottomTabBar;

