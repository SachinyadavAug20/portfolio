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
            once: true,
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
            className="liquid-card feature-card group card-border rounded-xl p-5 sm:p-6 flex flex-col gap-2.5 sm:gap-3"
          >
            <div className="fc-icon relative size-12 flex items-center justify-center rounded-full bg-[rgb(var(--liq)/0.1)] border border-[rgb(var(--liq)/0.22)] transition-shadow duration-300 group-hover:shadow-[0_0_28px_-6px_rgb(var(--liq)/0.55)]">
              <img src={imgPath} alt={title} className="size-6" loading="lazy" decoding="async" />
            </div>
            <h3 className="relative text-foreground text-xl sm:text-2xl font-semibold mt-1">{title}</h3>
            <p className="relative text-white-50 text-sm sm:text-base leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeatureCards;
