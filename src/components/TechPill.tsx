import { useState, type ComponentType } from "react";

type TechPillProps = {
  Icon: ComponentType<{ className?: string }>;
  name: string;
  proof: string;
  link: string;
  reversed?: boolean;
};

const SCRAMBLE_CHARS = "!<>-_\\/[]{}—=+*^?#";

const scrambleName = (name: string) =>
  name
    .split("")
    .map(
      (ch, i) =>
        ch === " " ||
        i % 4 === 3 ||
        (i === name.length - 1)
          ? ch
          : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)],
    )
    .join("");

export const TechPill = ({ Icon, name, proof, link, reversed }: TechPillProps) => {
  const [displayName, setDisplayName] = useState(name);

  const handleEnter = () => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      let iterations = 0;
      const interval = window.setInterval(() => {
        setDisplayName(scrambleName(name));
        iterations += 1;
        if (iterations >= 4) {
          window.clearInterval(interval);
          setDisplayName(name);
        }
      }, 60);
    }
  };

  const handleLeave = () => {
    setDisplayName(name);
  };

  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      className="tech-pill"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <span className="tech-pill-body">
        <Icon className="tech-pill-icon" />
        <span className="tech-pill-name">{displayName}</span>
      </span>
      <span className="tech-pill-proof">
        <span
          className={
            reversed
              ? "tech-pill-proof-inner tech-pill-proof-inner--reversed"
              : "tech-pill-proof-inner"
          }
        >
          {proof}
        </span>
      </span>
    </a>
  );
};
