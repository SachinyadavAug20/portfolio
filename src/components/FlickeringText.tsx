import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

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

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const prefersReduced =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const text = el.textContent || "";
      if (!text.trim()) return;

      el.textContent = "";
      const chars: HTMLSpanElement[] = [];

      for (const ch of text) {
        const span = document.createElement("span");
        span.textContent = ch === " " ? "\u00A0" : ch;
        span.style.display = "inline-block";
        span.style.willChange = "opacity, text-shadow";
        el.appendChild(span);
        chars.push(span);
      }

      if (chars.length === 0) return;

      if (prefersReduced) {
        gsap.set(chars, { opacity: 1 });
        return;
      }

      const tl = gsap.timeline({ delay: 0.8 });

      tl.set(chars, { opacity: 0 });

      chars.forEach((char, i) => {
        const base = i * 0.04;
        const flashes = 3 + Math.floor(Math.random() * 3);

        for (let f = 0; f < flashes; f++) {
          const t = base + f * 0.35;
          tl.to(
            char,
            {
              opacity: gsap.utils.random(0.35, 1),
              textShadow: `0 0 ${gsap.utils.random(12, 32) * glowIntensity}px ${glowColor}`,
              duration: gsap.utils.random(0.2, 0.35),
              ease: "power2.inOut",
            },
            t,
          );
          tl.to(
            char,
            {
              opacity: gsap.utils.random(0, 0.25),
              textShadow: "none",
              duration: gsap.utils.random(0.15, 0.25),
              ease: "power2.inOut",
            },
            t + 0.22,
          );
        }

        tl.to(
          char,
          {
            opacity: 1,
            textShadow: `0 0 ${4 * glowIntensity}px ${glowColor}`,
            duration: 0.5,
            ease: "power3.out",
          },
          base + flashes * 0.35 + 0.15,
        );

        tl.to(
          char,
          {
            textShadow: "none",
            duration: 1.2,
            ease: "power1.inOut",
          },
          base + flashes * 0.35 + 0.65,
        );
      });

      return () => tl.kill();
    },
    { scope: ref },
  );

  return (
    <span ref={ref} className={className}>
      {children}
    </span>
  );
};

export default FlickeringText;
