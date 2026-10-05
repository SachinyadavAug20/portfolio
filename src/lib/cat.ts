/* neko-ts cat companion: shared constants, phrase banks, and DOM effects. */

export const PET_KEY = "cat-companion:pets";
export const GREETED_KEY = "cat-companion:greeted";
export const SHOO_KEY = "cat-companion:shooed";

/* hidden fast-test mode: the Playwright suite sets localStorage.catFast
   = "1" so behavioral cooldowns run 8× quicker — default (no flag) is
   plain normal speed, so visitors never see this. Physics, animation,
   act schedules, wander/nap windows, and suggestions stay on real time. */
const readFast = (): boolean => {
  try {
    return localStorage.getItem("catFast") === "1";
  } catch {
    return false;
  }
};
export const FAST = readFast();
export const cd = (ms: number) =>
  FAST ? Math.max(150, Math.round(ms / 8)) : ms;

/*
 * The cat's persona: Luna — Sachin's personal tour-guide cat. She lives in
 * the corner of the portfolio, points out rooms worth visiting, gently
 * nudges you toward the good stuff (and toward hiring Sachin), and keeps a
 * warm Hinglish streak. A guide, not a meme.
 */
export const CAT_NAME = "Luna";

export const GREETING = (name: string) =>
  `${name} reporting for duty. (pspsps to call, alt+c to shoo me)`;

export const WEEKEND_GREETING = (name: string) => [
  `${name} on duty — even on weekends. (that's the flex.)`,
  `weekend~ ${name} still opens this tab. dedication.`,
  `saturday rule: no deploys, only cuddles. ${name} approves.`,
  `it's the weekend. recruiters relax. ${name} doesn't.`,
  `weekend energy, ${name} edition. browse slowly, hire fast.`,
  `sun's out, paws out. hi — it's ${name}.`,
];
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
  "i like you. you scroll with feeling.",
  "tip: the graph view is pretty. bring a paw.",
  "sachin replies fast. i've seen the inbox. it's scary.",
  "you're doing fine. the cat's opinion: validated.",
  "meow means hello, mostly. sometimes: hire him.",
  "pet me and i'll put in a good word. all my words are good, but still.",
  "walk or run? i do both. badly, but fast.",
  "that button looked clicky. i sat on it. problem solved.",
  "haan, i'm cute. also: the contact form works. try both.",
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

