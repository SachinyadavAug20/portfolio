import TitleHeader from "../components/TitleHeader";
import ContactExperience from "../components/ContactModels/ContactExperience";

const Contact = () => {
  return (
    <section id="contact" className="flex-center section-padding">
      <div className="w-full h-full px-5 md:px-10">
        <TitleHeader title="Contact Me" sub="Get in touch" />
        <div className="grid-12-cols mt-10 xl:mt-16">
          <div className="xl:col-span-5">
            <div className="flex-center card-border rounded-xl p-10">
              <form
                className="w-full flex flex-col gap-7"
                onSubmit={(e) => {
                  e.preventDefault();
                  alert("Message sent!");
                  console.log(e);
                }}
              >
                <label>Name</label>
                <input type="text" placeholder="Your Name" />
                <label>Email</label>
                <input type="email" placeholder="your@email.com" />
                <label>Message</label>
                <textarea rows={5} placeholder="Your message..." />
                <button type="submit">
                  <div className="cta-button group">
                    <div className="bg-circle" />
                    <p className="text"> Send Message </p>
                    <div className="arrow-wrapper">
                      <img src="/images/arrow-down.svg" alt="arrow" />
                    </div>
                  </div>
                </button>
              </form>
            </div>
          </div>
          <div className="xl:col-span-7 min-h-9">
            <ContactExperience />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
