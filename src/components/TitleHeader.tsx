import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, SplitText } from "../lib/gsapSetup";
import { useReducedMotion } from "../hooks/useReducedMotion";

const TitleHeader = ({ title, sub }: { title: string; sub: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const scope = ref.current;
      if (!scope) return;
      const titleEl = scope.querySelector(".th-title");
      if (!titleEl) return;

      const split = new SplitText(titleEl, { type: "chars" });
      const badgeText = scope.querySelector(".hero-badge p");
      if (badgeText) badgeText.textContent = "";

      const st = { trigger: scope, start: "top 90%", once: true };
      const tl = gsap.timeline({ scrollTrigger: st });
      tl.from(split.chars, {
        yPercent: 70,
        opacity: 0,
        duration: 0.35,
        ease: "power2.out",
        stagger: 0.014,
      });
      if (badgeText) {
        tl.to(
          badgeText,
          {
            scrambleText: {
              text: sub,
              chars: "upperAndLowerCase",
              speed: 0.7,
              revealDelay: 0.1,
            },
            duration: 0.8,
            ease: "none",
          },
          0.1,
        );
      }

      return () => {
        split.revert();
      };
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className="flex flex-col items-center gap-5">
      <div className="hero-badge">
        <p>{sub}</p>
      </div>
      <div className="th-title font-semibold md:text-5xl text-3xl text-center">
        {title}
      </div>
    </div>
  );
};

export default TitleHeader;
