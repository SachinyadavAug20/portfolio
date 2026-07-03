import { testimonials } from "../../constants";
import GlowCard from "../components/GlowCard";
import TitleHeader from "../components/TitleHeader";

const Testimonials = () => {
  return (
    <section id="testimonials" className="flex-center section-padding">
      <div className="w-full h-full md:px-10 px-5">
        <TitleHeader title="What people say about me" sub="Testimonials" />
        <div className="lg:columns-3 md:columns-2 columns-1 mt-16">
          {testimonials.map((item, i) => (
            <GlowCard card={item} index={i}>
              <div className="flex items-center gap-3">
                <div>
                  <img
                    src={item.imgPath}
                    alt={item.name}
                    className="w-16 h-16"
                  />
                </div>
                <p className="font-bold">{item.name}</p>
                <p className="text-white-50">{item.mentions}</p>
              </div>
            </GlowCard>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
