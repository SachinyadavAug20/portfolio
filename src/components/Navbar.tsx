import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { navLinks } from "../../constants";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled) setScrolled(true);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return (
    <header className={`navbar ${scrolled || !isHome ? "scrolled" : "not-scrolled"}`}>
      <div className="inner">
        <a className={`logo ${scrolled ? "text-shadow-zinc-500 font-bold" : ""}`} href="/">
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
        <a href="/#contact" className="contact-btn group">
          <div className="inner">
            <span>Contact me</span>
          </div>
        </a>
      </div>
    </header>
  );
};

export default Navbar;
