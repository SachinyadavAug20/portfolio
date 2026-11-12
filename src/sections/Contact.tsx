import { lazy, Suspense, useEffect, useRef, useState } from "react";
import TitleHeader from "../components/TitleHeader";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useNearViewport } from "../hooks/useNearViewport";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useMagnetic } from "../hooks/useMagnetic";
import { tap } from "../lib/haptics";
import { notify } from "../lib/toast";
import { socialImg } from "../../constants";
import { Calendar, Copy, Mail } from "lucide-react";
import { scrollToY } from "../lib/smoothScroll";

const ContactExperience = lazy(
  () => import("../components/ContactModels/ContactExperience"),
);

const CalScheduler = lazy(() => import("../components/CalScheduler"));

const CONTACT_EMAIL = "samtagon777@gmail.com";

/* intent chips kill the blank-page paralysis — one tap seeds a draft the
   visitor can finish in seconds (the whole point of this section) */
const INTENTS = [
  {
    id: "hire",
    label: "Hire me for a role",
    prompt: "Hi Sachin! I'd like to discuss a role for you — ",
  },
  {
    id: "project",
    label: "Freelance project",
    prompt: "Hi Sachin! I have a project in mind — ",
  },
  {
    id: "hello",
    label: "Just saying hi",
    prompt: "Hi Sachin! ",
  },
] as const;

interface ContactProps {
  initialMode?: "message" | "meeting";
}

