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
        y: mobile ? 28 : 48,
        opacity: 0,
      },
      {
        y: 0,
        opacity: 1,
        duration: mobile ? 0.3 : 0.4,
        ease: "power2.out",
        // 30ms rhythm, capped at 250ms total — keeps the row feeling brisk.
        stagger: { each: 0.03, amount: 0.25 },
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: "#skills",
          start: "top center",
        },
      },
    );
  }, { dependencies: [reduced], revertOnUpdate: true });
  return (
    <div id="skills" className="flex-center section-padding">
      <div className="w-full h-full md:px-10">
        <TitleHeader title="Tech Stack" sub="What I use" />
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
    </div>
  );
};

export default TechStack;
