import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import gsap from "gsap";
import { abilities } from "../../constants";

const cardRects = new WeakMap<HTMLElement, { rect: DOMRect; time: number }>();
let liquidRaf = 0;

const trackLiquid = (e: ReactPointerEvent<HTMLDivElement>) => {
  const el = e.currentTarget;
  const clientX = e.clientX;
  const clientY = e.clientY;

  if (liquidRaf) return;
  liquidRaf = requestAnimationFrame(() => {
    liquidRaf = 0;
    const now = performance.now();
    let cached = cardRects.get(el);
    if (!cached || now - cached.time > 400) {
      cached = { rect: el.getBoundingClientRect(), time: now };
      cardRects.set(el, cached);
    }
    const r = cached.rect;
    el.style.setProperty("--lx", `${Math.round(clientX - r.left)}px`);
    el.style.setProperty("--ly", `${Math.round(clientY - r.top)}px`);
  });
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
        { y: mobile ? 24 : 36, opacity: 0, scale: 0.98 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: mobile ? 0.4 : 0.55,
          ease: "power3.out",
          stagger: { each: 0.04, amount: 0.28 },
          clearProps: "transform,opacity,scale",
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top 85%",
            once: true,
          },
        },
      );
    },
    { scope: rootRef, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <section ref={rootRef} id="features" className="w-full padding-x-lg py-12 sm:py-16 relative z-10 clear-both">
      <div className="mx-auto grid-abilities">
        {abilities.map(({ imgPath, title, desc }) => (
          <div
            key={title}
            onPointerMove={trackLiquid}
            className="liquid-card feature-card group card-border rounded-2xl p-4 sm:p-5 flex flex-col gap-2 sm:gap-2.5 active:scale-[0.98] transition-transform touch-manipulation"
          >
            <div className="fc-icon relative size-11 flex items-center justify-center rounded-full bg-[rgb(var(--liq)/0.1)] border border-[rgb(var(--liq)/0.22)] transition-shadow duration-300 group-hover:shadow-[0_0_28px_-6px_rgb(var(--liq)/0.55)]">
              <img src={imgPath} alt={title} className="size-5" loading="lazy" decoding="async" />
            </div>
            <h3 className="relative text-foreground text-lg sm:text-xl font-semibold mt-1">{title}</h3>
            <p className="relative text-white-50 text-xs sm:text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeatureCards;
