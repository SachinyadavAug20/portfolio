import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { expCards } from "../../constants";
import GlowCard from "../components/GlowCard";
import TitleHeader from "../components/TitleHeader";
import { gsap, ScrollTrigger } from "../lib/gsapSetup";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useIsMobile } from "../hooks/useIsMobile";

/* Desktop is a pinned scroll-scrub gallery: vertical page scroll drives the
   rail horizontally (sticky pin + ScrollTrigger scrub, Lenis-friendly).
   Mobile stays the vertical left-rail list. Reduced motion on desktop falls
   back to a plain overflow-x carousel driven by the arrows. */

const ExperienceSection = () => {
  const reduced = useReducedMotion();
  const isMobile = useIsMobile();
  const scrubMode = !isMobile && !reduced;

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const mainSTRef = useRef<ScrollTrigger | null>(null);
  const canRef = useRef({ prev: false, next: true });
  const [canScroll, setCanScroll] = useState({ prev: false, next: true });

  const setFill = useCallback((p: number) => {
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${p})`;
  }, []);

  const setCan = useCallback((prev: boolean, next: boolean) => {
    if (canRef.current.prev !== prev || canRef.current.next !== next) {
      canRef.current = { prev, next };
      setCanScroll({ prev, next });
    }
  }, []);

  const stepSize = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return 400;
    const entry = el.querySelector<HTMLElement>(".exp-entry");
    const track = el.querySelector<HTMLElement>(".exp-track");
    const gap = track ? parseFloat(getComputedStyle(track).gap) || 32 : 32;
    return (entry?.offsetWidth ?? el.clientWidth * 0.8) + gap;
  }, []);

  /* scrub mode: scroll the WINDOW to the offset that maps a card to the
     rail's left inset — the scrub tween is the single source of truth */
  const goTo = useCallback(
    (dir: 1 | -1) => {
      const scroller = scrollerRef.current;
      const track = trackRef.current;
      if (!scroller || !track) return;
      const st = mainSTRef.current;
      if (st) {
        const travel = track.scrollWidth - scroller.clientWidth;
        if (travel <= 0) return;
        const entries = Array.from(
          track.querySelectorAll<HTMLElement>(".exp-entry"),
        );
        if (!entries.length) return;
        const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
        const curX = st.progress * travel;
        let idx = 0;
        for (let i = 0; i < entries.length; i++) {
          if (entries[i].offsetLeft - pad <= curX + 8) idx = i;
        }
        const target = Math.min(Math.max(idx + dir, 0), entries.length - 1);
        const targetX = Math.min(
          Math.max(entries[target].offsetLeft - pad, 0),
          travel,
        );
        const p = targetX / travel;
        window.scrollTo({
          top: st.start + p * (st.end - st.start),
          behavior: "smooth",
        });
      } else {
        scroller.scrollBy({ left: stepSize() * dir, behavior: "auto" });
      }
    },
    [stepSize],
  );

  /* reduced-motion desktop: native overflow-x carousel, arrows + progress */
  useEffect(() => {
    if (scrubMode || isMobile) return;
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const left = el.scrollLeft;
      setFill(max > 0 ? left / max : 0);
      setCan(left > 4, left < max - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [scrubMode, isMobile, setFill, setCan]);

  useGSAP(
    () => {
      if (reduced) return;
      const mm = gsap.matchMedia();

      /* --- desktop: sticky pin + scroll-scrub gallery --- */
      mm.add(
        "(prefers-reduced-motion: no-preference) and (min-width: 768px)",
        () => {
          const stage = stageRef.current;
          const scroller = scrollerRef.current;
          const track = trackRef.current;
          if (!stage || !scroller || !track) return;

          const getTravel = () =>
            Math.max(0, track.scrollWidth - scroller.clientWidth);
          const setStageHeight = () => {
            stage.style.setProperty(
              "--exp-stage-h",
              `${window.innerHeight + getTravel()}px`,
            );
          };
          setStageHeight();
          window.addEventListener("resize", setStageHeight);

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

          const tween = gsap.to(track, {
            x: () => -getTravel(),
            ease: "none",
            scrollTrigger: {
              trigger: stage,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.45,
              invalidateOnRefresh: true,
              onRefresh(self) {
                mainSTRef.current = self;
                setFill(self.progress);
                setCan(self.progress > 0.015, self.progress < 0.985);
              },
              onUpdate(self) {
                mainSTRef.current = self;
                setFill(self.progress);
                setCan(self.progress > 0.015, self.progress < 0.985);
              },
            },
          });

          gsap.utils.toArray<HTMLElement>(".exp-entry").forEach((entry) => {
            gsap.from(entry, {
              opacity: 0,
              y: 30,
              duration: 0.45,
              ease: "power2.out",
              scrollTrigger: {
                trigger: entry,
                containerAnimation: tween,
                start: "left 88%",
                toggleActions: "play none none reverse",
              },
            });
          });

          return () => {
            window.removeEventListener("resize", setStageHeight);
            mainSTRef.current = null;
          };
        },
      );

      /* --- mobile: vertical rail, one-shot line + card stagger --- */
      mm.add(
        "(prefers-reduced-motion: no-preference) and (max-width: 767px)",
        () => {
          gsap.from(".exp-line", {
            scaleY: 0,
            transformOrigin: "center top",
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
        },
      );

      return () => mm.revert();
    },
    { dependencies: [reduced], scope: sectionRef },
  );

  /* heights can settle after fonts/images — re-measure once loaded */
  useEffect(() => {
    if (!scrubMode) return;
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    return () => window.removeEventListener("load", refresh);
  }, [scrubMode]);

  return (
    <section
      ref={sectionRef}
      id="experience"
      className="w-full md:mt-40 mt-20 section-padding md:px-0"
    >
      <div ref={stageRef} className="exp-stage">
        <div className="exp-pin">
          <div className="w-full md:px-20">
            <TitleHeader title="Experience" sub="My CS Experience" />
          </div>

          <div
            ref={scrollerRef}
            className="exp-scroller"
            role="region"
            aria-label="Experience timeline"
            tabIndex={0}
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
                        <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.12em] text-white-50/70">
                          {exp.date}
                        </p>
                        <p className="mt-3 text-[11px] font-mono uppercase tracking-[0.14em] text-blue-50">
                          Responsibilities
                        </p>
                        <ul className="list-disc ms-4 mt-1.5 flex flex-col gap-1.5 text-white-50">
                          {exp.responsibilities.map((responsibility) => (
                            <li
                              key={responsibility}
                              className="text-[13px] leading-relaxed"
                            >
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
              onClick={() => goTo(-1)}
              disabled={!canScroll.prev}
              aria-label="Scroll experience timeline left"
              className="exp-arrow"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <div className="exp-progress" aria-hidden="true">
              <div ref={fillRef} className="exp-progress-fill" />
            </div>
            <button
              type="button"
              onClick={() => goTo(1)}
              disabled={!canScroll.next}
              aria-label="Scroll experience timeline right"
              className="exp-arrow"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExperienceSection;
