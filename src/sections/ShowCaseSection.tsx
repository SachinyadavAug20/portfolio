import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { projects } from "../lib/projects";
import TitleHeader from "../components/TitleHeader";
import { ProjectCard } from "../components/ProjectCard";

gsap.registerPlugin(ScrollTrigger);

const ShowCaseSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;

      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const dur = mobile ? 0.3 : 0.4;

      const projectEls = document.querySelectorAll(".showcase-card");
      projectEls.forEach((el, i) => {
        gsap.fromTo(
          el,
          {
            y: mobile ? 28 : 50,
            opacity: 0,
          },
          {
            y: 0,
            opacity: 1,
            duration: dur,
            delay: Math.min(0.08 * (i + 1), 0.3),
            ease: "power2.out",
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: el,
              start: "top bottom-=80",
            },
          },
        );
      });
    },
    { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <section ref={sectionRef} id="work" className="w-full section-padding">
      <div className="w-full h-full md:px-10">
        <TitleHeader
          title="Featured Projects"
          sub="Selected systems & architecture"
        />

        {/* Unified 2-column project grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project, idx) => (
            <ProjectCard
              key={project.id}
              project={project}
              isTop={idx === 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ShowCaseSection;
