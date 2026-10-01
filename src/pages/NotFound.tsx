import SEOHead from "../seo/SEOHead";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useGSAP } from "@gsap/react";
import { gsap, SplitText } from "../lib/gsapSetup";
import { useReducedMotion } from "../hooks/useReducedMotion";

const NotFound = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const scope = ref.current;
      if (!scope) return;
      const numEl = scope.querySelector(".nf-num");
      if (!numEl) return;

      const split = new SplitText(numEl, { type: "chars" });
      const tl = gsap.timeline();
      tl.from(split.chars, {
        yPercent: 110,
        opacity: 0,
        duration: 0.5,
        stagger: 0.06,
        ease: "back.out(1.7)",
      })
        .from(
          [".nf-title", ".nf-sub"],
          { y: 14, opacity: 0, duration: 0.4, stagger: 0.08, ease: "power2.out" },
          "-=.25",
        )
        .from(
          ".nf-btn",
          { y: 10, opacity: 0, scale: 0.96, duration: 0.35, ease: "back.out(2)" },
          "-=.15",
        );

      return () => {
        split.revert();
      };
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex" />
      </Helmet>
      <SEOHead title="Page Not Found" description="The page you are looking for does not exist." path={"/404"} />
      <section className="section-padding pt-10 min-h-screen flex-center">
        <div className="text-center" ref={ref}>
          <div className="nf-num text-7xl sm:text-8xl font-black text-white-50/60 select-none">
            404
          </div>
          <h1 className="nf-title mt-6 text-3xl md:text-4xl font-semibold">
            Page not found
          </h1>
          <p className="nf-sub mt-4 text-white-50 text-lg">
            The page you are looking for was moved, removed, or never existed.
          </p>
          <Link
            to="/"
            className="nf-btn inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-full border border-blue-50/40 hover:border-blue-50 hover:bg-blue-50/10 transition-colors"
          >
            &larr; Back to home
          </Link>
        </div>
      </section>
    </>
  );
};

export default NotFound;
