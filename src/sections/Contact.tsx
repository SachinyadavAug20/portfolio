import { lazy, Suspense, useEffect, useRef, useState } from "react";
import TitleHeader from "../components/TitleHeader";
import emailjs from "@emailjs/browser";
import { toast } from "sonner";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useNearViewport } from "../hooks/useNearViewport";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useMagnetic } from "../hooks/useMagnetic";
import { tap } from "../lib/haptics";

const ContactExperience = lazy(
  () => import("../components/ContactModels/ContactExperience"),
);

const Contact = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const {
    ref: sceneRef,
    near: sceneNear,
    visible: sceneVisible,
    setNear: setSceneNear,
  } = useNearViewport<HTMLDivElement>("600px");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const reduced = useReducedMotion();
  const submitMagneticRef = useMagnetic<HTMLButtonElement>();

  useEffect(() => {
    if (submitted) setSceneNear(true);
  }, [submitted, setSceneNear]);

  useGSAP(
    () => {
      if (reduced) return;
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
    { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true },
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof formData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const shake = () => {
    if (reduced) return;
    gsap.fromTo(
      ".contact-card",
      { x: -6 },
      { x: 0, duration: 0.5, ease: "elastic.out(1, 0.35)", clearProps: "x" },
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!formData.name.trim()) nextErrors.name = "Name is required";
    if (!formData.email.trim()) nextErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = "Please enter a valid email";
    }
    if (!formData.message.trim()) nextErrors.message = "Message is required";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      window.dispatchEvent(new CustomEvent("contact-invalid"));
      shake();
      tap(30);
      document
        .getElementById(Object.keys(nextErrors)[0])
        ?.focus({ preventScroll: false });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await emailjs.sendForm(
        import.meta.env.VITE_APP_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_APP_EMAILJS_TEMPLATE_ID,
        formRef.current!,
        import.meta.env.VITE_APP_EMAILJS_PUBLIC_KEY,
      );
      setFormData({ name: "", email: "", message: "" });
      setSubmitted(true);
      window.dispatchEvent(new CustomEvent("contact-sent"));
      setTimeout(() => setSubmitted(false), 4000);
      tap([15, 40, 15]);
      toast.success("Message sent successfully!", {
        description: "I will reply you as soon as possible.",
      });
    } catch {
      toast.error("Failed to send message!", {
        description:
          "There might be some issue, please try later or use my email(samtagon777@gmail.com) directly.",
      });
      shake();
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (field: keyof typeof formData) =>
    errors[field] ? (
      <p id={`${field}-error`} role="alert" className="field-error">
        {errors[field]}
      </p>
    ) : null;


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
                noValidate
              >
                <div className="flex flex-col gap-2">
                  <label htmlFor="name">Name</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    enterKeyHint="send"
                    placeholder="Your Name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    aria-required="true"
                    aria-invalid={errors.name ? "true" : undefined}
                    aria-describedby={errors.name ? "name-error" : undefined}
                  />
                  {fieldError("name")}
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    autoComplete="email"
                    enterKeyHint="send"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    aria-required="true"
                    aria-invalid={errors.email ? "true" : undefined}
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                  {fieldError("email")}
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="message">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    enterKeyHint="enter"
                    placeholder="Your message..."
                    value={formData.message}
                    onChange={handleChange}
                    required
                    aria-required="true"
                    aria-invalid={errors.message ? "true" : undefined}
                    aria-describedby={errors.message ? "message-error" : undefined}
                  />
                  {fieldError("message")}
                </div>
                <button
                  ref={submitMagneticRef}
                  type="submit"
                  disabled={loading || submitted}
                  className="transition-opacity disabled:opacity-60 disabled:cursor-wait"
                >
                  <div className={`cta-button group ${submitted ? "is-success" : ""}`}>
                    <div className="bg-circle" />
                    <p className="text">
                      {" "}
                      {loading
                        ? "Sending..."
                        : submitted
                          ? "Message sent!"
                          : "Send Message"}{" "}
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
              data-testid="contact-scene"
              className="relative w-full h-full bg-[#cd7c2e] hover:cursor-grab rounded-3xl overflow-hidden"
            >
              {sceneNear && (
                <div className="scene-in">
                  <Suspense
                    fallback={
                      <div className="skeleton absolute inset-0 rounded-3xl bg-black-200" />
                    }
                  >
                    <ContactExperience
                      submitted={submitted}
                      active={sceneVisible}
                    />
                  </Suspense>
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.42)_100%)]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
