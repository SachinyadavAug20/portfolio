import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { navLinks } from "../../constants";
import ThemeToggle from "./ThemeToggle";

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

  const close = useCallback(() => {
    tlRef.current?.reverse();
    document.body.style.overflow = "";
    setIsOpen(false);
  }, []);

  const open = useCallback(() => {
    tlRef.current?.play();
    document.body.style.overflow = "hidden";
    setIsOpen(true);
  }, []);

  useGSAP(() => {
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
      .to(backdropRef.current, { opacity: 1, duration: 0.3, ease: "power2.out" }, 0)
      .to(drawerRef.current, { x: 0, duration: 0.4, ease: "power3.out" }, 0.1)
      .fromTo(
        linksRef.current.filter(Boolean),
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.3, ease: "power2.out", stagger: 0.08 },
        0.25,
      );

    tl.reverse();
    tlRef.current = tl;
  }, { scope: menuBtnRef });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isOpen) close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (backdropRef.current) {
      backdropRef.current.style.pointerEvents = isOpen ? "auto" : "none";
    }
  }, [isOpen]);

  const handleLinkClick = (href: string) => {
    close();
    if (href.startsWith("#")) {
      const el = document.getElementById(href.slice(1));
      if (el) {
        const offset = window.innerHeight * 0.15;
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
  };

  return (
    <>
      <header
        className={`navbar ${scrolled || !isHome ? "scrolled" : "not-scrolled"}`}
      >
        <div className="inner">
          <a
            className={`logo ${scrolled ? "text-shadow-zinc-500 font-bold" : ""}`}
            href="/"
          >
            Sachin Yadav
          </a>
          <nav className="desktop">
            <ul>
              {navLinks.map(({ link, name }) => (
                <li key={link} className="group">
                  {link.startsWith("#") ? (
                    <a href={`/${link}`}>
                      <span>{name}</span>
                      <span className="underline" />
                    </a>
                  ) : link.startsWith("http") ? (
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
      />
      <div ref={drawerRef} className="mobile-drawer">
        <div className="flex justify-end px-8 pt-6">
          <ThemeToggle />
        </div>
        <nav className="mobile-drawer-links pt-4">
          {navLinks.map(({ link, name }, i) => (
            <a
              key={link}
              ref={(el) => {
                linksRef.current[i] = el!;
              }}
              className="mobile-drawer-link"
              href={link.startsWith("#") ? `/${link}` : link}
              target={link.startsWith("http") ? "_blank" : undefined}
              rel={link.startsWith("http") ? "noreferrer" : undefined}
              onClick={(e) => {
                if (link.startsWith("#")) {
                  e.preventDefault();
                  handleLinkClick(link);
                } else {
                  close();
                }
              }}
            >
              {name}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
};

export default Navbar;
