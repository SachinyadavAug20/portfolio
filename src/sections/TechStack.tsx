import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { techStackIcons, techStackImgs } from "../../constants";
import TechIcon from "../components/Models/TechLogos/TechIcon";
import TitleHeader from "../components/TitleHeader";
import gsap from "gsap";

const TechStack = ({ isImage = false }: { isImage?: boolean }) => {
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
        <div className="tech-grid">
          {techStackIcons.map((icon) => (
            <div
              key={icon.name}
              className="card-border tech-card overflow-hidden group xl:rounded-full rounded-lg"
            >
              <div className="tech-card-animated-bg" />{" "}
              {/*water filling animation*/}
              <div className="tech-card-content">
                <div className="tech-icon-wrapper cursor-grab">
                  <TechIcon model={icon} />
                </div>
                <div className="padding-x w-full">
                  <p>{icon.name}</p>
                </div>
              </div>
            </div>
          ))}

          {isImage &&
            techStackImgs.map((icon) => (
              <div
                key={icon.name}
                className="card-border tech-card overflow-hidden group xl:rounded-full rounded-lg"
              >
                <div className="tech-card-animated-bg" />
                <div className="tech-card-content">
                  <div className="tech-icon-wrapper">
                    <img src={icon.imgPath} alt={icon.name} />
                  </div>
                  <div className="padding-x w-full">
                    <p>{icon.name}</p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
};

export default TechStack;
