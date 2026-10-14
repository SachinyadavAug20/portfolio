import { useEffect } from "react";
import SEOHead from "../seo/SEOHead";
import { SITE_TITLE, SITE_DESCRIPTION, SECTION_SEO } from "../seo/config";
import { buildHomeGraph } from "../lib/schema";
import { refreshSmoothScroll, scrollToY } from "../lib/smoothScroll";
import LogoSection from "../components/LogoSection";
import Contact from "../sections/Contact";
import ExperienceSection from "../sections/ExperienceSection";
import FeatureCards from "../sections/FeatureCards";
import Hero from "../sections/Hero";
import ShowCaseSection from "../sections/ShowCaseSection";
import TechStack from "../sections/TechStack";

const HomePage = ({ section }: { section?: string }) => {
  const seo = section ? SECTION_SEO[section] : undefined;

  /* mirror route entered directly (fresh load) — App's route-change effect
     skips the first navigation, so the section scroll happens here */
  useEffect(() => {
    if (!section) return;
    refreshSmoothScroll();
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(section);
      if (el) scrollToY(el.getBoundingClientRect().top + window.scrollY);
    });
    return () => cancelAnimationFrame(raf);
  }, [section]);

  return (
    <>
      <SEOHead
        title={seo?.title ?? SITE_TITLE}
        description={seo?.description ?? SITE_DESCRIPTION}
        path={section ? `/${section}` : "/"}
        jsonLd={seo ? undefined : buildHomeGraph()}
      />
      <Hero />
      <ShowCaseSection />
      <LogoSection />
      <FeatureCards />
      <ExperienceSection />
      <TechStack />
      <Contact />
    </>
  );
};

export default HomePage;
