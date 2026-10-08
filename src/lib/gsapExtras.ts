import { gsap } from "./gsapSetup";

export type GsapExtras = {
  SplitText: typeof import("gsap/SplitText").SplitText;
  Flip: typeof import("gsap/Flip").Flip;
};

let extrasPromise: Promise<GsapExtras> | null = null;

/**
 * SplitText / Flip / ScrambleText are only needed by a handful of animations,
 * but registering them from gsapSetup pulled them into every page's entry
 * bundle. Call this once inside the effect that needs one and await it —
 * the animation just starts a beat later on first use.
 */
export function loadGsapExtras(): Promise<GsapExtras> {
  if (!extrasPromise) {
    extrasPromise = Promise.all([
      import("gsap/SplitText"),
      import("gsap/Flip"),
      import("gsap/ScrambleTextPlugin"),
    ]).then(([split, flip, scramble]) => {
      gsap.registerPlugin(split.SplitText, flip.Flip, scramble.ScrambleTextPlugin);
      return { SplitText: split.SplitText, Flip: flip.Flip };
    });
  }
  return extrasPromise;
}
