import { words } from "../../constants/";
import AnimatedCounter from "../components/AnimatedCounter";
import Button from "../components/Button";
import HeroExperience from "../components/HeroModels/HeroExperience";
import RevolvingWords from "../components/RevolvingWords";
import FlickeringText from "../components/FlickeringText";
import { useMediaQuery } from "react-responsive";

const Hero = () => {
  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });

  return (
    <section id="hero" className="relative overflow-hidden">
      <div className="absolute top-0 left-0 z-10">
        <picture>
          <source srcSet="/images/bg.webp" type="image/webp" />
          <img src="/images/bg.png" alt="hero" />
        </picture>
      </div>
      <div className="hero-layout">
        <header className="flex flex-col justify-center md:w-full w-full md:px-20 px-5">
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
            <p className="text-white-50 md:text-xl relative z-10 pointer-events-none">
              Hi, I'm Sachin, a developer based in India with a passion for
              code.
            </p>
            <Button
              text="See my work"
              className="md:w-80 md:h-16 w-60 h-12"
              id="counter"
            />
          </div>
        </header>
        {!isMobile && (
          <figure>
            <div className="hero-3d-layout border-zinc-950 border-[0px] rounded-4xl mt-5 mr-2 block">
              <HeroExperience />
            </div>
          </figure>
        )}
      </div>
      <AnimatedCounter />
    </section>
  );
};

export default Hero;
