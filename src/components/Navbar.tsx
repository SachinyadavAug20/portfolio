import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "motion/react";
import { useGSAP } from "@gsap/react";
import { navLinks } from "../../constants";
import ThemeToggle from "./ThemeToggle";
import GitHubStar from "./GitHubStar";
import { useMagnetic } from "../hooks/useMagnetic";
import { gsap } from "../lib/gsapSetup";
import { useReducedMotion } from "../hooks/useReducedMotion";

const MotionLink = motion.create(Link);
const PRESS = {
  whileTap: { scale: 0.94 },
  transition: { type: "spring", stiffness: 650, damping: 30 },
} as const;
const HOVER_LIFT = { whileHover: { y: -1.5 } };

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

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const contactRef = useMagnetic<HTMLAnchorElement>();
  const innerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const hoverIdx = useRef(-1);
  const reduced = useReducedMotion();
  const finePointer = useRef(false);

  useGSAP(
    () => {
      if (reduced) return;
      gsap.from(".navbar .inner > *", {
        y: -10,
        opacity: 0,
        duration: 0.5,
        delay: 0.1,
        stagger: 0.06,
        ease: "power2.out",
        clearProps: "transform,opacity",
      });
    },
    { dependencies: [reduced], revertOnUpdate: true },
  );

  const isActive = (link: string) => {
    if (link.startsWith("http")) return false;
    if (link.startsWith("#")) return isHome && pathname === "/" && activeIdx === navLinks.findIndex((l) => l.link === link);
    return pathname.startsWith(link);
  };

  /* ---- sliding pill: glides to hovered / active item ---- */
  const movePill = useCallback(
    (idx: number, instant = false) => {
      const pill = pillRef.current;
      const list = listRef.current;
      const item = itemRefs.current[idx];
      if (!pill || !list || !item) return;
      const lr = list.getBoundingClientRect();
      const ir = item.getBoundingClientRect();
      const x = ir.left - lr.left;
      const w = ir.width;
      if (reduced || instant) {
        gsap.set(pill, { x, width: w, opacity: 1 });
      } else {
        gsap.to(pill, {
          x,
          width: w,
          opacity: 1,
          duration: 0.45,
          ease: "power3.out",
          overwrite: "auto",
        });
      }
    },
    [reduced],
  );

  const hidePill = useCallback(() => {
    const pill = pillRef.current;
    if (!pill) return;
    if (reduced) gsap.set(pill, { opacity: 0 });
    else gsap.to(pill, { opacity: 0, duration: 0.22, overwrite: "auto" });
  }, [reduced]);

  /* ---- scroll spy + per-section progress fills ---- */
  useEffect(() => {
    let raf = 0;
    const compute = () => {
      raf = 0;
      if (!isHome) {
        const blogIdx = navLinks.findIndex(
          (l) => !l.link.startsWith("#") && !l.link.startsWith("http") && pathname.startsWith(l.link),
        );
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
        setProgress(blogIdx >= 0 ? { [navLinks[blogIdx].link]: p } : {});
        setActiveIdx(blogIdx);
        return;
      }
      const next: Record<string, number> = {};
      const mid = window.innerHeight * 0.35;
      let current = -1;
      navLinks.forEach((l, i) => {
        if (!l.link.startsWith("#")) return;
        const el = document.getElementById(l.link.slice(1));
        if (!el) return;
        const r = el.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (mid - r.top) / Math.max(r.height, 1)));
        next[l.link] = p;
        if (r.top <= mid && r.bottom > mid) current = i;
      });
      setProgress(next);
      setActiveIdx(current);
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

  /* park the pill on the active item whenever it changes */
  useEffect(() => {
    if (hoverIdx.current >= 0) return;
    if (activeIdx >= 0) movePill(activeIdx);
    else hidePill();
  }, [activeIdx, movePill, hidePill]);

  /* re-measure after layout settles (route change, fonts, resize) */
  useEffect(() => {
    if (activeIdx < 0 || hoverIdx.current >= 0) return;
    const t = window.setTimeout(() => movePill(activeIdx, true), 60);
    return () => window.clearTimeout(t);
  }, [pathname, activeIdx, movePill]);

  /* ---- cursor spotlight inside the glass capsule ---- */
  useEffect(() => {
    const inner = innerRef.current;
    if (!inner || reduced) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    finePointer.current = fine;
    if (!fine) return;
    const onMove = (e: PointerEvent) => {
      const r = inner.getBoundingClientRect();
      inner.style.setProperty("--spotlight-x", `${e.clientX - r.left}px`);
    };
    inner.addEventListener("pointermove", onMove);
    return () => inner.removeEventListener("pointermove", onMove);
  }, [reduced]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        setScrolled(window.scrollY > 10);
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isExternal = (link: string) => link.startsWith("http");

  const onItemEnter = (idx: number, name: string, labelEl: HTMLSpanElement | null) => {
    hoverIdx.current = idx;
    movePill(idx);
    if (labelEl && finePointer.current && !reduced) {
      scrambleLabel(labelEl, name);
    }
  };

  const onListLeave = () => {
    hoverIdx.current = -1;
    if (activeIdx >= 0) movePill(activeIdx);
    else hidePill();
  };

  const renderItem = (link: string, name: string, idx: number, content: ReactNode) => (
    <li
      key={link}
      ref={(el) => {
        itemRefs.current[idx] = el;
      }}
      onMouseEnter={() => {
        const label = itemRefs.current[idx]?.querySelector<HTMLSpanElement>(".nav-label") ?? null;
        onItemEnter(idx, name, label);
      }}
    >
      {content}
    </li>
  );

  const labelSpan = (name: string) => <span className="nav-label">{name}</span>;
  const progressFill = (link: string) =>
    link.startsWith("#") || (!link.startsWith("http") && !link.startsWith("#")) ? (
      <span className="nav-progress" aria-hidden="true">
        <span
          className="nav-progress-fill"
          style={{ transform: `scaleX(${progress[link] ?? 0})` }}
        />
      </span>
    ) : null;

  return (
    <header
      className={`navbar ${scrolled || !isHome ? "scrolled" : "not-scrolled"}`}
    >
      <div className="inner" ref={innerRef}>
        <Link
          className={`logo ${scrolled ? "text-shadow-zinc-500 font-bold" : ""}`}
          to="/"
        >
          Sachin Yadav
        </Link>
        <nav className="desktop" aria-label="Primary">
          <ul ref={listRef} onMouseLeave={onListLeave}>
            <span ref={pillRef} className="nav-pill" aria-hidden="true" />
            {navLinks.map(({ link, name }, idx) => {
              const active = isActive(link);
              if (link.startsWith("#")) {
                return renderItem(
                  link,
                  name,
                  idx,
                  <motion.a
                    href={`/${link}`}
                    aria-current={active ? "page" : undefined}
                    {...PRESS}
                    {...HOVER_LIFT}
                  >
                    {labelSpan(name)}
                    {progressFill(link)}
                  </motion.a>,
                );
              }
              if (isExternal(link)) {
                return renderItem(
                  link,
                  name,
                  idx,
                  <motion.a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    {...PRESS}
                    {...HOVER_LIFT}
                  >
                    {labelSpan(name)}
                  </motion.a>,
                );
              }
              return renderItem(
                link,
                name,
                idx,
                <MotionLink
                  to={link}
                  aria-current={active ? "page" : undefined}
                  {...PRESS}
                  {...HOVER_LIFT}
                >
                  {labelSpan(name)}
                  {progressFill(link)}
                </MotionLink>,
              );
            })}
          </ul>
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a ref={contactRef} href="/#contact" className="contact-btn group">
            <div className="inner">
              <span>Contact me</span>
            </div>
          </a>
          <GitHubStar />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
