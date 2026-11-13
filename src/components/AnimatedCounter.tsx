import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { GitPullRequest } from "lucide-react";
import { counterItems } from "../../constants";
import { fetchLiveStats } from "../lib/stats";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { tap } from "../lib/haptics";
import PrModal from "./PrModal";

const CounterItem = ({
  value,
  suffix,
  text,
  url,
  isModal,
  className = "",
  onOpenModal,
}: {
  value: number;
  suffix: string;
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
    { dependencies: [value, reduced], revertOnUpdate: true },
  );

  const cardContent = (
    <div
      className="counter-tile group relative rounded-xl p-3.5 sm:p-4 md:p-5 lg:p-4 xl:p-6 flex flex-col justify-center mt-2 min-w-0 transition-transform active:scale-[0.98]"
      style={{
        backgroundColor: "var(--counter-bg)",
        color: "var(--counter-text)",
        border: "1px solid var(--counter-border)",
      }}
    >
      <div className="counter-number text-2xl sm:text-3xl md:text-3xl xl:text-4xl font-bold mb-1 flex items-baseline justify-between">
        <span>
          <span ref={numRef}>0</span>
          {suffix}
        </span>
        {isPr && (
          <GitPullRequest
            className="size-3.5 sm:size-4 opacity-40 group-hover:opacity-90 transition-opacity shrink-0"
            style={{ color: "var(--counter-muted)" }}
            aria-hidden="true"
          />
        )}
      </div>
      <div
        style={{ color: "var(--counter-muted)" }}
        className="text-xs sm:text-sm md:text-xs xl:text-sm leading-snug"
      >
        {text}
      </div>
    </div>
  );

  if (isPr) {
    return (
      <button
        type="button"
        onClick={() => {
          tap(8);
          onOpenModal?.();
        }}
        className={`block text-left w-full cursor-pointer focus:outline-none ${className}`}
        aria-label="View Open Source Pull Requests"
      >
        {cardContent}
      </button>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`block text-left ${className}`}
    >
      {cardContent}
    </a>
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

  return (
    <>
      <div id="counter" className="w-full padding-x-lg py-4 sm:py-6 relative z-10 clear-both">
        <div className="mx-auto grid-counter">
          {items.map((item, idx) => (
            <CounterItem
              key={item.text}
              {...item}
              className={idx === 4 ? "col-span-2 sm:col-span-1" : ""}
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
