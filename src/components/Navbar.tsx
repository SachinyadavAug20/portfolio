import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { navLinks } from "../../constants";
import ThemeToggle from "./ThemeToggle";
import GitHubStar from "./GitHubStar";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const isHome = pathname === "/";

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
          <GitHubStar />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
