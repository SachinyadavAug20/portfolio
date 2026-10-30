import { useRef } from "react";
import { words } from "../../constants/";
import AnimatedCounter from "../components/AnimatedCounter";
import Button from "../components/Button";
import { lazy, Suspense } from "react";
import RevolvingWords from "../components/RevolvingWords";
import FlickeringText from "../components/FlickeringText";
import { useNearViewport } from "../hooks/useNearViewport";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useIdleReady } from "../hooks/useIdleReady";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { HeroModelPlaceholder } from "../components/HeroModels/HeroModelPlaceholder";

gsap.registerPlugin(ScrollTrigger);

const HeroExperience = lazy(
  () => import("../components/HeroModels/HeroExperience"),
);

const Hero = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  /* Three.js mounts right after first paint without an artificial long freeze */
  const sceneReady = useIdleReady(100);
  const { ref: figureRef, visible: figureVisible } =
    useNearViewport<HTMLDivElement>("100px");

  useGSAP(
    () => {
      if (!reduced) {
        // Lines rise as the splash lifts; flicker text takes over at ~0.6s.
        gsap.from(".hero-text > *", {
          y: 22,
          opacity: 0,
          duration: 0.5,
          delay: 0.45,
          ease: "power2.out",
          stagger: 0.07,
          clearProps: "transform,opacity",
        });
        gsap.from([".hero-sub", ".hero-layout .cta-wrapper"], {
          y: 14,
          opacity: 0,
          duration: 0.45,
          delay: 0.7,
          ease: "power2.out",
          stagger: 0.1,
          clearProps: "transform,opacity",
        });
      }

      // Subtle depth drift on the corner graphic (desktop only, transform-only).
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1280px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.to(".hero-bg", {
          y: 64,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.4,
          },
        });
      });

      return () => mm.revert();
    },
    { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <section id="hero" ref={sectionRef} className="relative overflow-hidden">
      <div className="hero-bg absolute top-0 left-0 z-10">
        <picture>
          <source srcSet="/images/bg.webp" type="image/webp" />
          <img
            src="/images/bg.png"
            alt="hero"
            width={418}
            height={327}
            fetchPriority="high"
            decoding="async"
          />
        </picture>
      </div>
      <div className="hero-layout">
        <header className="flex flex-col justify-center md:w-full w-full xl:max-w-[55%] 2xl:max-w-[52%] px-5 md:pl-20 md:pr-4">
          <div className="flex flex-col gap-7">
            <div className="hero-text">
              <h1>
                <FlickeringText>Engineering </FlickeringText>
                <RevolvingWords items={words} />
              </h1>
              <h2>
                <FlickeringText>into Seamless Experiences</FlickeringText>
              </h2>
              <h2>
                <FlickeringText>that Perform at scale</FlickeringText>
              </h2>
            </div>
            <p className="hero-sub text-sm sm:text-[15px] md:text-base font-light text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl relative z-10 tracking-normal xl:pointer-events-none">
              Hi, I'm <span className="font-medium text-zinc-900 dark:text-zinc-100">Sachin</span>, a 2nd Year Computer Engineering undergraduate building high-performance systems, backend APIs, and interactive 3D web experiences.
            </p>
            <div className="flex flex-wrap items-center gap-4 z-10">
              <Button
                text="See my work"
                className="md:w-72 md:h-16 w-60 h-12"
                id="counter"
              />
              <Button
                text="See my resume"
                href="https://docs.google.com/document/d/1RFTuBerLRMMHeu0Ac4GvaXu7lUuRUDXo/edit?usp=sharing"
                arrowImg="/images/arrow-right.svg"
                arrowAlt="resume link"
                className="md:w-72 md:h-16 w-60 h-12"
              />
            </div>
          </div>
        </header>
        <figure className="w-full xl:w-auto px-5 xl:px-0">
          <div
            ref={figureRef}
            className="hero-3d-layout border-zinc-950 border-[0px] rounded-4xl mt-5 block"
          >
            {sceneReady ? (
              <Suspense fallback={<HeroModelPlaceholder />}>
                <HeroExperience active={figureVisible} />
              </Suspense>
            ) : (
              <HeroModelPlaceholder />
            )}
          </div>
        </figure>
      </div>
      <AnimatedCounter />
    </section>
  );
};

export default Hero;
