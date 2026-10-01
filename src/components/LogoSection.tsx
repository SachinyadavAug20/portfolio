import { useMemo, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { logoIconsList } from "../../constants";
import { useMarqueeMotion } from "../hooks/useMarqueeMotion";
import { gsap } from "../lib/gsapSetup";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { TechPill } from "./TechPill";

const GHOST_NAMES = [
  "React",
  "Next.js",
  "Tailwind",
  "Unity",
  "MongoDB",
  "Neovim",
  "Zod",
  "Node",
  "Git",
  "Docker",
  "TypeScript",
  "Blender",
  "GSAP",
  "Three.js",
  "MySQL",
];

const LogoSection = () => {
  const rowA = useRef<HTMLDivElement>(null);
  const rowB = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const rows = useMemo(() => [rowA, rowB], []);
  useMarqueeMotion(rows, 32);

  useGSAP(
    () => {
      if (reduced) return;
      const tl = gsap.timeline({
        scrollTrigger: { trigger: rootRef.current, start: "top 92%", once: true },
      });
      tl.from(".marquee-ghost", { opacity: 0, duration: 0.4, ease: "power2.out" }).from(
        ".tech-pill",
        {
          y: 14,
          scale: 0.86,
          opacity: 0,
          duration: 0.4,
          ease: "back.out(1.4)",
          stagger: { each: 0.02, amount: 0.5 },
          clearProps: "transform,opacity",
        },
        "-=.25",
      );
    },
    { scope: rootRef, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <div className="marquee-section" ref={rootRef}>
      <div className="marquee-ghost" aria-hidden="true">
        <div className="marquee-ghost-track">
          {[0, 1].map((copy) => (
            <span className="marquee-ghost-copy" key={copy}>
              {GHOST_NAMES.map((name) => (
                <span className="marquee-ghost-word" key={name}>
                  {name}
                  <span className="marquee-ghost-sep">✦</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div className="marquee-rows">
        <div className="marquee-row" ref={rowA}>
          {logoIconsList.map(({ Icon, name, link, proof }) => (
            <TechPill key={name} Icon={Icon} name={name} proof={proof} link={link} />
          ))}
          {logoIconsList.map(({ Icon, name, link, proof }) => (
            <TechPill key={name} Icon={Icon} name={name} proof={proof} link={link} />
          ))}
        </div>

        <div className="marquee-row" ref={rowB}>
          {logoIconsList.map(({ Icon, name, link, proof }) => (
            <TechPill key={name} Icon={Icon} name={name} proof={proof} link={link} reversed />
          ))}
          {logoIconsList.map(({ Icon, name, link, proof }) => (
            <TechPill key={name} Icon={Icon} name={name} proof={proof} link={link} reversed />
          ))}
        </div>
      </div>

      <div className="marquee-edge marquee-edge--left" />
      <div className="marquee-edge marquee-edge--right" />
    </div>
  );
};

export default LogoSection;
