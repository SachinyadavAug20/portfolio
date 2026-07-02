import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/all";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const ShowCaseSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const project1Ref = useRef<HTMLDivElement>(null);
  const project2Ref = useRef<HTMLDivElement>(null);
  const project3Ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const projects = [
      project1Ref.current,
      project2Ref.current,
      project3Ref.current,
    ];
    projects.forEach((project, i) => {
      gsap.fromTo(
        project,
        {
          y: 100,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          delay: 0.3 * (i + 1),
          scrollTrigger: {
            trigger: project,
            start: "top bottom-=100",
          },
        },
      );
    });
    gsap.fromTo(
      sectionRef.current,
      {
        opacity: 0,
      },
      {
        opacity: 1,
        duration: 1.5,
      },
    );
  }, []);
  return (
    <section ref={sectionRef} id="work" className="app-showcase">
      <div className="w-full">
        <div className="showcaselayout">
          <div
            id="work-left"
            className="first-project-wrapper"
            ref={project1Ref}
          >
            <a href="https://base-case-nu.vercel.app/">
              <div className="image-wrapper">
                <img src="/images/project1.png" alt="baseCase" />
              </div>
            </a>

            <a href="https://github.com/SachinyadavAug20/BaseCase">
              <div className="text-content">
                <h2 className="text-xl font-bold md:text-3xl mb-4 text-white">
                  A full-stack Q&A platform built for developers.
                </h2>

                <div>
                  <p className="text-white-50 md:text-lg">
                    Features a responsive UI with full MDX support, allowing
                    users to easily write and format complex code snippets.
                  </p>

                  <p className="text-white-50 md:text-lg">
                    A custom engine tracks user interactions to award reputation
                    badges and algorithmically recommend questions based on past
                    activity.
                  </p>

                  <p className="text-white-50 md:text-lg">
                    Secured via OAuth and Zod validation, backed by an
                    optimized, relational MongoDB schema for efficient data
                    querying.
                  </p>
                </div>
              </div>
            </a>
          </div>
          <div id="work-right">
            <div className="project-list-wrapper overflow-hidden w-full">
              <div className="project w-full!" ref={project2Ref}>
                <a href="https://banking-app-nine-jet.vercel.app/">
                  <div className="image-wrapper bg-[#ffefdb] ">
                    <img src="/images/project2.png" alt="Meow mega corp bank" />
                  </div>
                </a>
                <a href="https://github.com/SachinyadavAug20/banking-app">
                  <h2>Meow Mega Corp Bank</h2>
                </a>
              </div>
              <div className="project w-full!" ref={project3Ref}>
                <a href="https://github.com/SachinyadavAug20/Meow">
                  <div className="image-wrapper bg-[#ffefdb] ">
                    <img
                      src="/images/project3.png"
                      alt="Meow terminal AI agent"
                    />
                  </div>
                </a>
                <a href="https://github.com/SachinyadavAug20/Meow">
                  <h2>Meow terminal AI agent</h2>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShowCaseSection;