let pawsAlive = 0;
export const spawnPaw = (x: number, y: number) => {
  if (pawsAlive >= 14) return;
  const paw = document.createElement("span");
  paw.className = "cat-paw";
  paw.setAttribute("aria-hidden", "true");
  paw.style.left = `${Math.round(x - 5)}px`;
  paw.style.top = `${Math.round(y - 5)}px`;
  paw.style.setProperty("--paw-rot", `${rand(50) - 25}deg`);
  document.body.appendChild(paw);
  pawsAlive += 1;
  window.setTimeout(() => {
    paw.remove();
    pawsAlive -= 1;
  }, 1500);
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

const MOUSE_SVG = `<svg width="16" height="12" viewBox="0 0 16 12" shape-rendering="crispEdges" aria-hidden="true">
  <rect x="1" y="6" width="2" height="1" fill="#8b9098"/><rect x="0" y="5" width="1" height="2" fill="#8b9098"/>
  <rect x="3" y="5" width="9" height="5" fill="#b7bcc4"/><rect x="5" y="3" width="6" height="3" fill="#c9cdd4"/>
  <rect x="6" y="2" width="2" height="2" fill="#f2a0a8"/><rect x="11" y="5" width="3" height="3" fill="#c9cdd4"/>
  <rect x="13" y="6" width="1" height="1" fill="#f2a0a8"/><rect x="11" y="5" width="1" height="1" fill="#20202a"/>
  <rect x="4" y="10" width="2" height="1" fill="#8b9098"/><rect x="9" y="10" width="2" height="1" fill="#8b9098"/>
</svg>`;

/** pixel mouse for the prey chase — bolts away from the cat in a straight
    line (slower than a running cat, so she can actually catch it; 5.6s life) */
export const spawnMouse = (from: { x: number; y: number }): HTMLElement => {
  const mouse = document.createElement("div");
  mouse.className = "cat-mouse";
  mouse.setAttribute("aria-hidden", "true");
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dir = from.x < w / 2 ? 1 : -1;
  const sx = Math.min(Math.max(from.x + dir * 34, 24), w - 44);
  const sy = Math.min(Math.max(from.y + 10, 130), h - 64);
  mouse.style.left = `${sx}px`;
  mouse.style.top = `${sy}px`;
  if (dir < 0) mouse.style.transform = "scaleX(-1)";
  mouse.innerHTML = MOUSE_SVG;
  document.body.appendChild(mouse);
  /* run at most ~420px so the sprinting cat closes the gap */
  const edge = dir > 0 ? w - 40 - sx : sx - 28;
  const tx = sx + dir * Math.min(420, Math.max(edge, 120));
  const ty = Math.min(Math.max(sy + Math.round(Math.random() * 180 - 90), 124), h - 58);
  requestAnimationFrame(() => {
    mouse.style.left = `${tx}px`;
    mouse.style.top = `${ty}px`;
  });
  window.setTimeout(() => mouse.remove(), 5600);
  return mouse;
};

const BUTTERFLY_SVG = `<svg width="20" height="16" viewBox="0 0 10 8" shape-rendering="crispEdges" aria-hidden="true">
  <rect x="3" y="0" width="1" height="1" fill="#1e293b"/><rect x="6" y="0" width="1" height="1" fill="#1e293b"/>
  <rect x="0" y="1" width="3" height="2" fill="#38bdf8"/><rect x="7" y="1" width="3" height="2" fill="#38bdf8"/>
  <rect x="1" y="3" width="2" height="1" fill="#7dd3fc"/><rect x="7" y="3" width="2" height="1" fill="#7dd3fc"/>
  <rect x="1" y="4" width="2" height="2" fill="#0284c7"/><rect x="7" y="4" width="2" height="2" fill="#0284c7"/>
  <rect x="0" y="4" width="1" height="1" fill="#38bdf8"/><rect x="9" y="4" width="1" height="1" fill="#38bdf8"/>
  <rect x="4" y="1" width="2" height="6" fill="#1e293b"/><rect x="4" y="1" width="1" height="1" fill="#38bdf8"/>
</svg>`;

/** pixel butterfly for the chase act — sky-blue to match the theme; the
    component flies it around, this just births it (5.4s life) */
export const spawnButterfly = (x: number, y: number): HTMLElement => {
  const bf = document.createElement("div");
  bf.className = "cat-butterfly";
  bf.setAttribute("aria-hidden", "true");
  bf.style.left = `${Math.round(x)}px`;
  bf.style.top = `${Math.round(y)}px`;
  bf.innerHTML = BUTTERFLY_SVG;
  document.body.appendChild(bf);
  window.setTimeout(() => bf.remove(), 5400);
  return bf;
};

/** red laser dot for the chase act — the component re-aims it every few
    strides, CSS eases each hop (4.6s life) */
export const spawnLaser = (x: number, y: number): HTMLElement => {
  const dot = document.createElement("div");
  dot.className = "cat-laser";
  dot.setAttribute("aria-hidden", "true");
  dot.style.left = `${Math.round(x)}px`;
  dot.style.top = `${Math.round(y)}px`;
  document.body.appendChild(dot);
  window.setTimeout(() => dot.remove(), 4600);
  return dot;
};

/** warm light patch for the sunbeam act — she walks in and naps on it
    (7.6s life, below the cat in the stack) */
export const spawnSunbeam = (x: number, y: number): HTMLElement => {
  const beam = document.createElement("div");
  beam.className = "cat-sunbeam";
  beam.setAttribute("aria-hidden", "true");
  beam.style.left = `${Math.round(x)}px`;
  beam.style.top = `${Math.round(y)}px`;
  document.body.appendChild(beam);
  window.setTimeout(() => beam.remove(), 7600);
  return beam;
};

const BOX_SVG = `<svg width="72" height="44" viewBox="0 0 36 22" shape-rendering="crispEdges" aria-hidden="true">
  <rect x="1" y="3" width="9" height="2" fill="#b97a41"/><rect x="26" y="3" width="9" height="2" fill="#b97a41"/>
  <rect x="3" y="5" width="30" height="17" fill="#c98a4b"/>
  <rect x="3" y="5" width="30" height="1" fill="#d99d5e"/>
  <rect x="3" y="11" width="30" height="1" fill="#b97a41"/>
  <rect x="17" y="5" width="2" height="17" fill="#a86a35"/>
  <rect x="17" y="6" width="2" height="4" fill="#8a5628"/>
  <rect x="3" y="21" width="30" height="1" fill="#8a5628"/>
  <rect x="6" y="14" width="4" height="3" fill="#a86a35"/><rect x="26" y="8" width="4" height="2" fill="#d99d5e"/>
</svg>`;

/** cardboard box for the box act — drops over her lower half so she reads
    as sitting inside it (component owns removal; 6.6s backstop) */
export const spawnBox = (x: number, y: number): HTMLElement => {
  const box = document.createElement("div");
  box.className = "cat-box";
  box.setAttribute("aria-hidden", "true");
  box.style.left = `${Math.round(x)}px`;
  box.style.top = `${Math.round(y)}px`;
  box.innerHTML = BOX_SVG;
  document.body.appendChild(box);
  window.setTimeout(() => box.remove(), 6600);
  return box;
};
