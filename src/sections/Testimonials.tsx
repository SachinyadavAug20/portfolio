import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { testimonials } from "../../constants";
import GlowCard from "../components/GlowCard";
import TitleHeader from "../components/TitleHeader";
import { gsap } from "../lib/gsapSetup";
import { useReducedMotion } from "../hooks/useReducedMotion";

const Testimonials = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const scope = sectionRef.current;
      if (!scope) return;
      const cards = scope.querySelectorAll(".card");
      if (!cards.length) return;
      gsap.from(cards, {
        y: 28,
        opacity: 0,
        duration: 0.4,
        ease: "power2.out",
        stagger: 0.07,
        clearProps: "transform,opacity",
        scrollTrigger: { trigger: scope, start: "top 75%", once: true },
      });
    },
    { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <section id="testimonials" ref={sectionRef} className="flex-center section-padding">
      <div className="w-full h-full md:px-10 px-5">
        <TitleHeader title="What people say about me" sub="Testimonials" />
        <div className="lg:columns-3 md:columns-2 columns-1 mt-16">
          {testimonials.map((item, i) => (
            <GlowCard card={item} index={i}>
              <div className="flex items-center gap-3">
                <div>
                  <img
                    src={item.imgPath}
                    alt={item.name}
                    className="w-16 h-16"
                  />
                </div>
                <p className="font-bold">{item.name}</p>
                <p className="text-white-50">{item.mentions}</p>
              </div>
            </GlowCard>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
