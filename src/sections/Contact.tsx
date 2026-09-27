import { lazy, Suspense, useEffect, useRef, useState } from "react";
import TitleHeader from "../components/TitleHeader";
import emailjs from "@emailjs/browser";
import { toast } from "sonner";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useNearViewport } from "../hooks/useNearViewport";

const ContactExperience = lazy(
  () => import("../components/ContactModels/ContactExperience"),
);

const Contact = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const { ref: sceneRef, near: sceneNear, setNear: setSceneNear } =
    useNearViewport<HTMLDivElement>("600px");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (submitted) setSceneNear(true);
  }, [submitted, setSceneNear]);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      gsap.fromTo(
        ".contact-card",
        { y: mobile ? 24 : 32, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: mobile ? 0.3 : 0.45,
          ease: "power2.out",
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: "#contact",
            start: "top 80%",
          },
        },
      );
    },
    { scope: sectionRef },
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!formData.name.trim()) {
        toast.error("Name is required");
        return;
      }
      if (!formData.email.trim()) {
        toast.error("Email is required");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        toast.error("Please enter a valid email");
        return;
      }
      if (!formData.message.trim()) {
        toast.error("Message is required");
        return;
      }
      await emailjs.sendForm(
        import.meta.env.VITE_APP_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_APP_EMAILJS_TEMPLATE_ID,
        formRef.current!,
        import.meta.env.VITE_APP_EMAILJS_PUBLIC_KEY,
      );
      setFormData({ name: "", email: "", message: "" });
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
      toast.success("Message sent successfully!", {
        description: "I will reply you as soon as possible.",
      });
    } catch {
      toast.error("Failed to send message!", {
        description:
          "There might be some issue, please try later or use my email(samtagon777@gmail.com) directly.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" ref={sectionRef} className="flex-center section-padding">
      <div className="w-full h-full md:px-10">
        <TitleHeader title="Contact Me" sub="Get in touch" />
        <div className="grid-12-cols mt-10 xl:mt-16">
          <div className="xl:col-span-5">
            <div className="contact-card flex-center card-border rounded-xl p-6 sm:p-10">
              <form
                ref={formRef}
                className="w-full flex flex-col gap-6"
                onSubmit={handleSubmit}
              >
                <div className="flex flex-col gap-2">
                  <label htmlFor="name">Name</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your Name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    aria-required="true"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    aria-required="true"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="message">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    placeholder="Your message..."
                    value={formData.message}
                    onChange={handleChange}
                    required
                    aria-required="true"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="transition-opacity disabled:opacity-60 disabled:cursor-wait"
                >
                  <div className="cta-button group">
                    <div className="bg-circle" />
                    <p className="text">
                      {" "}
                      {loading ? "Sending..." : "Send Message"}{" "}
                    </p>
                    <div className="arrow-wrapper">
                      <img src="/images/arrow-down.svg" alt="arrow" />
                    </div>
                  </div>
                </button>
              </form>
            </div>
          </div>
          <div className="xl:col-span-7 min-h-96">
            <div
              ref={sceneRef}
              className="w-full h-full bg-[#cd7c2e] hover:cursor-grab rounded-3xl overflow-hidden"
            >
              {sceneNear && (
                <div className="scene-in">
                  <Suspense fallback={null}>
                    <ContactExperience submitted={submitted} />
                  </Suspense>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
