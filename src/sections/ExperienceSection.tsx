import { expCards } from "../../constants";
import GlowCard from "../components/GlowCard";
import TitleHeader from "../components/TitleHeader";

const ExperienceSection = () => {
  return (
    <section
      id="experience"
      className="w-full md:mt-40 mt-20 section-padding xl:px-0"
    >
      <div className="w-full h-full md:px-20 px-5">
        <TitleHeader title="Experience" sub="My Work Experience" />
        <div className="mt-32 relative">
          <div className="relative z-50 xl:space-y-32 space-y-10">
            {expCards.map((exp, i) => (
              <div key={exp.title} className="exp-card-wrapper">
                <div className="xl:w-1/3">
                  <GlowCard card={exp} index={i}>
                    <div>
                      <img src={exp.imgPath} alt={exp.title} />
                    </div>
                  </GlowCard>
                </div>
                <div className="xl:w-2/3">
                  <div className="flex items-start">
                    <div className="timeline-wrapper">
                      <div className="timeline" />
                      <div className="gradient-line w-1 h-full" />
                    </div>
                    <div className="expText flex xl:gap-20 md:gap-10 gap-5 relative z-20">
                      <div className="timeline-logo">
                        <img src={exp.logoPath} alt="logo" />
                      </div>
                      <div>
                        <h1 className="font-semibold text-3xl">{exp.title}</h1>
                        <p className="my-5 text-white-50">{exp.date}</p>
                        <p className="text-[#839cb5] italic">Responsibities</p>
                        <ul className="list-disc ms-5 mt-5 flex flex-col gap-5 text-white-50">
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExperienceSection;
