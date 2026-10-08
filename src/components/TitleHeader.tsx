import { useEffect, useRef } from "react";
import { gsap } from "../lib/gsapSetup";
import { loadGsapExtras, type GsapExtras } from "../lib/gsapExtras";
import { useReducedMotion } from "../hooks/useReducedMotion";

const TitleHeader = ({ title, sub }: { title: string; sub: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const scope = ref.current;
    if (!scope) return;
    let cancelled = false;
    let split: InstanceType<GsapExtras["SplitText"]> | undefined;
    let tl: ReturnType<typeof gsap.timeline> | undefined;

    loadGsapExtras().then(({ SplitText }) => {
      if (cancelled) return;
      const titleEl = scope.querySelector(".th-title");
      if (!titleEl) return;

      split = new SplitText(titleEl, { type: "chars" });
      const badgeText = scope.querySelector(".hero-badge p");
      if (badgeText) badgeText.textContent = "";

      const st = { trigger: scope, start: "top 90%", once: true };
      tl = gsap.timeline({ scrollTrigger: st });
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
    });

    return () => {
      cancelled = true;
      if (tl) {
        tl.scrollTrigger?.kill();
        tl.kill();
      }
      split?.revert();
    };
  }, [reduced, sub]);

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
