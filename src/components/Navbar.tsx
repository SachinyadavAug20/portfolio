import { useEffect, useState, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "motion/react";
import { tap } from "../lib/haptics";
import { scrollToTarget } from "../lib/smoothScroll";
import { Search } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import GitHubStar from "./GitHubStar";

const navLinks = [
  { link: "/", name: "Home" },
  { link: "/#work", name: "Projects" },
  { link: "/#experience", name: "Timeline" },
  { link: "/#skills", name: "Skills" },
  { link: "/blog", name: "Blog" },
  { link: "/links", name: "Links" },
];

const Navbar = () => {
  const [isHidden, setIsHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname, hash } = useLocation();
  const isHome = pathname === "/";
  const contactRef = useRef<HTMLAnchorElement>(null);
  const lastScrollY = useRef(0);

  /* Hide on scroll down, reveal on scroll up / at the top */
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY;
          setIsHidden(y > lastScrollY.current && y > 44);
          setScrolled(y > 10);
          lastScrollY.current = y > 44 ? y : 0;
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (link: string) => {
    if (link.startsWith("#")) return hash === link;
    if (link === "/") return pathname === "/";
    return pathname.startsWith(link);
  };

  const NavbarLink = ({ link, name }: { link: string; name: string }) => {
    const active = isActive(link);
    const baseClasses =
      "relative px-3 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium tracking-tight rounded-md transition-colors";
    return (
      <li key={link} className="relative">
        <a
          href={link}
          onClick={(e) => {
            tap(6);
            if (link.startsWith("#") && isHome) {
              e.preventDefault();
              scrollToTarget(link, false, -60);
            }
          }}
          className={`${baseClasses} ${
            active
              ? "text-zinc-950 dark:text-white border-b-2 border-b-[var(--nav-accent)] pb-[calc(1.5rem-2px)]"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
          }`}
        >
          <span className="nav-label">{name}</span>
        </a>
      </li>
    );
  };

  return (
    <motion.header
      className={`navbar fixed top-0 inset-x-0 z-[100] ${scrolled ? "shadow-sm" : ""}`}
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
        className="island-capsule pointer-events-none relative flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 md:px-8 pointer-events-auto border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/85 dark:bg-[#090a0f]/80 backdrop-blur-md"
      >
        {/* Hairline accent across the bar */}
        <div
          className="pointer-events-none absolute left-0 right-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--nav-accent)]/50 dark:via-sky-400/40 to-transparent"
          aria-hidden="true"
        />

        {/* 1. Brand */}
        <Link
          to="/"
          onClick={() => tap(6)}
          className="group flex items-center gap-1 text-foreground hover:text-[var(--nav-accent)] transition-colors"
          title="Sachin Yadav"
        >
          <span className="font-semibold text-xs sm:text-sm tracking-tight whitespace-nowrap">
            Sachin <span className="hidden sm:inline">Yadav</span>
          </span>
        </Link>

        {/* 2. Desktop Navigation Links (visible on md: 768px+) */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Primary">
          <ul className="flex items-center gap-0.5">
            {navLinks.map(NavbarLink)}
          </ul>
        </nav>

        {/* 3. Action Cluster */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
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
              {typeof navigator !== "undefined" && /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent)}
                ? "⌘K"
                : "Ctrl K"
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
                scrollToTarget("#contact", false, -60);
              }
            }}
            className="hidden md:inline-flex items-center justify-center h-8 sm:h-8.5 px-3 sm:px-3.5 rounded-full text-xs font-semibold bg-[#38bdf8] text-[#082f49] hover:bg-[#0ea5e9] hover:shadow-[0_0_18px_rgba(56,189,248,0.45)] transition-all duration-300 active:scale-95 shrink-0"
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
