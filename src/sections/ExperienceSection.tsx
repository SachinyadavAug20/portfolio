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

const ExperienceSection = () => {
  const reduced = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0 });
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

  const nudge = useCallback((dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const entry = el.querySelector<HTMLElement>(".exp-entry");
    const step = (entry?.offsetWidth ?? el.clientWidth * 0.8) + 48;
    el.scrollBy({ left: step * dir, behavior: "smooth" });
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
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
                <div>
                  <img
                    src={exp.imgPath}
                    alt={exp.title}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </GlowCard>
              <div className="exp-text-column">
                <h2 className="font-semibold text-3xl">{exp.title}</h2>
                <p className="my-5 text-white-50">{exp.date}</p>
                <p className="text-blue-50 italic">Responsibities</p>
                <ul className="list-disc ms-5 mt-5 flex flex-col gap-5 text-white-50">
                  {exp.responsibilities.map((responsibility) => (
                    <li key={responsibility} className="text-lg">
                      {responsibility}
                    </li>
                  ))}
                </ul>
              </div>
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
