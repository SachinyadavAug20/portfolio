export const helixConfig = {
  scene: {
    strands: 2,
    perStrand: 14,
    // full rotations from top of a strand to the bottom — integer, so wrap is seamless
    turns: 2,
    // cards per second of ambient descent
    speed: 0.25,
    // strand height relative to viewport, so it runs off both edges
    spanFactor: 1.2
  },
  appearance: {
    brightnessFloor: 0.12,
    maxBlur: 5
  },
  interaction: {
    // per-frame velocity decay after release, at a 60fps reference
    friction: 0.94,
    minMomentum: 0.0005
  },
  // discrete responsive tiers; the first entry whose minWidth fits the viewport
  // wins. Radius and perspective step down with card size so each tier keeps
  // the same composition and depth character.
  breakpoints: [
    { minWidth: 1440, radius: 560, perspective: 1400, cardWidth: 260, cardHeight: 180 },
    { minWidth: 1024, radius: 420, perspective: 1200, cardWidth: 225, cardHeight: 155 },
    { minWidth: 640, radius: 310, perspective: 1000, cardWidth: 170, cardHeight: 118 },
    { minWidth: 0, radius: 220, perspective: 850, cardWidth: 128, cardHeight: 88 }
  ]
} as const;

export type Breakpoint = (typeof helixConfig.breakpoints)[number];
