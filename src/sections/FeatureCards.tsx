import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import gsap from "gsap";
import { abilities } from "../../constants";

/* the liquid blob inside each card trails the pointer — coords feed
   .liquid-card::before in index.css */
const trackLiquid = (e: ReactPointerEvent<HTMLDivElement>) => {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--lx", `${e.clientX - r.left}px`);
  el.style.setProperty("--ly", `${e.clientY - r.top}px`);
};

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
      <div className="mx-auto grid-abilities">
        {abilities.map(({ imgPath, title, desc }) => (
          <div
            key={title}
            onPointerMove={trackLiquid}
            className="liquid-card feature-card group card-border rounded-xl p-6 sm:p-8 flex flex-col gap-4"
          >
            <div className="fc-icon relative size-14 flex items-center justify-center rounded-full bg-[rgb(var(--liq)/0.1)] border border-[rgb(var(--liq)/0.22)] transition-shadow duration-300 group-hover:shadow-[0_0_28px_-6px_rgb(var(--liq)/0.55)]">
              <img src={imgPath} alt={title} className="size-7" loading="lazy" decoding="async" />
            </div>
            <h3 className="relative text-foreground text-2xl font-semibold mt-2">{title}</h3>
            <p className="relative text-white-50 text-lg">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeatureCards;
