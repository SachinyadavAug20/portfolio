import { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "motion/react";
import { navLinks } from "../../constants";
import ThemeToggle from "./ThemeToggle";
import GitHubStar from "./GitHubStar";
import { useMagnetic } from "../hooks/useMagnetic";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { tap } from "../lib/haptics";
import { scrollToTarget } from "../lib/smoothScroll";
import { Search } from "lucide-react";

/* terminal-style decode on hover — random glyphs resolve left-to-right */
const SCRAMBLE_CHARS = "!<>-_\\/[]{}=+*^?#░▒▓█|";
const SCRAMBLE_MS = 360;
const scrambleTimers = new WeakMap<HTMLSpanElement, number>();

function scrambleLabel(el: HTMLSpanElement, original: string) {
  const prev = scrambleTimers.get(el);
  if (prev) cancelAnimationFrame(prev);
  const start = performance.now();
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / SCRAMBLE_MS);
    const reveal = t * original.length;
    let out = "";
    for (let i = 0; i < original.length; i++) {
      if (original[i] === " ") out += " ";
      else if (i < reveal - 0.4) out += original[i];
      else out += SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
    }
    el.textContent = out;
    if (t < 1) scrambleTimers.set(el, requestAnimationFrame(frame));
    else {
      el.textContent = original;
      scrambleTimers.delete(el);
    }
  };
  scrambleTimers.set(el, requestAnimationFrame(frame));
}

const isMac = () =>
  typeof navigator !== "undefined" && /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);

