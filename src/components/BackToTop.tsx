import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { scrollToY } from "../lib/smoothScroll";

/** Floating jump-back — appears once a note/list is long enough to need it.
 *  Sits above the mobile tab bar (hidden <1024px, z-80) and clear of it on
 *  desktop; z-90 keeps it under the cat (z-130) and reading bar (z-115). */
const BackToTop = ({ threshold = 600 }: { threshold?: number }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return (
    <button
      type="button"
      aria-label="Back to top"
      title="Back to top"
      onClick={() => scrollToY(0)}
      className={`fixed right-4 bottom-24 lg:right-6 lg:bottom-6 z-[90] grid place-items-center size-11 rounded-full
                  border border-black-50 bg-black-100/90 text-white-50 shadow-lg backdrop-blur
                  hover:bg-black-200 hover:text-foreground active:scale-95 transition-all duration-200
                  ${visible ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-3"}`}
    >
      <ArrowUp className="size-5" />
    </button>
  );
};

export default BackToTop;
