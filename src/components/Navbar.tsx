import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion } from "motion/react";
import { navLinks } from "../../constants";
import ThemeToggle from "./ThemeToggle";
import GitHubStar from "./GitHubStar";
import { useMagnetic } from "../hooks/useMagnetic";

const MotionLink = motion.create(Link);
const PRESS = {
  whileTap: { scale: 0.94 },
  transition: { type: "spring", stiffness: 650, damping: 30 },
} as const;

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const { pathname, hash } = useLocation();
  const isHome = pathname === "/";
  const contactRef = useMagnetic<HTMLAnchorElement>();

  const isActive = (link: string) => {
    if (link.startsWith("http")) return false;
    if (link.startsWith("#")) return isHome && hash === link;
    return pathname.startsWith(link);
  };

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

  return (
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
                  <motion.a
                    href={`/${link}`}
                    aria-current={isActive(link) ? "page" : undefined}
                    {...PRESS}
                  >
                    <span>{name}</span>
                    <span className="underline" />
                  </motion.a>
                ) : isExternal(link) ? (
                  <motion.a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    {...PRESS}
                  >
                    <span>{name}</span>
                    <span className="underline" />
                  </motion.a>
                ) : (
                  <MotionLink
                    to={link}
                    aria-current={isActive(link) ? "page" : undefined}
                    {...PRESS}
                  >
                    <span>{name}</span>
                    <span className="underline" />
                  </MotionLink>
                )}
              </li>
            ))}
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
