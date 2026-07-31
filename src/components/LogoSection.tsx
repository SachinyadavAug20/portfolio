import { useMemo, useRef } from "react";
import { logoIconsList } from "../../constants";
import { useMarqueeMotion } from "../hooks/useMarqueeMotion";
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
  const rows = useMemo(() => [rowA, rowB], []);
  useMarqueeMotion(rows, 32);

  return (
    <div className="marquee-section">
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
