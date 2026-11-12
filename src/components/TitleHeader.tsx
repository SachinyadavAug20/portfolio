import { useEffect, useRef } from "react";
import { gsap } from "../lib/gsapSetup";
import { loadGsapExtras, type GsapExtras } from "../lib/gsapExtras";
import { useReducedMotion } from "../hooks/useReducedMotion";

const TitleHeader = ({ title }: { title: string; sub?: string }) => {
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

      const st = { trigger: scope, start: "top 90%", once: true };
      tl = gsap.timeline({ scrollTrigger: st });
      tl.from(split.chars, {
        yPercent: 70,
        opacity: 0,
        duration: 0.35,
        ease: "power2.out",
        stagger: 0.014,
      });
    });

    return () => {
      cancelled = true;
      if (tl) {
        tl.scrollTrigger?.kill();
        tl.kill();
      }
      split?.revert();
    };
  }, [reduced]);

  return (
    <div ref={ref} className="flex flex-col items-center">
      <div className="th-title font-semibold md:text-4xl text-2xl sm:text-3xl text-center">
        {title}
      </div>
    </div>
  );
};

export default TitleHeader;
