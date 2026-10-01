import { useRef } from "react";
import { Link } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import { socialImg } from "../../constants";
import { gsap } from "../lib/gsapSetup";
import { useReducedMotion } from "../hooks/useReducedMotion";

const Footer = () => {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const scope = ref.current;
      if (!scope) return;
      const cols = scope.querySelectorAll(".footer-container > *");
      if (!cols.length) return;
      const tl = gsap.timeline({
        scrollTrigger: { trigger: scope, start: "top 96%", once: true },
      });
      tl.from(cols, {
        y: 18,
        opacity: 0,
        duration: 0.4,
        ease: "power2.out",
        stagger: 0.08,
        clearProps: "transform,opacity",
      }).from(
        ".socials .icon",
        {
          scale: 0.5,
          opacity: 0,
          rotation: -14,
          duration: 0.4,
          ease: "back.out(2.2)",
          stagger: 0.05,
          clearProps: "transform,opacity",
        },
        "-=.45",
      );
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <footer className="footer" ref={ref}>
      <div className="footer-container">
        <div className="flex flex-col justify-center items-center md:items-start">
          <Link
            to="/blog"
            className="group inline-flex items-center gap-1.5 py-2 -my-1 px-1 -mx-1 active:opacity-70 transition-opacity"
          >
            Visit my blog
            <span
              aria-hidden="true"
              className="inline-block transition-transform duration-300 group-hover:translate-x-1.5"
            >
              &rarr;
            </span>
          </Link>
        </div>
        <div className="socials">
          {socialImg.map(({ link, imgPath, imgPathLight, name }) => (
            <a href={link} className="icon target" target="_blank" rel="noreferrer" key={link}>
              <img src={imgPath} alt={name} className="hidden dark:block" loading="lazy" decoding="async" />
              <img src={imgPathLight} alt={name} className="dark:hidden" loading="lazy" decoding="async" />
            </a>
          ))}
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-center md:text-end">
            © {new Date().getFullYear()} Sachin Yadav | SachinYadavApr20. All
            rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
