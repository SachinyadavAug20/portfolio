import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { techStackIcons } from "../../constants";
import TechIcon from "../components/Models/TechLogos/TechIcon";
import TitleHeader from "../components/TitleHeader";
import gsap from "gsap";
import type { CSSProperties } from "react";

const TechStack = () => {
  const reduced = useReducedMotion();
  useGSAP(() => {
    if (reduced) return;

    const mobile = window.matchMedia("(max-width: 767px)").matches;
    gsap.fromTo(
      ".tech-card",
      {
        y: mobile ? 24 : 40,
        opacity: 0,
        scale: 0.96,
      },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: mobile ? 0.38 : 0.5,
        ease: "power3.out",
        stagger: { each: 0.03, amount: 0.28 },
        clearProps: "transform,opacity,scale",
        scrollTrigger: {
          trigger: "#skills",
          start: "top 80%",
          once: true,
        },
      },
    );
  }, { dependencies: [reduced], revertOnUpdate: true });

  return (
    <section id="skills" className="w-full flex-center py-12 sm:py-16 px-4 sm:px-6 md:px-10 relative z-10 clear-both">
      <div className="w-full h-full md:px-10">
        <TitleHeader title="Tech Stack" />
        <p className="mx-auto mt-3 max-w-md text-center text-xs leading-relaxed text-white-50/50 sm:text-sm">
          The roles I work across — from interface craft to the systems behind it.
        </p>

        <div className="tech-grid">
          {techStackIcons.map((icon, index) => (
            <article
              key={icon.name}
              className="tech-card group"
              style={{ "--tech-accent": icon.accent } as CSSProperties}
            >
              <div className="tech-card-animated-bg" />

              <span className="tech-card-index" aria-hidden>
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="tech-card-content">
                <div className="tech-icon-wrapper cursor-grab">
                  <TechIcon model={icon} />
                </div>

                <h3 className="tech-card-title">{icon.name}</h3>
                <p className="tech-card-role">{icon.role}</p>

                <ul className="tech-tags" aria-label={`${icon.name} tools`}>
                  {icon.tags.map((tag) => (
                    <li key={tag} className="tech-tag">
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TechStack;
