import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { counterItems } from "../../constants";
import { fetchLiveStats } from "../lib/stats";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { tap } from "../lib/haptics";
import PrModal from "./PrModal";

const CounterItem = ({
  value,
  text,
  url,
  isModal,
  className = "",
  onOpenModal,
}: {
  value: number;
  text: string;
  url: string;
  isModal?: boolean;
  className?: string;
  onOpenModal?: () => void;
}) => {
  const numRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const isPr = isModal || text === "Open-Source PRs";

  useGSAP(
    () => {
      const el = numRef.current;
      if (!el) return;

      if (reduced) {
        el.textContent = String(value);
        return;
      }

      const obj = { val: 0 };
      const tween = gsap.to(obj, {
        val: value,
        duration: 1,
        ease: "power2.out",
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
    { dependencies: [value, reduced], revertOnUpdate: true },
  );

  const handleClick = () => {
    tap(8);
    if (isModal) {
      onOpenModal?.();
    } else if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`counter-item block text-left focus:outline-none ${className}`}
      aria-label={isPr ? "View Open Source Pull Requests" : text}
    >
      <div className="counter-tile rounded-xl p-3.5 sm:p-4 min-h-[92px] sm:min-h-[104px] flex flex-col justify-between">
        <div className="counter-number text-2xl sm:text-3xl md:text-3xl xl:text-4xl font-semibold mb-1 leading-none flex items-baseline justify-between">
          <span ref={numRef}>0</span>
        </div>
        <div
          style={{ color: "var(--counter-muted)" }}
          className="text-xs sm:text-sm leading-snug"
        >
          {text}
        </div>
      </div>
    </button>
  );
};

const AnimatedCounter = () => {
  const [isPrModalOpen, setIsPrModalOpen] = useState(false);
  const [items, setItems] = useState(() =>
    counterItems.map((item) =>
      item.text === "Problems Solved" ||
      item.text === "Git Commits" ||
      item.text === "Open-Source PRs"
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
          if (item.text === "Open-Source PRs") return { ...item, value: stats.openSourcePrs };
          return item;
        }),
      );
    });
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const tiles = containerRef.current?.querySelectorAll<HTMLElement>(".counter-tile");
      if (!tiles || tiles.length === 0) return;

      gsap.fromTo(
        tiles,
        { y: 16, opacity: 0, scale: 0.98 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.5,
          ease: "power3.out",
          stagger: 0.06,
          clearProps: "transform,opacity,scale",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 92%",
            once: true,
          },
        },
      );
    },
    { scope: containerRef, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <>
      <div id="counter" ref={containerRef} className="w-full padding-x-lg py-4 sm:py-6 relative z-10 clear-both">
        <div className="mx-auto grid-counter">
          {items.map((item) => (
            <CounterItem
              key={item.text}
              {...item}
              onOpenModal={() => setIsPrModalOpen(true)}
            />
          ))}
        </div>
      </div>
      <PrModal isOpen={isPrModalOpen} onClose={() => setIsPrModalOpen(false)} />
    </>
  );
};

export default AnimatedCounter;
