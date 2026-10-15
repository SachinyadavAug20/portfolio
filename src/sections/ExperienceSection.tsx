import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { expCards } from "../../constants";
import GlowCard from "../components/GlowCard";
import TitleHeader from "../components/TitleHeader";
import { gsap } from "../lib/gsapSetup";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "../hooks/useReducedMotion";

/* Desktop: a plain horizontal carousel — GSAP-animated track translation
   driven by arrows and drag. Vertical page scroll is never hijacked and the
   section is never pinned. Navigation is positional (distinct snap points),
   so wide viewports that clamp several cards onto the same offset never get
   dead arrow clicks. Mobile stays the vertical left-rail list. */

const ExperienceSection = () => {
  const reduced = useReducedMotion();

  const sectionRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const xRef = useRef(0);
  const [canScroll, setCanScroll] = useState({ prev: false, next: true });
  const [active, setActive] = useState(0);

  const setFill = useCallback((p: number) => {
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${p})`;
  }, []);

  const setCan = useCallback((prev: boolean, next: boolean) => {
    setCanScroll((c) => (c.prev === prev && c.next === next ? c : { prev, next }));
  }, []);

  const metrics = useCallback(() => {
    const track = trackRef.current;
    const scroller = scrollerRef.current;
    if (!track || !scroller) return { pad: 0, travel: 0, positions: [] as number[] };
    const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    const travel = Math.max(0, track.scrollWidth - scroller.clientWidth);
    const entries = Array.from(track.querySelectorAll<HTMLElement>(".exp-entry"));
    const positions = entries.map((el) =>
      Math.min(Math.max(el.offsetLeft - pad, 0), travel),
    );
    return { pad, travel, positions };
  }, []);

  const goToX = useCallback(
    (x: number, instant = false) => {
      const track = trackRef.current;
      const { travel, positions } = metrics();
      if (!track) return;
      const clamped = Math.min(Math.max(x, 0), travel);
      xRef.current = clamped;
      setFill(travel > 0 ? clamped / travel : 0);
      setCan(clamped > 8, clamped < travel - 8);
      let nearest = 0;
      for (let i = 0; i < positions.length; i++) {
        if (Math.abs(positions[i] - clamped) < Math.abs(positions[nearest] - clamped)) {
          nearest = i;
        }
      }
      setActive(nearest);
      if (instant || reduced) {
        gsap.killTweensOf(track);
        gsap.set(track, { x: -clamped });
      } else {
        gsap.to(track, { x: -clamped, duration: 0.65, ease: "power3.out", overwrite: true });
      }
    },
    [metrics, reduced, setFill, setCan],
  );

  /* step to the next/prev DISTINCT snap position (clamped offsets often
     collapse several cards onto one x on wide viewports) */
  const step = useCallback(
    (dir: 1 | -1) => {
      const { positions } = metrics();
      const x = xRef.current;
      if (dir > 0) {
        const target = positions.find((p) => p > x + 8);
        if (target != null) goToX(target);
      } else {
        const target = [...positions].reverse().find((p) => p < x - 8);
        if (target != null) goToX(target);
      }
    },
    [metrics, goToX],
  );

  useGSAP(
    () => {
      const track = trackRef.current;
      const scroller = scrollerRef.current;
      if (!track || !scroller) return;

      if (!reduced) {
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
          y: 30,
          opacity: 0,
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: "#experience",
            start: "top 75%",
            once: true,
          },
        });
      }

      /* drag to scrub the carousel; release snaps to the nearest card */
      let dragging = false;
      let startX = 0;
      let startOffset = 0;
      const onDown = (e: PointerEvent) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        dragging = true;
        startX = e.clientX;
        startOffset = xRef.current;
        gsap.killTweensOf(track);
        scroller.classList.add("is-dragging");
      };
      const onMove = (e: PointerEvent) => {
        if (!dragging) return;
        const { travel } = metrics();
        const x = Math.min(
          Math.max(startOffset - (e.clientX - startX), 0),
          travel,
        );
        xRef.current = x;
        gsap.set(track, { x: -x });
        setFill(travel > 0 ? x / travel : 0);
      };
      const onUp = () => {
        if (!dragging) return;
        dragging = false;
        scroller.classList.remove("is-dragging");
        const { positions } = metrics();
        const x = xRef.current;
        let target = positions[0] ?? 0;
        for (const p of positions) {
          if (Math.abs(p - x) < Math.abs(target - x)) target = p;
        }
        goToX(target);
      };
      const onResize = () => goToX(xRef.current, true);

      scroller.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      window.addEventListener("resize", onResize);
      return () => {
        scroller.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        window.removeEventListener("resize", onResize);
      };
    },
    { dependencies: [reduced, goToX], scope: sectionRef },
  );

  /* widths can settle after fonts/images — re-clamp once loaded */
  useEffect(() => {
    const refresh = () => goToX(xRef.current, true);
    window.addEventListener("load", refresh);
    return () => window.removeEventListener("load", refresh);
  }, [goToX]);

  return (
    <section
      ref={sectionRef}
      id="experience"
      className="w-full md:mt-40 mt-20 section-padding md:px-0"
    >
      <div className="w-full md:px-20">
        <TitleHeader title="Experience" sub="My CS Experience" />
      </div>

      <div
        ref={scrollerRef}
        className="exp-scroller"
        role="region"
        aria-label="Experience timeline"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            step(1);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            step(-1);
          }
        }}
      >
        <div ref={trackRef} className="exp-track">
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
                    <h2 className="font-semibold text-lg xl:text-xl leading-snug tracking-tight">
                      {exp.title}
                    </h2>
                    <p className="exp-date">{exp.date}</p>
                    <p className="exp-label">Responsibilities</p>
                    <ul className="exp-bullets">
                      {exp.responsibilities.map((responsibility) => (
                        <li key={responsibility}>{responsibility}</li>
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
          onClick={() => step(-1)}
          disabled={!canScroll.prev}
          aria-label="Scroll experience timeline left"
          className="exp-arrow"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <div className="exp-progress" aria-hidden="true">
          <div ref={fillRef} className="exp-progress-fill" />
        </div>
        <span className="exp-count" aria-live="polite" aria-atomic="true">
          {String(active + 1).padStart(2, "0")} / {String(expCards.length).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={() => step(1)}
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
