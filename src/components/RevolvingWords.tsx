import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

type Word = { text: string; imgPath: string };

const TICK = 0.32;
const DWELL = 0.28;
const END_PAUSE = 0.65;
const BLUR = 8;

const RevolvingWords = ({ items }: { items: Word[] }) => {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const reelRef = useRef<HTMLDivElement>(null);
  const count = items.length;

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const root = rootRef.current;
    const reel = reelRef.current;
    if (!anchor || !root || !reel) return;

    const words = Array.from(reel.querySelectorAll<HTMLElement>(".word-item"));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let tl: gsap.core.Timeline | null = null;

    const measureAndBuild = () => {
      let step = 0;
      let maxW = 0;
      for (const el of words) {
        step = Math.max(step, el.offsetHeight);
        maxW = Math.max(maxW, el.offsetWidth);
      }
      if (step <= 0 || maxW <= 0) return;
      anchor.style.width = `${maxW + 8}px`;

      tl?.kill();
      tl = gsap.timeline({ repeat: -1 });
      const startC = 3 * count - 1;
      tl.set(reel, { y: -startC * step });

      if (!reducedMotion.matches) {
        const stepFn = (dir: 1 | -1) => {
          const sub = gsap.timeline();
          sub.to(reel, {
            y: `+=${dir * step}`,
            duration: TICK,
            ease: "power3.inOut",
          });
          sub.to(reel, { filter: `blur(${BLUR}px)`, duration: TICK / 2, ease: "none" }, 0);
          sub.to(reel, { filter: "blur(0px)", duration: TICK / 2, ease: "none" }, TICK / 2);
          tl!.add(sub);
        };
        const dwell = () => tl!.to({}, { duration: DWELL });

        for (let i = 0; i < count; i++) {
          stepFn(1);
          if (i < count - 1) dwell();
        }
        tl.to({}, { duration: END_PAUSE });
        for (let i = 0; i < count; i++) {
          stepFn(-1);
          if (i < count - 1) dwell();
        }
        tl.to({}, { duration: END_PAUSE });
      }
    };

    measureAndBuild();
    document.fonts?.ready.then(measureAndBuild).catch(() => undefined);
    const onImgLoad = () => measureAndBuild();
    Array.from(reel.querySelectorAll<HTMLImageElement>(".word-item img")).forEach((img) => {
      if (!img.complete) {
        img.addEventListener("load", onImgLoad, { once: true });
        img.addEventListener("error", onImgLoad, { once: true });
      }
    });
    const onResize = () => measureAndBuild();
    window.addEventListener("resize", onResize);

    return () => {
      tl?.kill();
      window.removeEventListener("resize", onResize);
    };
  }, [count]);

  const reel = Array.from({ length: 3 }, () => [...items].reverse()).flat();

  return (
    <span className="hero-revolve-anchor" ref={anchorRef}>
      <span className="hero-revolve" ref={rootRef} aria-hidden="true">
        <div className="reel" ref={reelRef}>
          {reel.map((word, i) => (
            <span className="word-item" key={`${word.text}-${i}`}>
              <img src={word.imgPath} alt="" />
              <span>{word.text}</span>
            </span>
          ))}
        </div>
      </span>
    </span>
  );
};

export default RevolvingWords;
