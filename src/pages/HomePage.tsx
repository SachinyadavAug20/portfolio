import SEOHead from "../seo/SEOHead";
import { SITE_TITLE, SITE_DESCRIPTION } from "../seo/config";
import { buildHomeGraph } from "../lib/schema";
import { Helmet } from "react-helmet-async";
import LogoSection from "../components/LogoSection";
import Contact from "../sections/Contact";
import ExperienceSection from "../sections/ExperienceSection";
import FeatureCards from "../sections/FeatureCards";
import Hero from "../sections/Hero";
import ShowCaseSection from "../sections/ShowCaseSection";
import TechStack from "../sections/TechStack";

const HomePage = () => {
  return (
    <>
      <SEOHead title={SITE_TITLE} description={SITE_DESCRIPTION} path="/" />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(buildHomeGraph())}
        </script>
      </Helmet>
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