const Contact = ({ initialMode }: ContactProps = {}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
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
  const [activeIntent, setActiveIntent] = useState<string | null>(null);
  const [sentName, setSentName] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [contactMode, setContactMode] = useState<"message" | "meeting">(() => {
    if (initialMode) return initialMode;
    if (typeof window !== "undefined") {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (
        hash.includes("schedule") ||
        hash.includes("book") ||
        hash.includes("meeting") ||
        path.includes("schedule") ||
        path.includes("book") ||
        path.includes("meeting")
      ) {
        return "meeting";
      }
    }
    return "message";
  });
  const [wide, setWide] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches,
  );
  const reduced = useReducedMotion();
  const submitMagneticRef = useMagnetic<HTMLButtonElement>();

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      const isMeeting =
        hash.includes("schedule") ||
        hash.includes("book") ||
        hash.includes("meeting") ||
        path.includes("schedule") ||
        path.includes("book") ||
        path.includes("meeting");

      if (isMeeting) {
        setContactMode("meeting");
        requestAnimationFrame(() => {
          const el = document.getElementById("schedule") || document.getElementById("contact");
          if (el) scrollToY(el.getBoundingClientRect().top + window.scrollY);
        });
      } else if (hash.includes("contact") || path.includes("contact")) {
        setContactMode("message");
        requestAnimationFrame(() => {
          const el = document.getElementById("contact");
          if (el) scrollToY(el.getBoundingClientRect().top + window.scrollY);
        });
      }
    };
    window.addEventListener("hashchange", handleHash);
    window.addEventListener("popstate", handleHash);
    return () => {
      window.removeEventListener("hashchange", handleHash);
      window.removeEventListener("popstate", handleHash);
    };
  }, []);

  /* the 3D room is a desktop luxury — phones get the form full-screen
     (faster load, one job: the message); appears exactly when the grid splits */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (submitted) setSceneNear(true);
  }, [submitted, setSceneNear]);

  useGSAP(
    () => {
      if (reduced) return;
      const scope = sectionRef.current;
      if (!scope) return;
      const items = gsap.utils.toArray<HTMLElement>(".contact-reveal", scope);
      if (!items.length) return;
      gsap.fromTo(
        items,
        { y: 26, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "power2.out",
          stagger: 0.08,
          clearProps: "transform,opacity",
          scrollTrigger: { trigger: scope, start: "top 78%", once: true },
        },
      );
    },
    { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true },
  );

  /* success panel: card pops, the check draws itself in */
  useEffect(() => {
    if (!submitted || reduced) return;
    const el = successRef.current;
    if (!el) return;
    gsap.fromTo(
      el,
      { scale: 0.94, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(1.7)" },
    );
    const path = el.querySelector<SVGPathElement>(".check-path");
    if (path) {
      const len = path.getTotalLength();
      gsap.fromTo(
        path,
        { strokeDasharray: len, strokeDashoffset: len },
        { strokeDashoffset: 0, duration: 0.55, ease: "power2.out", delay: 0.12 },
      );
    }
  }, [submitted, reduced]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "message") {
      const match = INTENTS.find((i) => i.prompt === value);
      setActiveIntent(match ? match.id : null);
    }
    if (errors[name as keyof typeof formData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const pickIntent = (id: string, el: HTMLElement) => {
    const intent = INTENTS.find((i) => i.id === id);
    if (!intent) return;
    /* only seed over blank or another template — never clobber typed words */
    const blankOrTemplate =
      formData.message.trim() === "" ||
      INTENTS.some((i) => i.prompt === formData.message);
    if (blankOrTemplate) {
      setFormData((prev) => ({ ...prev, message: intent.prompt }));
      setErrors((prev) => ({ ...prev, message: undefined }));
    }
    setActiveIntent(id);
    tap(8);
    /* the cat endorses the pick and lights up the draft it just seeded */
    window.dispatchEvent(new CustomEvent("contact-chip", { detail: { id } }));
    if (!reduced) {
      gsap.fromTo(
        el,
        { scale: 0.93 },
        { scale: 1, duration: 0.35, ease: "back.out(3)", clearProps: "transform" },
      );
    }
    requestAnimationFrame(() => messageRef.current?.focus());
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      tap(8);
      void notify("success", "Email copied", { description: CONTACT_EMAIL });
      window.dispatchEvent(new CustomEvent("contact-copy"));
    } catch {
      window.location.href = `mailto:${CONTACT_EMAIL}`;
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
      const { default: emailjs } = await import("@emailjs/browser");
      setSentName(formData.name.trim().split(/\s+/)[0]);
      await emailjs.sendForm(
        import.meta.env.VITE_APP_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_APP_EMAILJS_TEMPLATE_ID,
        formRef.current!,
        import.meta.env.VITE_APP_EMAILJS_PUBLIC_KEY,
      );
      setFormData({ name: "", email: "", message: "" });
      setActiveIntent(null);
      setSubmitted(true);
      window.dispatchEvent(new CustomEvent("contact-sent"));
      tap([15, 40, 15]);
      void notify("success", "Message sent successfully!", {
        description: "I will reply you as soon as possible.",
      });
    } catch {
      void notify("error", "Failed to send message!", {
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
    <section
      id="contact"
      ref={sectionRef}
      className="w-full flex-center px-4 sm:px-6 md:px-10 py-12 sm:py-16 relative z-10 clear-both"
    >
      {/* Anchor targets for direct redirects & hash navigation */}
      <span id="schedule" className="sr-only -top-20 absolute" />
      <span id="book" className="sr-only -top-20 absolute" />
      <span id="meeting" className="sr-only -top-20 absolute" />
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 sm:gap-5">
        {/* Section Header with Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 contact-reveal">
          <div>
            <TitleHeader title="Contact Me" />
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black-50 bg-black-100/70 px-3 py-1 text-xs text-white-50/70">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-green-400" />
              </span>
              Open to work
            </span>

            {/* Segmented Mode Switcher */}
            <div
              role="tablist"
              aria-label="Contact method"
              className="inline-flex items-center p-0.5 sm:p-1 rounded-full border border-black-50 bg-black-200/90 dark:bg-black-100/90 backdrop-blur-md shadow-sm"
            >
              <button
                type="button"
                role="tab"
                aria-selected={contactMode === "message"}
                onClick={() => {
                  tap(8);
                  setContactMode("message");
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer active:scale-95 touch-manipulation ${
                  contactMode === "message"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm"
                    : "text-white-50/70 hover:text-foreground"
                }`}
              >
                <Mail className="size-3.5" />
                <span>Message</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={contactMode === "meeting"}
                onClick={() => {
                  tap(8);
                  setContactMode("meeting");
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer active:scale-95 touch-manipulation ${
                  contactMode === "meeting"
                    ? "bg-cyan-500 text-black font-semibold shadow-[0_0_16px_rgba(34,211,238,0.45)]"
                    : "text-white-50/70 hover:text-foreground"
                }`}
              >
                <Calendar className="size-3.5" />
                <span>Book Call</span>
                <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse hidden sm:inline-block" />
              </button>
            </div>
          </div>
        </div>

        {contactMode === "meeting" ? (
          <div className="w-full contact-reveal">
            <Suspense
              fallback={
                <div className="w-full h-[480px] skeleton rounded-3xl bg-black-200/60" />
              }
            >
              <CalScheduler />
            </Suspense>
          </div>
        ) : (
          <div className="grid-12-cols items-stretch gap-6 lg:gap-8">
            <div className="xl:col-span-5 flex flex-col justify-center gap-3 sm:gap-3.5">
              <p className="contact-reveal text-center xl:text-start text-white-50/70 text-xs sm:text-sm leading-normal max-w-md mx-auto xl:mx-0">
                Have a project or opportunity? Drop a note or pick a quick starter:
              </p>

              <div className="contact-reveal flex flex-wrap justify-center xl:justify-start gap-1.5 sm:gap-2">
                {INTENTS.map((intent) => (
                  <button
                    key={intent.id}
                    type="button"
                    aria-pressed={activeIntent === intent.id}
                    onClick={(e) => pickIntent(intent.id, e.currentTarget)}
                    className={`chip shrink-0 inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs rounded-full border transition-colors ${
                      activeIntent === intent.id
                        ? "chip-filter"
                        : "border-black-50 bg-black-200 text-white-50/85 hover:bg-black-50 hover:text-foreground"
                    }`}
                  >
                    {intent.label}
                  </button>
                ))}
              </div>

              <div className="contact-card contact-reveal card-border rounded-2xl p-4 sm:p-5">
                {submitted ? (
                  <div
                    ref={successRef}
                    className="flex flex-col items-center text-center gap-3 py-4"
                  >
                    <svg
                      viewBox="0 0 64 64"
                      className="size-12 text-green-400"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        cx="32"
                        cy="32"
                        r="29"
                        stroke="currentColor"
                        strokeWidth="3"
                        opacity="0.35"
                      />
                      <path
                        className="check-path"
                        d="M20 33.5 28.5 42 45 24"
                        stroke="currentColor"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <h3 className="text-lg font-semibold">Message sent!</h3>
                    <p className="text-xs sm:text-sm text-white-50/60 max-w-xs">
                      Thanks{sentName ? `, ${sentName}` : ""} — it landed in my
                      inbox. I usually reply within 24 hours.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        tap(8);
                        setSubmitted(false);
                      }}
                      className="chip chip-filter px-3.5 py-1.5 text-xs rounded-full"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form
                    ref={formRef}
                    className="w-full flex flex-col gap-3"
                    onSubmit={handleSubmit}
                    noValidate
                  >
                    <div className="flex flex-col gap-1">
                      <label htmlFor="name" className="text-xs">Name</label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        enterKeyHint="next"
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
                    <div className="flex flex-col gap-1">
                      <label htmlFor="email" className="text-xs">Email</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your@email.com"
                        autoComplete="email"
                        enterKeyHint="next"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        aria-required="true"
                        aria-invalid={errors.email ? "true" : undefined}
                        aria-describedby={errors.email ? "email-error" : undefined}
                      />
                      {fieldError("email")}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="message" className="text-xs">Message</label>
                      <textarea
                        id="message"
                        ref={messageRef}
                        name="message"
                        rows={3}
                        enterKeyHint="enter"
                        placeholder="Your message..."
                        value={formData.message}
                        onChange={handleChange}
                        required
                        aria-required="true"
                        aria-invalid={errors.message ? "true" : undefined}
                        aria-describedby={errors.message ? "message-error" : undefined}
                        className="min-h-[64px] sm:min-h-[72px]"
                      />
                      {fieldError("message")}
                    </div>
                    <button
                      ref={submitMagneticRef}
                      type="submit"
                      disabled={loading || submitted}
                      className="transition-opacity disabled:opacity-60 disabled:cursor-wait mt-0.5"
                    >
                      <div className="cta-button group">
                        <div className="bg-circle" />
                        <p className="text text-sm">
                          {loading ? "Sending..." : "Send message"}
                        </p>
                        <div className="arrow-wrapper">
                          <img src="/images/arrow-down.svg" alt="arrow" />
                        </div>
                      </div>
                    </button>
                    <p className="text-center text-[11px] text-white-50/40 -mt-1">
                      Straight to my inbox &middot; no spam, ever
                    </p>
                  </form>
                )}
              </div>

              <div className="contact-reveal flex flex-wrap items-center justify-center xl:justify-start gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={copyEmail}
                  className="chip inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border border-black-50 bg-black-200 text-white-50/85 hover:bg-black-50 hover:text-foreground transition-colors cursor-pointer"
                >
                  <Copy className="size-3.5" />
                  {CONTACT_EMAIL}
                </button>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="chip inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border border-black-50 bg-black-200 text-white-50/85 hover:bg-black-50 hover:text-foreground transition-colors"
                >
                  <Mail className="size-3.5" />
                  Mail app
                </a>
                {socialImg.map(({ link, imgPath, imgPathLight, name }) => (
                  <a
                    key={name}
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={name}
                    className="chip grid place-items-center size-8 rounded-full border border-black-50 bg-black-200 hover:bg-black-50 transition-colors"
                  >
                    <img
                      src={imgPath}
                      alt=""
                      className="hidden dark:block size-3.5"
                      loading="lazy"
                      decoding="async"
                    />
                    <img
                      src={imgPathLight}
                      alt=""
                      className="dark:hidden size-3.5"
                      loading="lazy"
                      decoding="async"
                    />
                  </a>
                ))}
              </div>
            </div>

            {wide && (
              <div className="xl:col-span-7 min-h-[360px] xl:min-h-[440px] xl:max-h-[500px] h-full flex flex-col justify-center">
                <div
                  ref={sceneRef}
                  data-testid="contact-scene"
                  className="relative w-full h-full min-h-[380px] xl:min-h-[440px] bg-[#cd7c2e] hover:cursor-grab rounded-3xl overflow-hidden shadow-lg"
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
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default Contact;
