import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface FlickeringTextProps {
  children: string;
  className?: string;
  glowColor?: string;
  glowIntensity?: number;
}

const FlickeringText = ({
  children,
  className = "",
  glowColor = "rgba(98, 224, 255, 0.8)",
  glowIntensity = 1,
}: FlickeringTextProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const text = el.textContent || "";
      if (!text.trim()) return;
      /* reduced motion: keep the plain text — no split needed */
      if (reduced) return;

      el.textContent = "";
      const chars: HTMLSpanElement[] = [];

      /* Split per WORD, not per char:
         - each word is an inline-block with white-space:nowrap, so the line
           only breaks between words (char-level spans let the browser break
           mid-word: "Engin / eering")
         - spaces stay as real text nodes between words — a space inside its
           own inline-block collapses to zero width ("intoSeamlessExperiences") */
      text.split(" ").forEach((word, i) => {
        if (i > 0) el.appendChild(document.createTextNode(" "));
        if (!word) return;
        const wordSpan = document.createElement("span");
        wordSpan.style.display = "inline-block";
        wordSpan.style.whiteSpace = "nowrap";
        for (const ch of word) {
          const span = document.createElement("span");
          span.textContent = ch;
          span.style.display = "inline-block";
          wordSpan.appendChild(span);
          chars.push(span);
        }
        el.appendChild(wordSpan);
      });

      if (chars.length === 0) return;

      const tl = gsap.timeline({ delay: 0.6 });

      tl.set(chars, { opacity: 0 });

      chars.forEach((char, i) => {
        const base = i * 0.03;
        const flashes = 2 + Math.floor(Math.random() * 2);

        for (let f = 0; f < flashes; f++) {
          const t = base + f * 0.18;
          tl.to(
            char,
            {
              opacity: gsap.utils.random(0.4, 1),
              textShadow: `0 0 ${gsap.utils.random(10, 24) * glowIntensity}px ${glowColor}`,
              duration: gsap.utils.random(0.1, 0.18),
              ease: "power2.inOut",
            },
            t,
          );
          tl.to(
            char,
            {
              opacity: gsap.utils.random(0, 0.3),
              textShadow: "none",
              duration: gsap.utils.random(0.1, 0.16),
              ease: "power2.inOut",
            },
            t + 0.12,
          );
        }

        tl.to(
          char,
          {
            opacity: 1,
            textShadow: `0 0 ${3 * glowIntensity}px ${glowColor}`,
            duration: 0.35,
            ease: "power3.out",
          },
          base + flashes * 0.18 + 0.1,
        );

        tl.to(
          char,
          {
            textShadow: "none",
            duration: 0.6,
            ease: "power1.inOut",
          },
          base + flashes * 0.18 + 0.45,
        );
      });

      return () => tl.kill();
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <span ref={ref} className={className}>
      {children}
    </span>
  );
};

export default FlickeringText;
