/* neko-ts cat companion: shared constants, phrase banks, and DOM effects. */

export const PET_KEY = "cat-companion:pets";
export const GREETED_KEY = "cat-companion:greeted";
export const SHOO_KEY = "cat-companion:shooed";
export const NAME_KEY = "cat-companion:name";

export const CAT_NAMES = [
  "mochi",
  "pixel",
  "tofu",
  "noodle",
  "bagel",
  "mittens",
  "chai",
  "waffle",
];

export const GREETING = (name: string) =>
  `${name} reporting for duty. (alt+c to shoo me)`;
export const RETURNING = (name: string) => [
  `${name} missed you.`,
  `${name} is back.`,
  `pspsps… oh, hi. it's ${name}.`,
];

export const PET_LINES = [
  "purrrr~",
  "that's the spot",
  "nya~!",
  "again~",
  "*stretches*",
  "you have good hands.",
  "purr purr purr.",
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
];

export const WAKE_LINES = ["hm? oh— hi.", "i was not sleeping.", "yawn~"];

export const WHEEE_LINES = ["wheee~", "slow down, i have little legs!"];

export const THEME_LINES = {
  dark: ["nya~ dim lights. big naps.", "dark mode = cat mode."],
  light: ["so bright! but cute.", "sunlight detected~"],
};

export const ROUTE_LINES: Record<string, string> = {
  "/blog": "words words words.",
  "/graph": "so many nodes~",
  "/": "home again~",
};
export const routeLine = (path: string) =>
  path.startsWith("/blog/post")
    ? "mmm. good read~"
    : (ROUTE_LINES[path] ?? "new room~");

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

export const pickName = () => {
  const existing = safeGet(localStorage, NAME_KEY);
  if (existing) return existing;
  const name = CAT_NAMES[rand(CAT_NAMES.length)];
  safeSet(localStorage, NAME_KEY, name);
  return name;
};

export const spawnHearts = (x: number, y: number, count = 5) => {
  const colors = ["#ff7aa8", "#ff9ec1", "#ffb3d1"];
  for (let i = 0; i < count; i++) {
    const heart = document.createElement("span");
    heart.className = "cat-heart";
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
  fish.style.left = `${x + edge * 64}px`;
  fish.style.top = `${y - 7}px`;
  fish.style.setProperty("--treat-dx", `${-edge * 64}px`);
  fish.style.setProperty("--fish-flip", String(-edge));
  fish.innerHTML = FISH_SVG;
  document.body.appendChild(fish);
  window.setTimeout(() => fish.remove(), 650);
};
