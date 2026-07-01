import LogoSection from "./components/LogoSection";
import Navbar from "./components/Navbar";
import Hero from "./sections/Hero";
import ShowCaseSection from "./sections/ShowCaseSection";

const app = () => {
  return (
    <>
    <Navbar/>
    <Hero/>
    <ShowCaseSection/>
    <LogoSection/>
    </>
  );
};

export default app;
