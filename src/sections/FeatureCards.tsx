import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import gsap from "gsap";
import { abilities } from "../../constants";

const FeatureCards = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      gsap.fromTo(
        ".feature-card",
        { y: mobile ? 24 : 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: mobile ? 0.3 : 0.4,
          ease: "power2.out",
          stagger: { each: 0.03, amount: 0.25 },
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top 80%",
          },
        },
      );
    },
    { scope: rootRef, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <div ref={rootRef} className="w-full padding-x-lg">
      <div className="mx-auto grid-3-cols">
        {abilities.map(({ imgPath, title, desc }) => (
          <div
            key={title}
            className="feature-card card-border rounded-xl p-6 sm:p-8 flex flex-col gap-4"
          >
            <div className="fc-icon size-14 flex items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/15">
              <img src={imgPath} alt={title} className="size-7" loading="lazy" decoding="async" />
            </div>
            <h3 className="text-foreground text-2xl font-semibold mt-2">{title}</h3>
            <p className="text-white-50 text-lg">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeatureCards;
