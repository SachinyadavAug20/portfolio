import LogoSection from "./components/LogoSection";
import Navbar from "./components/Navbar";
import FeatureCards from "./sections/FeatureCards";
import Hero from "./sections/Hero";
import ShowCaseSection from "./sections/ShowCaseSection";

const app = () => {
  return (
    <>
    <Navbar/>
    <Hero/>
    <ShowCaseSection/>
    <LogoSection/>
    <FeatureCards/>
    </>
  );
};

export default app;
