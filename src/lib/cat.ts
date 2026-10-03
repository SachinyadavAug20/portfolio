/* neko-ts cat companion: shared constants, phrase banks, and DOM effects. */

export const PET_KEY = "cat-companion:pets";
export const GREETED_KEY = "cat-companion:greeted";
export const SHOO_KEY = "cat-companion:shooed";

/*
 * The cat's persona: Luna — Sachin's personal tour-guide cat. She lives in
 * the corner of the portfolio, points out rooms worth visiting, gently
 * nudges you toward the good stuff (and toward hiring Sachin), and keeps a
 * warm Hinglish streak. A guide, not a meme.
 */
export const CAT_NAME = "Luna";

export const GREETING = (name: string) =>
  `${name} reporting for duty. (pspsps to call, alt+c to shoo me)`;
export const RETURNING = (name: string) => [
  `${name} missed you.`,
  `${name} is back.`,
  `pspsps… oh— hi. it's ${name}.`,
];

export const PET_LINES = [
  "purrrr~",
  "that's the spot",
  "nya~!",
  "again~",
  "*stretches*",
  "you have good hands.",
  "purr purr purr.",
  "pets accepted. tour resumes shortly.",
];

export const TREAT_LINES = ["nom nom~", "fish!! my favorite.", "crunchy. ♥"];

export const CHATTER = [
  "click me.",
  "i chased the cursor. i won.",
  "you scroll, i watch.",
  "pspsps… that means: hire him.",
  "zZz… oh— you moved.",
  "this portfolio passes the cat test.",
  "i checked the source. nice tabs.",
  "this way~ the good stuff is further down.",
  "guided tour, free of charge. i accept pets.",
  "chalo, next room~",
  "looking to hire sachin? his email is one scroll away.",
  "ask me where to go. i'll say: keep scrolling.",
  "you move, i follow. that's basically a tour.",
];

export const WAKE_LINES = [
  "hm? oh— hi.",
  "i was not sleeping.",
  "yawn~",
  "hm? oh— hi. where were we? right— touring.",
];

export const WHEEE_LINES = ["wheee~", "slow down, i have little legs!"];

/* long-idle blog suggestion: when it may fire, how often, how long it stays */
export const SUGGEST_IDLE_MS = 40_000;
export const SUGGEST_GAP_MS = 60_000;
export const SUGGEST_LIFE_MS = 16_000;

/* reply when the visitor skips the suggestion (keys: d / skip button) */
export const SUGGEST_DENY = [
  "fair. suit yourself.",
  "noted. the note stays fabulous though.",
  "okay okay. next time.",
  "skipped. no hard feelings. (some feelings).",
  "your loss~ the tour goes on.",
];

export const THEME_LINES = {
  dark: [
    "nya~ dim lights. big naps.",
    "dark mode = cat mode.",
    "the dark. my pupils: fully committed.",
    "midnight vibes at any hour. i approve.",
    "dark mode finally. my retina thanks you.",
    "black on black. very formal. very cat.",
  ],
  light: [
    "so bright! but cute.",
    "sunlight detected~",
    "light mode: the sunbeam finds ME.",
    "everything is visible. even his commit history.",
    "too bright! pupils: shrink mode.",
    "daylight. productivity. (i'll nap through it.)",
  ],
};

export const ROUTE_LINES: Record<string, string> = {
  "/blog": "330 notes~ i've read every one of them.",
  "/graph": "so many nodes~",
  "/": "home again~",
};
export const routeLine = (path: string) =>
  path.startsWith("/blog/post")
    ? "mmm. good read~"
    : (ROUTE_LINES[path] ?? "new room~");

/* tour-guide headers for the idle blog-suggestion bubble */
export const GUIDE_HEADERS = [
  "psst— this one's worth your time.",
  "next stop on the tour:",
  "if you read one note today:",
  "the cat recommends:",
];

export const rand = (n: number) => Math.floor(Math.random() * n);

export const safeGet = (store: Storage, key: string) => {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
};

export const safeSet = (store: Storage, key: string, value: string) => {
  try {
    store.setItem(key, value);
  } catch {
    /* private mode — feature just doesn't persist */
  }
};

