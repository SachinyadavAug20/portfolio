import { useRef } from "react";
import { Link } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import { gsap } from "../lib/gsapSetup";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { scrollToY } from "../lib/smoothScroll";
import { tap } from "../lib/haptics";
import { ArrowUp, ArrowUpRight } from "lucide-react";

const RESUME_URL =
  "https://docs.google.com/document/d/1RFTuBerLRMMHeu0Ac4GvaXu7lUuRUDXo/edit?usp=sharing";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/#work" },
  { label: "Timeline", href: "/#experience" },
  { label: "Book a Call", href: "/#schedule" },
];

const RESOURCE_LINKS = [
  { label: "Blog & Vault", href: "/blog", internal: true },
  { label: "All Links", href: "/links", internal: true },
  { label: "Credly Badges", href: "https://www.credly.com/users/sachinyadavapr20", external: true },
  { label: "Resume", href: RESUME_URL, external: true },
];

const SOCIAL_LINKS = [
  { label: "GitHub", href: "https://github.com/SachinyadavAug20" },
  { label: "X (Twitter)", href: "https://x.com/samtagon38824" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/sachin-yadav-05a105374/" },
  { label: "LeetCode", href: "https://leetcode.com/u/b2mIkNz0h5/" },
];

const Footer = () => {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const scope = ref.current;
      if (!scope) return;
      const cols = scope.querySelectorAll(".footer-reveal");
      if (!cols.length) return;
      const tl = gsap.timeline({
        scrollTrigger: { trigger: scope, start: "top 95%", once: true },
      });
      tl.from(cols, {
        y: 16,
        opacity: 0,
        duration: 0.45,
        ease: "power2.out",
        stagger: 0.08,
        clearProps: "transform,opacity",
      });
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <footer className="footer" ref={ref} aria-label="Site Footer">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-28 sm:pb-24 md:pb-12 flex flex-col gap-10 sm:gap-12">
        {/* Main Header & Columns */}
        <div className="footer-reveal flex flex-col md:flex-row md:items-start justify-between gap-8 sm:gap-10">
          {/* Brand & Descriptor */}
          <div className="flex flex-col gap-2.5 max-w-sm">
            <Link
              to="/"
              onClick={() => {
                tap(6);
                scrollToY(0);
              }}
              className="font-semibold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-zinc-100 hover:text-sky-500 dark:hover:text-sky-400 transition-colors w-fit"
            >
              Sachin Yadav
            </Link>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Full-Stack &amp; Systems Engineer crafting polished, interactive web experiences and open-source software.
            </p>
          </div>

          {/* Minimal Navigation Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-12 md:gap-16">
            {/* Navigation */}
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Navigation
              </span>
              <ul className="flex flex-col gap-2 text-xs sm:text-sm">
                {NAV_LINKS.map((item) => (
                  <li key={item.label}>
                    {item.href.startsWith("/#") ? (
                      <a
                        href={item.href}
                        onClick={() => tap(6)}
                        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        to={item.href}
                        onClick={() => {
                          tap(6);
                          scrollToY(0);
                        }}
                        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Resources
              </span>
              <ul className="flex flex-col gap-2 text-xs sm:text-sm">
                {RESOURCE_LINKS.map((item) => (
                  <li key={item.label}>
                    {item.internal ? (
                      <Link
                        to={item.href}
                        onClick={() => tap(6)}
                        className="group inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
                      >
                        <span>{item.label}</span>
                        <ArrowUpRight className="size-3 text-zinc-400 dark:text-zinc-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => tap(6)}
                        className="group inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
                      >
                        <span>{item.label}</span>
                        <ArrowUpRight className="size-3 text-zinc-400 dark:text-zinc-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Connect */}
            <div className="flex flex-col gap-3 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Connect
              </span>
              <ul className="flex flex-col gap-2 text-xs sm:text-sm">
                {SOCIAL_LINKS.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => tap(6)}
                      className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Hairline & Colophon */}
        <div className="footer-reveal border-t border-zinc-200/80 dark:border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-500">
          <p className="text-center sm:text-left">
            &copy; {new Date().getFullYear()} Sachin Yadav &middot; All rights reserved.
          </p>

          <button
            type="button"
            onClick={() => {
              tap(8);
              scrollToY(0);
            }}
            className="group inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer select-none"
            aria-label="Back to top of page"
          >
            <span>Back to top</span>
            <ArrowUp className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