const isExternal = (link: string) => link.startsWith("http");

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<string>("");

  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const contactRef = useMagnetic<HTMLAnchorElement>();
  const reduced = useReducedMotion();
  const lastScrollY = useRef(0);

  /* Scroll spy: detects active section on home page */
  useEffect(() => {
    if (!isHome) {
      if (pathname.startsWith("/blog")) setActiveSection("blog");
      else setActiveSection("");
      return;
    }

    let raf = 0;
    const compute = () => {
      raf = 0;
      const mid = window.innerHeight * 0.35;
      const ids = ["contact", "skills", "experience", "work"];
      let found = "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el) {
          const r = el.getBoundingClientRect();
          if (r.top <= mid && r.bottom > mid) {
            found = id;
            break;
          }
        }
      }
      setActiveSection(found);
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
  }, [isHome, pathname]);

  /* Smart hide on sustained scroll down, show on scroll up */
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const curY = window.scrollY;
          const diff = curY - lastScrollY.current;

          setScrolled(curY > 15);

          if (!reduced) {
            if (curY > 100 && diff > 7) {
              setIsHidden(true);
            } else if (diff < -5 || curY <= 100) {
              setIsHidden(false);
            }
          }

          lastScrollY.current = curY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reduced]);

  /* Show immediately upon route change */
  useEffect(() => {
    setIsHidden(false);
  }, [pathname]);

  const isActive = (link: string) => {
    if (isExternal(link)) return false;
    if (link.startsWith("#")) {
      return isHome && activeSection === link.slice(1);
    }
    return pathname.startsWith(link);
  };

  const handleNavClick = (e: React.MouseEvent, link: string) => {
    tap(6);
    if (link.startsWith("#") && isHome) {
      e.preventDefault();
      scrollToTarget(link, false, -80);
    }
  };

  return (
    <motion.header
      className="navbar fixed top-3 sm:top-4 md:top-5 inset-x-0 mx-auto w-fit max-w-[calc(100vw-1.25rem)] sm:max-w-fit z-[100] flex justify-center pointer-events-none"
      initial={{ y: -30, opacity: 0 }}
      animate={{
        y: isHidden ? -90 : 0,
        opacity: isHidden ? 0 : 1,
        scale: isHidden ? 0.96 : 1,
      }}
      transition={{
        type: "spring",
        stiffness: 340,
        damping: 30,
        mass: 0.8,
      }}
    >
      <div
        className={`island-capsule pointer-events-auto relative flex items-center gap-1.5 sm:gap-2.5 md:gap-3 p-1.5 sm:p-2 rounded-full transition-all duration-300 ease-out border backdrop-blur-2xl backdrop-saturate-[180%] ${
          scrolled
            ? "bg-white/94 dark:bg-[#090a0f]/94 border-black/10 dark:border-white/12 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.12),0_4px_16px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.9),0_0_24px_-6px_rgba(56,189,248,0.25)]"
            : "bg-white/85 dark:bg-[#090a0f]/85 border-black/8 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.7),0_0_16px_-6px_rgba(56,189,248,0.15)]"
        }`}
      >
        {/* Specular glass reflection hairline */}
        <div
          className="pointer-events-none absolute inset-x-6 top-0 h-[1px] bg-gradient-to-r from-transparent via-sky-400/30 dark:via-sky-400/40 to-transparent rounded-full"
          aria-hidden="true"
        />

        {/* 1. Brand */}
        <Link
          to="/"
          onClick={() => tap(6)}
          className="group flex items-center px-3 py-1 rounded-full text-foreground hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
          title="Sachin Yadav"
        >
          <span className="font-semibold text-xs sm:text-sm tracking-tight text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
            Sachin <span className="hidden sm:inline">Yadav</span>
          </span>
        </Link>

        {/* Hairline Divider */}
        <div className="hidden md:block h-3.5 w-px bg-zinc-200/80 dark:bg-zinc-800 shrink-0" />

        {/* 2. Desktop Navigation Links (visible on md: 768px+) */}
        <nav className="hidden md:flex items-center" aria-label="Primary">
          <ul
            className="flex items-center gap-0.5 relative"
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {navLinks.map(({ link, name }, idx) => {
              const active = isActive(link);
              const isHovered = hoveredIdx === idx;
              return (
                <li
                  key={link}
                  className="relative"
                  onMouseEnter={(e) => {
                    setHoveredIdx(idx);
                    const label = e.currentTarget.querySelector<HTMLSpanElement>(".nav-label");
                    if (label && !reduced) scrambleLabel(label, name);
                  }}
                >
                  {/* Active sliding pill */}
                  {active && (
                    <motion.span
                      layoutId="island-active-pill"
                      className="absolute inset-0 rounded-full bg-zinc-200/90 dark:bg-sky-500/15 dark:border dark:border-sky-500/30 shadow-xs"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      aria-hidden="true"
                    />
                  )}
                  {/* Hover highlight pill */}
                  {!active && isHovered && (
                    <motion.span
                      layoutId="island-hover-pill"
                      className="absolute inset-0 rounded-full bg-black/[0.04] dark:bg-white/[0.06]"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      aria-hidden="true"
                    />
                  )}
                  {link.startsWith("#") ? (
                    <a
                      href={`/${link}`}
                      onClick={(e) => handleNavClick(e, link)}
                      className={`relative z-10 block px-2.5 sm:px-3 py-1.5 text-xs font-medium tracking-tight rounded-full transition-colors ${
                        active
                          ? "text-zinc-950 dark:text-sky-300 font-semibold"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                      }`}
                    >
                      <span className="nav-label">{name}</span>
                    </a>
                  ) : isExternal(link) ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => tap(6)}
                      className="relative z-10 block px-2.5 sm:px-3 py-1.5 text-xs font-medium tracking-tight rounded-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
                    >
                      <span className="nav-label">{name}</span>
                    </a>
                  ) : (
                    <Link
                      to={link}
                      onClick={() => tap(6)}
                      className={`relative z-10 block px-2.5 sm:px-3 py-1.5 text-xs font-medium tracking-tight rounded-full transition-colors ${
                        active
                          ? "text-zinc-950 dark:text-sky-300 font-semibold"
                          : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                      }`}
                    >
                      <span className="nav-label">{name}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Hairline Divider */}
        <div className="h-3.5 w-px bg-zinc-200/80 dark:bg-zinc-800 shrink-0" />

        {/* 3. Action Cluster */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Command Palette button */}
          <button
            type="button"
            onClick={() => {
              tap(6);
              window.dispatchEvent(new Event("palette-open"));
            }}
            className="nav-cmdk-btn group"
            aria-label="Open command palette"
            title="Search & commands"
          >
            <Search className="size-3 text-zinc-500 dark:text-zinc-400 group-hover:text-foreground transition-colors" />
            <span className="hidden sm:inline font-mono text-[10px] text-zinc-500 dark:text-zinc-400 group-hover:text-foreground transition-colors">
              {isMac() ? "⌘K" : "Ctrl K"}
            </span>
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Contact Pill (Desktop / Tablet) */}
          <a
            ref={contactRef}
            href="/#contact"
            onClick={(e) => {
              tap(8);
              if (isHome) {
                e.preventDefault();
                scrollToTarget("#contact", false, -80);
              }
            }}
            className="hidden md:inline-flex items-center justify-center h-8 sm:h-8.5 px-3 sm:px-3.5 rounded-full text-xs font-semibold bg-[#38bdf8] text-[#082f49] hover:bg-[#0ea5e9] hover:shadow-[0_0_18px_rgba(56,189,248,0.45)] transition-all duration-300 active:scale-95 shadow-[0_2px_10px_rgba(56,189,248,0.3)] shrink-0"
          >
            <span>Contact</span>
          </a>

          {/* GitHub Star Pill */}
          <GitHubStar />
        </div>
      </div>
    </motion.header>
  );
};

export default Navbar;
