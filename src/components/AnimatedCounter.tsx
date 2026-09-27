import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { counterItems } from "../../constants";
import { fetchLiveStats } from "../lib/stats";

const CounterItem = ({
  value,
  suffix,
  text,
  url,
}: {
  value: number;
  suffix: string;
  text: string;
  url: string;
}) => {
  const numRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = numRef.current;
      if (!el) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.textContent = String(value);
        return;
      }

      const obj = { val: 0 };
      const tween = gsap.to(obj, {
        val: value,
        duration: 1,
        ease: "power2.out",
        // Direct DOM write instead of setState — no React re-render per frame.
        onUpdate: () => {
          el.textContent = String(Math.floor(obj.val));
        },
        onComplete: () => {
          el.textContent = String(value);
        },
      });
      return () => {
        tween.kill();
      };
    },
    { dependencies: [value], revertOnUpdate: true },
  );

  return (
    <a href={url}>
      <div
        className="counter-tile rounded-xl p-4! sm:p-5! md:p-8! xl:p-10! flex flex-col justify-center mt-2 min-w-0"
        style={{
          backgroundColor: "var(--counter-bg)",
          color: "var(--counter-text)",
          border: "1px solid var(--counter-border)",
        }}
      >
        <div className="counter-number text-2xl sm:text-3xl md:text-4xl xl:text-5xl font-bold mb-1 md:mb-2">
          <span ref={numRef}>0</span>
          {suffix}
        </div>
        <div style={{ color: "var(--counter-muted)" }} className="text-xs sm:text-sm md:text-base xl:text-lg leading-snug">
          {text}
        </div>
      </div>
    </a>
  );
};

const AnimatedCounter = () => {
  const [items, setItems] = useState(() =>
    counterItems.map((item) =>
      item.text === "Problems Solved" || item.text === "Git Commits"
        ? { ...item, value: 0 }
        : item,
    ),
  );

  useEffect(() => {
    fetchLiveStats().then((stats) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.text === "Problems Solved") return { ...item, value: stats.leetcodeSolved };
          if (item.text === "Git Commits") return { ...item, value: stats.gitCommits };
          return item;
        }),
      );
    });
  }, []);

  return (
    <div id="counter" className="padding-x-lg xl:mt-0 mt-10">
      <div className="mx-auto grid-4-cols">
        {items.map((item) => (
          <CounterItem key={item.text} {...item} />
        ))}
      </div>
    </div>
  );
};

export default AnimatedCounter;
