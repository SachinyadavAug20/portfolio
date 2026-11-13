import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { GitPullRequest, ExternalLink } from "lucide-react";
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
  onOpenModal,
}: {
  value: number;
  suffix: string;
  text: string;
  url: string;
  isModal?: boolean;
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
      className={`counter-tile rounded-xl p-3.5 sm:p-4 md:p-5 lg:p-4 xl:p-6 flex flex-col justify-center mt-2 min-w-0 transition-transform active:scale-[0.98] ${
        isPr
          ? "col-span-2 md:col-span-1 border-purple-500/40! bg-gradient-to-br from-purple-50/70 via-[var(--counter-bg)] to-purple-100/50 dark:from-purple-950/30 dark:via-[var(--counter-bg)] dark:to-purple-900/20 shadow-sm"
          : ""
      }`}
      style={{
        backgroundColor: "var(--counter-bg)",
        color: "var(--counter-text)",
        border: "1px solid var(--counter-border)",
      }}
    >
      <div className="counter-number text-2xl sm:text-3xl md:text-3xl xl:text-4xl font-bold mb-1">
        <span ref={numRef}>0</span>
        {suffix}
      </div>
      <div
        style={{ color: "var(--counter-muted)" }}
        className="text-xs sm:text-sm md:text-xs xl:text-sm leading-snug"
      >
        {text}
      </div>
      {isPr && (
        <div className="mt-2.5">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-600/15 dark:bg-purple-500/20 hover:bg-purple-600/25 border border-purple-500/35 text-purple-700 dark:text-purple-300 text-[11px] sm:text-xs font-semibold transition-all active:scale-95 touch-manipulation cursor-pointer group-hover:border-purple-400 shadow-xs"
          >
            <GitPullRequest className="size-3 text-purple-700 dark:text-purple-300" />
            <span>View PRs</span>
            <ExternalLink className="size-2.5 opacity-70" />
          </span>
        </div>
      )}
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
        className="text-left w-full cursor-pointer focus:outline-none col-span-2 md:col-span-1"
        aria-label="View Open Source Pull Requests"
      >
        {cardContent}
      </button>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="block text-left">
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
