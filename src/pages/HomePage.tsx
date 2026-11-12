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
  const isSchedule = section === "schedule" || section === "book" || section === "meeting";
  const seo = section ? SECTION_SEO[section] || SECTION_SEO.contact : undefined;

  /* mirror route entered directly (fresh load) — App's route-change effect
     skips the first navigation, so the section scroll happens here */
  useEffect(() => {
    if (!section) return;
    refreshSmoothScroll();
    const targetId = isSchedule ? "schedule" : section;
    let attempts = 0;
    const tryScroll = () => {
      const el = document.getElementById(targetId) || (isSchedule ? document.getElementById("contact") : null);
      if (el) {
        scrollToY(el.getBoundingClientRect().top + window.scrollY);
      } else if (attempts < 10) {
        attempts++;
        setTimeout(tryScroll, 40);
      }
    };
    const raf = requestAnimationFrame(tryScroll);
    return () => cancelAnimationFrame(raf);
  }, [section, isSchedule]);

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
      <Contact initialMode={isSchedule ? "meeting" : undefined} />
    </>
  );
};

export default HomePage;
