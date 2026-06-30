import { words } from "../../constants/";
import AnimatedCounter from "../components/AnimatedCounter";
import Button from "../components/Button";
import HeroExperience from "../components/HeroModels/HeroExperience";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const Hero = () => {
  useGSAP(()=>{
    gsap.fromTo('.hero-text h1',{
      y:50,
      opacity:0,
    },{
      y:0,
      opacity:1,
      stagger:0.2,
      duration:1,
      ease:"back.out(2)"
    })
  })
  return (
    <section id="hero" className="relative overflow-hidden">
      <div className="absolute top-0 left-0 z-10">
        <img src="/images/bg.png" alt="hero" />
      </div>
      <div className="hero-layout">
        <header className="flex flex-col justify-center md:w-full w-screen md:px-20 px-5">
          <div className="flex flex-col gap-7">
            <div className="hero-text">
              <h1>
                Engineering
                <span className="slide">
                  <span className="wrapper">
                    {words.map((word) => (
                      <span
                        key={word.text}
                        className="flex items-center md:gap-3 gap-1 pb-2 justify-start"
                      >
                        <img
                          src={word.imgPath}
                          alt={word.text}
                          className="xl:size-12 invert-0 md:size-10 size-7 md:p-0! pt-0!"
                        />
                        <span>{word.text}</span>
                      </span>
                    ))}
                  </span>
                </span>
              </h1>
              {/* animated text: robust logic, scalable systems, complex algorithms */}
              <h1>into Seamless Experiences</h1>
              <h1>that Perform at scale</h1>
            </div>
            <p className="text-white-50 md:text-xl relative z-10 pointer-events-none">
              Hi, I'm Sachin, a developer based in India with a passion for
              code.
            </p>
            <Button text="See my work" className="md:w-80 md:h-16 w-60 h-12" />
          </div>
        </header>
        <figure>
          <div className="hero-3d-layout border-gray-900  border-[1px]">
            <HeroExperience />
          </div>
        </figure>
      </div>
      <AnimatedCounter/>
    </section>
  );
};

export default Hero;
