import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { expCards } from "../../constants";
import GlowCard from "../components/GlowCard";
import TitleHeader from "../components/TitleHeader";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "../hooks/useReducedMotion";

gsap.registerPlugin(ScrollTrigger);

const AUTO_MS = 4000;
const RESUME_MS = 7000;

const ExperienceSection = () => {
  const reduced = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0 });
  const hoverRef = useRef(false);
  const pausedUntilRef = useRef(0);
  const [canScroll, setCanScroll] = useState({ prev: false, next: true });
  const [progress, setProgress] = useState(0);

  const updateScroller = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const left = el.scrollLeft;
    setCanScroll({ prev: left > 4, next: left < max - 4 });
    setProgress(max > 0 ? left / max : 0);
  }, []);

  const pauseAuto = useCallback(() => {
    pausedUntilRef.current = Date.now() + RESUME_MS;
  }, []);

  const stepSize = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return 400;
    const entry = el.querySelector<HTMLElement>(".exp-entry");
    const track = el.querySelector<HTMLElement>(".exp-track");
    const gap = track ? parseFloat(getComputedStyle(track).gap) || 32 : 32;
    return (entry?.offsetWidth ?? el.clientWidth * 0.8) + gap;
  }, []);

  const nudge = useCallback(
    (dir: 1 | -1) => {
      const el = scrollerRef.current;
      if (!el) return;
      pauseAuto();
      el.scrollBy({ left: stepSize() * dir, behavior: reduced ? "auto" : "smooth" });
    },
    [pauseAuto, reduced, stepSize],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    pauseAuto();
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
    };
    el.classList.add("is-dragging");
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft = dragRef.current.startScroll - (e.clientX - dragRef.current.startX);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    const el = scrollerRef.current;
    if (!el) return;
    el.classList.remove("is-dragging");
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    updateScroller();
    window.addEventListener("resize", updateScroller);
    return () => window.removeEventListener("resize", updateScroller);
  }, [updateScroller]);

  /* auto-advance carousel: advances one entry per tick while on screen,
     wraps to the start at the end, pauses on hover / drag / wheel / keys */
  useEffect(() => {
    if (reduced) return;
    const el = scrollerRef.current;
    if (!el) return;

    let inView = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
      },
      { threshold: 0.25 },
    );
    io.observe(el);

    const id = window.setInterval(() => {
      if (
        !inView ||
        hoverRef.current ||
        dragRef.current.active ||
        Date.now() < pausedUntilRef.current
      ) {
        return;
      }
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const next = el.scrollLeft + stepSize();
      if (next >= max - 8) el.scrollTo({ left: 0, behavior: "auto" });
      else el.scrollTo({ left: next, behavior: "smooth" });
    }, AUTO_MS);

    return () => {
      io.disconnect();
      window.clearInterval(id);
    };
  }, [reduced, stepSize]);

  useGSAP(() => {
    if (reduced) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(".exp-line", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: "#experience",
          start: "top 80%",
          once: true,
        },
      });

      gsap.from(".exp-entry", {
        y: 40,
        opacity: 0,
        duration: 0.5,
        stagger: 0.12,
        ease: "power2.out",
        scrollTrigger: {
          trigger: "#experience",
          start: "top 75%",
          once: true,
        },
      });
    });
    return () => mm.revert();
  }, [reduced]);

  return (
    <section
      id="experience"
      className="w-full md:mt-40 mt-20 section-padding md:px-0"
    >
      <div className="w-full h-full md:px-20">
        <TitleHeader title="Experience" sub="My CS Experience" />
      </div>

      <div
        ref={scrollerRef}
        className="exp-scroller"
        onScroll={updateScroller}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerEnter={() => {
          hoverRef.current = true;
        }}
        onPointerLeave={() => {
          hoverRef.current = false;
        }}
        onWheel={pauseAuto}
        onKeyDown={pauseAuto}
        onDragStart={(e) => e.preventDefault()}
        role="region"
        aria-label="Experience timeline"
        tabIndex={0}
      >
        <div className="exp-track">
          <div className="exp-line" aria-hidden="true" />
          {expCards.map((exp, i) => (
            <div key={exp.title} className="exp-entry exp-card-wrapper">
              <div className="exp-node-zone">
                <div className="timeline-logo">
                  <img
                    src={exp.logoPath}
                    alt="logo"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
              <GlowCard card={exp} index={i}>
                <div className="exp-card-row">
                  <div className="exp-card-illu">
                    <img
                      src={exp.imgPath}
                      alt={exp.title}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-lg xl:text-xl leading-snug">
                      {exp.title}
                    </h2>
                    <p className="mt-1 text-xs text-white-50">{exp.date}</p>
                    <p className="mt-3 text-xs italic text-blue-50">
                      Responsibities
                    </p>
                    <ul className="list-disc ms-4 mt-1.5 flex flex-col gap-1.5 text-white-50">
                      {exp.responsibilities.map((responsibility) => (
                        <li key={responsibility} className="text-xs sm:text-sm leading-relaxed">
                          {responsibility}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </GlowCard>
            </div>
          ))}
        </div>
      </div>

      <div className="exp-controls">
        <button
          type="button"
          onClick={() => nudge(-1)}
          disabled={!canScroll.prev}
          aria-label="Scroll experience timeline left"
          className="exp-arrow"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <div className="exp-progress" aria-hidden="true">
          <div
            className="exp-progress-fill"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
        <button
          type="button"
          onClick={() => nudge(1)}
          disabled={!canScroll.next}
          aria-label="Scroll experience timeline right"
          className="exp-arrow"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
};

export default ExperienceSection;
