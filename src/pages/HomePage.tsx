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