export const spawnHearts = (x: number, y: number, count = 5) => {
  const colors = ["#ff7aa8", "#ff9ec1", "#ffb3d1"];
  for (let i = 0; i < count; i++) {
    const heart = document.createElement("span");
    heart.className = "cat-heart";
    heart.setAttribute("aria-hidden", "true");
    heart.textContent = "♥";
    heart.style.left = `${x + rand(36) - 18}px`;
    heart.style.top = `${y - 14 - rand(8)}px`;
    heart.style.animationDelay = `${i * 90}ms`;
    heart.style.color = colors[i % colors.length];
    heart.style.fontSize = `${13 + rand(5)}px`;
    document.body.appendChild(heart);
    window.setTimeout(() => heart.remove(), 1600);
  }
};

export const spawnSparkles = (x: number, y: number) => {
  for (let i = 0; i < 7; i++) {
    const angle = (Math.PI * 2 * i) / 7 + Math.random() * 0.5;
    const dist = 26 + Math.random() * 24;
    const s = document.createElement("span");
    s.className = "cat-sparkle";
    s.setAttribute("aria-hidden", "true");
    s.textContent = "✦";
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.setProperty("--dx", `${Math.round(Math.cos(angle) * dist)}px`);
    s.style.setProperty("--dy", `${Math.round(Math.sin(angle) * dist)}px`);
    s.style.animationDelay = `${i * 45}ms`;
    document.body.appendChild(s);
    window.setTimeout(() => s.remove(), 1200);
  }
};

const FISH_SVG = `<svg width="24" height="14" viewBox="0 0 12 7" shape-rendering="crispEdges" aria-hidden="true">
  <rect x="0" y="2" width="2" height="1" fill="#f2765b"/><rect x="1" y="1" width="1" height="1" fill="#f2765b"/>
  <rect x="1" y="3" width="1" height="1" fill="#f2765b"/><rect x="1" y="2" width="2" height="1" fill="#ff9e7d"/>
  <rect x="3" y="1" width="6" height="1" fill="#ff9e7d"/><rect x="3" y="2" width="7" height="1" fill="#ffb495"/>
  <rect x="3" y="3" width="6" height="1" fill="#ff9e7d"/><rect x="4" y="4" width="4" height="1" fill="#f2765b"/>
  <rect x="4" y="0" width="3" height="1" fill="#f2765b"/><rect x="8" y="2" width="1" height="1" fill="#20202a"/>
</svg>`;

export const spawnFish = (x: number, y: number, edge: 1 | -1) => {
  const fish = document.createElement("div");
  fish.className = "cat-treat";
  fish.setAttribute("aria-hidden", "true");
  fish.style.left = `${x + edge * 64}px`;
  fish.style.top = `${y - 7}px`;
  fish.style.setProperty("--treat-dx", `${-edge * 64}px`);
  fish.style.setProperty("--fish-flip", String(-edge));
  fish.innerHTML = FISH_SVG;
  document.body.appendChild(fish);
  window.setTimeout(() => fish.remove(), 650);
};

/** yarn ball for the chase act — arcs out and loops back (3s life) */
export const spawnYarn = (x: number, y: number): HTMLElement => {
  const ball = document.createElement("div");
  ball.className = "cat-yarn";
  ball.setAttribute("aria-hidden", "true");
  ball.style.left = `${x + (Math.random() < 0.5 ? -48 : 48)}px`;
  ball.style.top = `${y - 30 - Math.random() * 24}px`;
  ball.style.setProperty("--yarn-dx", Math.random() < 0.5 ? "-1" : "1");
  document.body.appendChild(ball);
  window.setTimeout(() => ball.remove(), 3000);
  return ball;
};

/** knocked object for the gravity-test act — tips, falls, fades */
export const spawnDrop = (x: number, y: number) => {
  const drop = document.createElement("div");
  drop.className = "cat-drop";
  drop.setAttribute("aria-hidden", "true");
  drop.style.left = `${x}px`;
  drop.style.top = `${y}px`;
  document.body.appendChild(drop);
  window.setTimeout(() => drop.remove(), 900);
};
