import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { navLinks } from "../../constants";
import ThemeToggle from "./ThemeToggle";

const HASH_OFFSET = 72;

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLAnchorElement[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const scrollYRef = useRef(0);

  const lockBody = useCallback(() => {
    scrollYRef.current = window.scrollY;
    const b = document.body;
    b.style.position = "fixed";
    b.style.top = `-${scrollYRef.current}px`;
    b.style.left = "0";
    b.style.right = "0";
    b.style.width = "100%";
  }, []);

  const unlockBody = useCallback(() => {
    const b = document.body;
    b.style.position = "";
    b.style.top = "";
    b.style.left = "";
    b.style.right = "";
    b.style.width = "";
    window.scrollTo({ top: scrollYRef.current, behavior: "instant" });
  }, []);

  const close = useCallback(() => {
    tlRef.current?.reverse();
    unlockBody();
    setIsOpen(false);
  }, [unlockBody]);

  const open = useCallback(() => {
    tlRef.current?.play();
    lockBody();
    setIsOpen(true);
  }, [lockBody]);

  useGSAP(
    () => {
      const btn = menuBtnRef.current;
      if (!btn || !drawerRef.current || !backdropRef.current) return;
      const lines = btn.querySelectorAll("span");
      if (lines.length < 3) return;

      // Position lines absolutely in the center
      lines.forEach((line, i) => {
        line.style.position = "absolute";
        line.style.top = "50%";
        line.style.left = "50%";
        line.style.transform = `translate(-50%, ${((i - 1) * 8)}px)`;
      });

      const tl = gsap.timeline({ paused: true });

      tl.to(lines[0], { rotation: 45, y: 0, duration: 0.3, ease: "power2.inOut" })
        .to(lines[1], { scaleX: 0, opacity: 0, duration: 0.3, ease: "power2.inOut" }, "<")
        .to(lines[2], { rotation: -45, y: 0, duration: 0.3, ease: "power2.inOut" }, "<")
        .to(backdropRef.current, { autoAlpha: 1, duration: 0.3, ease: "power2.out" }, 0)
        .to(drawerRef.current, { x: 0, duration: 0.4, ease: "power3.out" }, 0.1)
        .fromTo(
          linksRef.current.filter(Boolean),
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.3, ease: "power2.out", stagger: 0.08 },
          0.25,
        );

      tl.reverse();
      tlRef.current = tl;
    },
    { scope: menuBtnRef },
  );

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

  useEffect(() => {
    if (!isOpen) return;
    const id = requestAnimationFrame(() => close());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  useEffect(() => {
    if (backdropRef.current) {
      backdropRef.current.style.pointerEvents = isOpen ? "auto" : "none";
    }
    if (drawerRef.current) {
      drawerRef.current.style.pointerEvents = isOpen ? "auto" : "none";
    }
  }, [isOpen]);

  const handleLinkClick = (href: string) => {
    close();
    if (href.startsWith("#")) {
      const el = document.getElementById(href.slice(1));
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - HASH_OFFSET;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
  };

  const isExternal = (link: string) => link.startsWith("http");
  const isInternal = (link: string) => !link.startsWith("#") && !isExternal(link);

  return (
    <>
      <header
        className={`navbar ${scrolled || !isHome ? "scrolled" : "not-scrolled"}`}
      >
        <div className="inner">
          <Link
            className={`logo ${scrolled ? "text-shadow-zinc-500 font-bold" : ""}`}
            to="/"
          >
            Sachin Yadav
          </Link>
          <nav className="desktop">
            <ul>
              {navLinks.map(({ link, name }) => (
                <li key={link} className="group">
                  {link.startsWith("#") ? (
                    <a href={`/${link}`}>
                      <span>{name}</span>
                      <span className="underline" />
                    </a>
                  ) : isExternal(link) ? (
                    <a href={link} target="_blank" rel="noreferrer">
                      <span>{name}</span>
                      <span className="underline" />
                    </a>
                  ) : (
                    <Link to={link}>
                      <span>{name}</span>
                      <span className="underline" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a href="/#contact" className="contact-btn group">
              <div className="inner">
                <span>Contact me</span>
              </div>
            </a>
            <button
              ref={menuBtnRef}
              className="hamburger"
              onClick={isOpen ? close : open}
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <div
        ref={backdropRef}
        className="mobile-backdrop"
        onClick={close}
        aria-hidden="true"
        inert={!isOpen}
      />
      <div ref={drawerRef} className="mobile-drawer" inert={!isOpen}>
        <nav className="mobile-drawer-links">
          {navLinks.map(({ link, name }, i) => {
            const props = {
              className: "mobile-drawer-link",
              ref: (el: HTMLAnchorElement) => {
                linksRef.current[i] = el;
              },
            };
            if (link.startsWith("#")) {
              return (
                <a
                  key={link}
                  {...props}
                  href={`/${link}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLinkClick(link);
                  }}
                >
                  {name}
                </a>
              );
            }
            if (isExternal(link)) {
              return (
                <a
                  key={link}
                  {...props}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  onClick={close}
                >
                  {name}
                </a>
              );
            }
            if (isInternal(link)) {
              return (
                <Link key={link} {...props} to={link} onClick={close}>
                  {name}
                </Link>
              );
            }
            return null;
          })}
        </nav>
      </div>
    </>
  );
};

export default Navbar;
