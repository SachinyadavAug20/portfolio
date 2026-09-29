import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

gsap.registerPlugin(ScrollTrigger, SplitText, Flip, ScrambleTextPlugin);

// Mobile browsers resize the viewport on every address-bar show/hide while
// flinging — refreshing all triggers per resize causes visible jank.
// GSAP's recommended config for scroll-heavy mobile pages (no pinning here).
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger, SplitText, Flip, ScrambleTextPlugin };
