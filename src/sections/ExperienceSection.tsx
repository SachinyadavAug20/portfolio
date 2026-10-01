import { expCards } from "../../constants";
import GlowCard from "../components/GlowCard";
import TitleHeader from "../components/TitleHeader";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "../hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

const ExperienceSection = () => {
  const reduced = useReducedMotion();
  useGSAP(() => {
    if (reduced) {
      // Jump to end state: reveal the gradient line, no scroll choreography.
      gsap.set(".timeline", { scaleY: 0, transformOrigin: "bottom bottom" });
      return;
    }

    const mm = gsap.matchMedia();

    mm.add(
      {
        isDesktop: "(min-width: 1280px)",
        isSmall: "(max-width: 1279px)",
      },
      (ctx) => {
        const desktop = (ctx.conditions as { isDesktop?: boolean }).isDesktop;
        const dur = desktop ? 0.45 : 0.35;

        gsap.utils.toArray<Element>(".timeline-card").forEach((card) => {
          gsap.from(card, {
            ...(desktop
              ? { xPercent: -60 }
              : { x: -32 }),
            opacity: 0,
            transformOrigin: "left left",
            duration: dur,
            ease: "power2.out",
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: card,
              start: "top 92%",
            },
          });
        });

        // Single scrubbed tween replaces the old per-onUpdate tween spawning.
        gsap.fromTo(
          ".timeline",
          { scaleY: 1, transformOrigin: "bottom bottom" },
          {
            scaleY: 0,
            ease: "none",
            scrollTrigger: {
              trigger: ".timeline",
              start: "top 50%",
              end: "80% center",
              scrub: 0.4,
            },
          },
        );

        gsap.utils.toArray<Element>(".expText").forEach((text) => {
          gsap.from(text, {
            y: 20,
            opacity: 0,
            duration: dur,
            ease: "power2.out",
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: text,
              start: "top 85%",
            },
          });
          const items = text.querySelectorAll("li");
          if (items.length) {
            gsap.from(items, {
              x: -10,
              opacity: 0,
              duration: dur * 0.8,
              ease: "power2.out",
              stagger: 0.07,
              clearProps: "transform,opacity",
              scrollTrigger: {
                trigger: text,
                start: "top 85%",
              },
            });
          }
        });
      },
    );

    return () => mm.revert();
  }, [reduced]);
  return (
    <section
      id="experience"
      className="w-full md:mt-40 mt-20 section-padding md:px-0"
    >
      <div className="w-full h-full md:px-20">
        <TitleHeader title="Experience" sub="My CS Experience" />
        <div className="mt-20 md:mt-32 relative">
          <div className="relative z-50 xl:space-y-32 space-y-10">
            {expCards.map((exp, i) => (
              <div key={exp.title} className="exp-card-wrapper">
                <div className="xl:w-1/3">
                  <GlowCard card={exp} index={i}>
                    <div>
                      <img src={exp.imgPath} alt={exp.title} loading="lazy" decoding="async" />
                    </div>
                  </GlowCard>
                </div>
                <div className="xl:w-2/3">
                  <div className="flex items-start">
                    <div className="timeline-wrapper">
                      <div className="timeline" />
                      <div className="gradient-line w-1 h-full" />
                    </div>
                    <div className="expText flex xl:gap-20 md:gap-10 gap-5 relative z-20">
                      <div className="timeline-logo">
                        <img src={exp.logoPath} alt="logo" loading="lazy" decoding="async" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-3xl">{exp.title}</h2>
                        <p className="my-5 text-white-50">{exp.date}</p>
                        <p className="text-blue-50 italic">Responsibities</p>
                        <ul className="list-disc ms-5 mt-5 flex flex-col gap-5 text-white-50">
                          {exp.responsibilities.map((responsibility) => (
                            <li key={responsibility} className="text-lg">
                              {responsibility}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExperienceSection;
