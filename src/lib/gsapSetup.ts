import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Mobile browsers resize the viewport on every address-bar show/hide while
// flinging — refreshing all triggers per resize causes visible jank.
// GSAP's recommended config for scroll-heavy mobile pages (no pinning here).
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger };
