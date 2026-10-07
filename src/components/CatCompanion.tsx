import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Neko, NekoSizeVariations } from "neko-ts";
import { useReducedMotion, isReducedMotion } from "../hooks/useReducedMotion";
import { tap } from "../lib/haptics";
import {
  CAT_NAME,
  CHATTER,
  FAST,
  GREETING,
  WEEKEND_GREETING,
  GREETED_KEY,
  GUIDE_HEADERS,
  PET_KEY,
  PET_LINES,
  READS_KEY,
  RETURNING,
  ROOMS_KEY,
  SHOO_KEY,
  SUGGEST_DENY,
  SUGGEST_GAP_MS,
  SUGGEST_IDLE_MS,
  SUGGEST_LIFE_MS,
  TREAT_LINES,
  THEME_LINES,
  WHEEE_LINES,
  WAKE_LINES,
  cd,
  rand,
  routeLine,
  safeGet,
  safeSet,
  spawnBox,
  spawnButterfly,
  spawnDrop,
  spawnFish,
  spawnGift,
  spawnHearts,
  spawnLaser,
  spawnMouse,
  spawnPaw,
  spawnSparkles,
  spawnSunbeam,
  spawnYarn,
} from "../lib/cat";
import type { CatContext } from "../lib/catTypes";
import type { ActId, EncourageKind, NoteStats } from "../lib/catBrain";
import type { BlogSuggestion } from "../lib/blogSuggestions";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { gsap } from "../lib/gsapSetup";

/* context-aware standoff: how much room Luna keeps between herself and the
   cursor — follow close, read calmly, watch the graph from the rim, step
   back from a highlight (the number feeds neko's distanceFromMouse) */
type StandoffBase = "follow" | "calm" | "observe";
type StandoffMode = StandoffBase | "back";
const STANDOFF_DIST: Record<StandoffMode, number> = {
  follow: 25,
  calm: 70,
  observe: 170,
  back: 200,
};
const STANDOFF_SPEED: Record<StandoffMode, number> = {
  follow: 12,
  calm: 10,
  observe: 11,
  back: 14,
};
/* legs match the pace: animationSpeed is the frame refresh in ms, so
   lower = faster feet (stroll ambles, sprint blurs) */
const STANDOFF_ANIM: Record<StandoffMode, number> = {
  follow: 100,
  calm: 125,
  observe: 112,
  back: 86,
};

/* movement gears — walking vs running is speed AND foot cadence */
const PACE = {
  stroll: { speed: 10, anim: 130 },
  walk: { speed: 12, anim: 100 },
  trot: { speed: 14, anim: 84 },
  run: { speed: 17, anim: 62 },
  sprint: { speed: 20, anim: 46 },
} as const;
type PaceTier = keyof typeof PACE;

/* acts that drag the cat across the screen — skipped on the graph, where
   the perch is the whole point */
const ROAMING_ACTS: readonly ActId[] = [
  "zoomies", "yarn", "stare", "knock", "seat", "prey",
  "scratch", "butterfly", "paw",
  "sunbeam", "laser", "pounce", "box", "tailchase",
  "social", "roll", "gift",
];

/*
 * Cat companion — a neko-ts desktop pet that sneaks in from a screen edge,
 * chases the cursor (or your finger), naps when you're away, and can be
 * petted, fed, and shooed.
 *
 * - neko-ts ships broken package `types` paths; tsconfig.app.json maps both
 *   entries to the real .d.ts location under dist/src.
 * - The library only tracks the mouse after a real event, so a synthetic
 *   mousemove seeds its target the moment it spawns (otherwise the cat sits
 *   off-screen until the visitor moves).
 * - The element is pointer-events:none, so petting listens globally and
 *   hit-tests against neko.position — real UI clicks are never hijacked.
 * - Reduced motion never spawns the cat; Alt+C shooes it for the session.
 * - While the visitor rests she keeps herself busy: strolling the page
 *   (4–16s idle), fidgeting in place every few seconds, and leaving paw
 *   prints whenever she breaks into a trot or faster — walk/run/sprint
 *   gears on the way, leaps sprinkled in.
 * - Random acts include game-y bits: chasing a pixel mouse, a sky-blue
 *   butterfly, or a red laser dot; claiming a seat on real UI; clawing
 *   cards; napping in sunbeams; boxes; pounces; digs; tail orbits;
 *   spin/sneeze/flop showpieces; zoomies — with combo chains so one bit
 *   sometimes spills into the next.
 * - After long idle the cat wakes with a clickable blog suggestion
 *   (dynamic import keeps the reading list out of the entry bundle).
 * - Persona: Luna, Sachin's tour-guide cat — shows you around, nudges you
 *   toward the good stuff (and toward hiring Sachin).
 * - Type "pspsps" anywhere to call him back to your cursor; typed words
 *   (luna, meow, hire, joke, help, thanks, fish, sachin, hi, nya, tuna,
 *   yarn, nap, chai, dog) earn answers outside form fields — some come
 *   with props (fish, yarn) or consequences (nap sleeps, dog gets chased).
 * - The brain (src/lib/catBrain) lazy-loads: 100k+ combinatorial lines,
 *   session context (route/hour/scroll/pets/typing), and weighted random
 *   acts (zoomies, yarn chase, knock, prophecy…) — cat.ts lines are the
 *   fallback until the chunk lands.
 */

/* background chatter respects this gap between any two idle phrases;
   user-facing reactions (greet, pet, acts) pass force=true and skip it */
const PHRASE_GAP_MS = cd(5000);

type Brain = typeof import("../lib/catBrain");

/* every synthetic seed is clamped to the viewport — the cat can never be
   aimed at dead space, and (with the raised z-index) can never vanish
   behind the navbar or tab bar either */
const seedPointer = (rawX: number, rawY: number) => {
  const x = Math.min(Math.max(rawX, 26), window.innerWidth - 26);
  const y = Math.min(Math.max(rawY, 34), window.innerHeight - 46);
  document.body.dispatchEvent(
    new MouseEvent("mousemove", { clientX: x, clientY: y, bubbles: true }),
  );
};

/* streaming typewriter: bubble text types itself in, char by char.
   reduced motion shows the full line at once. fast-test mode snaps. */
const typeSpeed = (len: number) =>
  FAST ? 2 : len > 70 ? 10 : len > 40 ? 14 : 18;

/* the current room's own headline — the hero h1 or a TitleHeader —
   empty while a lazy page is still streaming in */
const pageTitle = (): string => {
  const el = document.querySelector<HTMLElement>("h1, .th-title");
  const t = (el?.textContent || "").replace(/\s+/g, " ").trim();
  return t.length >= 3 && t.length <= 72 ? t : "";
};
/* heading first; on a cold load the markdown may still be streaming in,
   so fall back to the note's own URL tail */
const noteTitle = (): string => {
  const t = pageTitle();
  if (t) return t;
  try {
    const tail = decodeURIComponent(
      window.location.pathname.split("/").filter(Boolean).pop() || "",
    );
    return tail.length >= 3 && tail.length <= 72 ? tail : "";
  } catch {
    return "";
  }
};

const useTypewriter = (text: string | null): string => {
  const reduced = useReducedMotion();
  const [cur, setCur] = useState<{ src: string | null; out: string }>({
    src: null,
    out: "",
  });
  useEffect(() => {
    if (!text || reduced) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setCur({ src: text, out: text.slice(0, i) });
      if (i >= text.length) window.clearInterval(id);
    }, typeSpeed(text.length));
    return () => window.clearInterval(id);
  }, [text, reduced]);
  if (!text) return "";
  if (reduced) return text;
  /* a new text shows nothing until its first tick — never the old line */
  return cur.src === text ? cur.out : "";
};

const CatCompanion = () => {
  const reduced = useReducedMotion();
  const location = useLocation();
  const navigate = useNavigate();
  /* shooing sticks across reloads so opting out is actually easy */
  const [enabled, setEnabled] = useState(
    () => safeGet(localStorage, SHOO_KEY) !== "1",
  );
  const [phrase, setPhrase] = useState<{ text: string; ms: number } | null>(
    null,
  );
  const [sleeping, setSleeping] = useState(false);
  const [suggest, setSuggest] = useState<BlogSuggestion | null>(null);

  const nekoRef = useRef<Neko | null>(null);
  const brainRef = useRef<Brain | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const suggestAnchorRef = useRef<HTMLDivElement>(null);
  const zzzRef = useRef<HTMLDivElement>(null);
  const phraseTimer = useRef(0);
  const lastPhraseAt = useRef(0);
  const lastPetAt = useRef(0);
  const treatActive = useRef(false);
  const petNap = useRef(false);
  const sleepingRef = useRef(false);
  const lastSleptAt = useRef(0);
  const suggestRef = useRef<BlogSuggestion | null>(null);
  const suggestUsed = useRef<Set<string>>(new Set());
  const lastSuggestAt = useRef(0);
  const lastActivity = useRef(0);
  const lastInput = useRef(0);
  const lastPointer = useRef({ x: 0, y: 0 });
  const pawPrev = useRef<{ x: number; y: number } | null>(null);
  const wakeLine = useRef(0);
  const running = useRef(false);
  const leaving = useRef(false);
  const prevPath = useRef<string | null>(null);
  const seenPosts = useRef<Set<string>>(new Set());
  const lastRoutePhrase = useRef(0);
  const lastThemePhrase = useRef(0);
  const lastTypingLine = useRef(0);
  /* context-aware reactions: clicks, sections, contact form focus */
  const lastClickLine = useRef(0);
  const lastSectionAt = useRef(0);
  const lastContactFocus = useRef(0);
  const seenSections = useRef<Set<string>>(new Set());
  const lastHoverLine = useRef(0);
  const lastPaletteLine = useRef(0);
  const lastHelpLine = useRef(0);
  const lastSelectionLine = useRef(0);
  const lastFieldFocus = useRef(0);
  const lastGArmed = useRef(0);
  const lastPrintLine = useRef(0);
  const navTimesRef = useRef<number[]>([]);
  const lastRapidLine = useRef(0);
  const lastTabLine = useRef(0);
  const lastFooterLine = useRef(0);
  const lastRushUp = useRef(0);
  const lastSelectAll = useRef(0);
  const lastRepeatLine = useRef(0);
  const lastBubbleCopy = useRef(0);
  const lastJiggle = useRef(0);
  const lastScurry = useRef(0);
  const lastHighFive = useRef(0);
  const lastActRun = useRef(0);
  const lastEscapeLine = useRef(0);
  /* standoff intelligence: route-shaped base mode + temporary reasons to
     step back (selection, palette/help, form focus) */
  const standoffBase = useRef<StandoffBase>("follow");
  const standoffReasons = useRef<Set<"select" | "overlay" | "form">>(new Set());
  const standoffModeRef = useRef<StandoffMode>("follow");
  const standoffNum = useRef({ d: STANDOFF_DIST.follow });
  const lastStandoffLine = useRef(0);
  const lastRetreat = useRef(0);
  const lastCloseIn = useRef(0);
  const lastFormErr = useRef(0);
  const repeatTarget = useRef<Element | null>(null);
  const repeatStreak = useRef(0);
  const repeatReset = useRef(0);
  const tourDone = useRef(false);
  /* cat-tap streak for repeated-click escalation */
  const tapStreak = useRef<number[]>([]);
  /* session context the brain reads (see catTypes.CatContext) */
  const scrollPctRef = useRef(0);
  const visitsRef = useRef(1);
  const keyTimesRef = useRef<number[]>([]);
  const darkRef = useRef(
    document.documentElement.classList.contains("dark"),
  );
  const midSpokenRef = useRef(false);
  const endSpokenRef = useRef(false);
  /* note coach: posts that already got their overview, the last vault
     insight beat, and the next part in the current folder's series */
  const noteOverviewSeen = useRef<Set<string>>(new Set());
  const lastNoteInsight = useRef(0);
  const noteNextTitle = useRef<string | null>(null);
  const pendingProphecy = useRef<{
    verify: "scroll" | "click";
    hit: string;
    miss: string;
  } | null>(null);
  const prophecyTimer = useRef(0);

  const showPhrase = useCallback(
    (text: string, ms = 3200, force = false): boolean => {
      if (suggestRef.current) return false; /* suggestion owns the floor */
      const now = Date.now();
      if (!force && now - lastPhraseAt.current < PHRASE_GAP_MS) return false;
      window.clearTimeout(phraseTimer.current);
      lastPhraseAt.current = now;
      /* phrases linger so the streamed text can be read to the end:
         cover worst-case typing time (slow devices) plus read time */
      const typeBudget = text.length * 40;
      const life = Math.min(
        Math.max(Math.round(ms * 1.6), typeBudget + 2400),
        9000,
      );
      setPhrase({ text, ms: life });
      phraseTimer.current = window.setTimeout(() => setPhrase(null), life);
      return true;
    },
    [],
  );

  /* spotlight: sky-blue ring + sparkle burst on the UI she's recommending
     (seat/social/encourage/click targets); class removal is timed, never
     state — losing the timeout on unmount only leaves a stale class */
  const spotlight = useCallback((target: Element | null, ms = 2600) => {
    if (!target) return;
    const el = target as HTMLElement;
    if (!el.isConnected) return;
    el.classList.add("cat-spotlight");
    const r = el.getBoundingClientRect();
    spawnSparkles(
      Math.min(Math.max(r.left + r.width / 2, 20), window.innerWidth - 20),
      Math.min(Math.max(r.top + Math.min(r.height / 2, 60), 20), window.innerHeight - 20),
    );
    window.setTimeout(() => el.classList.remove("cat-spotlight"), ms);
  }, []);

  /* speak a UI line when the floor is free: honors the phrase gap and
     retries once it clears; cooldown is per-line via its ref */
  const sayUiLine = useCallback(
    (
      make: () => string,
      cooldown: { current: number },
      minGap: number,
      ms: number,
    ) => {
      const attempt = () => {
        const now = Date.now();
        if (suggestRef.current || document.hidden) return;
        if (now - cooldown.current < minGap) return;
        if (showPhrase(make(), ms, false)) {
          cooldown.current = now;
          return;
        }
        window.setTimeout(attempt, PHRASE_GAP_MS + 500);
      };
      attempt();
    },
    [showPhrase],
  );

  /* hovering a link worth exploring earns a nudge (per-kind + global
     cooldowns, never while she's already talking or suggesting) — and
     she names the real thing under the pointer: the project's title
     from its card, a note's filename, a pill's label, a repo slug */
  const encourageAt = useRef<Record<string, number>>({});
  const lastEncourageAny = useRef(0);
  useEffect(() => {
    const nameFor = (link: Element): string => {
      const h = link.querySelector("h1, h2, h3, h4");
      if (h && h.textContent && h.textContent.trim()) return h.textContent;
      const pill = link.querySelector(".tech-pill-name");
      if (pill && pill.textContent && pill.textContent.trim())
        return pill.textContent;
      const txt = (link.textContent || "").replace(/\s+/g, " ").trim();
      if (txt) return txt;
      const href = link.getAttribute("href") || "";
      const m = href.match(/github\.com\/[^/]+\/([^/?#]+)/);
      return m ? m[1] : "";
    };
    const onOver = (e: Event) => {
      const t = e.target;
      if (!(t instanceof Element) || document.hidden || suggestRef.current)
        return;
      const link = t.closest("a");
      if (!link) return;
      const href = link.getAttribute("href") || "";
      const ext =
        link.getAttribute("target") === "_blank" || /^https?:\/\//.test(href);
      const kind: EncourageKind | null = href.startsWith("mailto:")
        ? "email"
        : ext && href.includes("github")
          ? "github"
          : ext && /vercel\.app|netlify|pages\.dev|onrender|herokuapp|localhost/.test(href)
            ? "demo"
            : ext
              ? "social"
              : href.startsWith("/blog")
                ? "blog"
                : href.startsWith("/graph")
                  ? "graph"
                  : href.includes("contact")
                    ? "contact"
                    : null;
      if (!kind) return;
      const now = Date.now();
      if (now - lastEncourageAny.current < cd(14_000)) return;
      if (now - (encourageAt.current[kind] || 0) < cd(45_000)) return;
      if (now - lastPhraseAt.current < 4000) return; /* fresh line keeps the floor */
      const brain = brainRef.current;
      if (!brain) return;
      /* chrome labels (nav, tab bar) and bare "Contact" buttons read
         better with the generic pool; real titles get the named lines */
      const inChrome = !!link.closest("nav, header, .bottom-tabbar");
      const name = nameFor(link);
      const useAbout =
        !inChrome &&
        name.length >= 3 &&
        !(kind === "contact" && /^contact/i.test(name));
      const line = useAbout
        ? brain.encourageAbout(kind, name)
        : brain.encourageLine(kind);
      if (!showPhrase(line, 3600, true)) return;
      encourageAt.current[kind] = now;
      lastEncourageAny.current = now;
      spotlight(link, 2400);
    };
    document.addEventListener("mouseover", onOver, { passive: true });
    return () => document.removeEventListener("mouseover", onOver);
  }, [showPhrase, spotlight]);

  /* ---- note coach: she acts like she has read the vault ----
     on a post: overview when it opens, narration as sections cross the
     reading zone, a word for screenshots/boxes, and a next-part push at
     the end; on /blog: grounded folder counts from the real post list */
  useEffect(() => {
    const path = location.pathname;
    const onPost = path.startsWith("/blog/post/");
    const onIndex = path === "/blog";
    if (!onPost && !onIndex) return;

    let cancelled = false;
    let pollId = 0;
    const observers: IntersectionObserver[] = [];

    const brain = () => brainRef.current;
    const canSpeak = () =>
      !cancelled && !suggestRef.current && !document.hidden && brain() !== null;
    const loadPosts = async (): Promise<
      Awaited<ReturnType<typeof import("../blog/posts").getPosts>>
    > => {
      try {
        const m = await import("../blog/posts");
        return await m.getPosts();
      } catch {
        return [];
      }
    };

    if (onIndex) {
      /* real vault facts — wait for the route line's moment, then quote
         the actual folder tallies */
      void (async () => {
        const posts = await loadPosts();
        if (cancelled || !posts.length) return;
        await new Promise((r) => window.setTimeout(r, 5200));
        if (!canSpeak() || !nekoRef.current) return;
        if (Date.now() - lastPhraseAt.current < 5000) return;
        const counts = new Map<string, number>();
        for (const p of posts) {
          const top = p.dir.split("/").filter(Boolean)[0];
          if (top) counts.set(top, (counts.get(top) || 0) + 1);
        }
        let topFolder = "";
        let topCount = 0;
        counts.forEach((c, f) => {
          if (c > topCount) {
            topCount = c;
            topFolder = f;
          }
        });
        const b = brain();
        if (!topFolder || !b) return;
        lastNoteInsight.current = Date.now();
        showPhrase(
          b.vaultStatLine(posts.length, topFolder, topCount),
          5400,
          true,
        );
      })();
      return () => {
        cancelled = true;
      };
    }

    /* ---- a post: learn which part comes next in the folder series ---- */
    let slug = path.slice("/blog/post/".length);
    try {
      slug = decodeURIComponent(slug); /* location keeps the URL encoding */
    } catch {
      /* malformed escapes — use the raw segment */
    }
    noteNextTitle.current = null;
    void (async () => {
      const posts = await loadPosts();
      if (cancelled || !posts.length) return;
      const me = posts.find((p) => p.fullSlug === slug);
      if (!me) return;
      const { naturalCompare } = await import("../blog/tree");
      const after = posts
        .filter((p) => p.dir === me.dir && p.fullSlug !== slug)
        .sort((a, b2) => naturalCompare(a.fullSlug, b2.fullSlug))
        .find((p) => naturalCompare(p.fullSlug, slug) > 0);
      noteNextTitle.current = after?.title ?? null;
    })();

    /* ---- coach once the markdown has rendered into .blog-content ---- */
    let coached = false;
    const startCoach = (): boolean => {
      if (coached) return true;
      const art = document.querySelector(".blog-content");
      if (!art || art.childElementCount === 0) return false;
      coached = true;

      const stats: NoteStats = {
        sections: art.querySelectorAll("h2").length,
        shots: art.querySelectorAll("img").length,
        callouts: art.querySelectorAll(".callout").length,
        minutes: Math.max(
          1,
          Math.ceil((art.textContent || "").trim().split(/\s+/).length / 200),
        ),
        firstHeading:
          art.querySelector("h2, h3")?.textContent?.trim() ||
          document.title.split("|")[0].trim() ||
          "this note",
        /* his texture: deep ### nesting, fenced code, grids */
        subs: art.querySelectorAll("h3").length,
        codes: art.querySelectorAll("pre").length,
        tables: art.querySelectorAll("table").length,
      };

      /* overview — once per slug, after the route line has had its turn */
      if (!noteOverviewSeen.current.has(slug)) {
        noteOverviewSeen.current.add(slug);
        window.setTimeout(() => {
          if (!canSpeak()) return;
          const b = brain();
          if (!b) return;
          lastNoteInsight.current = Date.now();
          showPhrase(b.noteOverviewLine(stats), 6200, true);
        }, 5200);

        /* then one insight about HOW he wrote it, and the series trail
           ahead — fixed slots so an interleaved act line can't eat them */
        const scheduleInsight = (delay: number, make: () => string | null) => {
          window.setTimeout(() => {
            if (cancelled || !canSpeak()) return;
            const line = make();
            if (!line) return;
            lastNoteInsight.current = Date.now();
            showPhrase(line, 5600, true);
          }, delay);
        };
        scheduleInsight(10_500, () => brain()?.styleLine(stats) ?? null);
        scheduleInsight(17_000, () => {
          const next = noteNextTitle.current;
          return next ? brain()?.seriesLine(next) ?? null : null;
        });
      }

      /* section headings narrate as each crosses the reading zone —
         the line previews the next heading, pulling the reader on */
      const heads = Array.from(
        art.querySelectorAll<HTMLHeadingElement>("h2, h3, h4"),
      );
      const headSeen = new Set<Element>();
      const hObs = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const h = entry.target;
            if (headSeen.has(h)) continue;
            headSeen.add(h);
            if (!canSpeak()) continue;
            const now = Date.now();
            if (now - lastNoteInsight.current < 12_000) continue;
            if (now - lastPhraseAt.current < 6500) continue;
            const idx = heads.indexOf(h as HTMLHeadingElement);
            const nextH = heads[idx + 1]?.textContent?.trim() || undefined;
            const b = brain();
            if (!b) continue;
            lastNoteInsight.current = now;
            showPhrase(
              b.noteHeadingLine(h.textContent?.trim() || "", nextH),
              4600,
              true,
            );
          }
        },
        { rootMargin: "-28% 0px -50% 0px" },
      );
      heads.forEach((h) => hObs.observe(h));
      observers.push(hObs);

      /* screenshots and boxed facts get a word — the first couple only */
      const artSeen = new Set<Element>();
      let artifactWords = 0;
      const aObs = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const t = entry.target;
            if (artSeen.has(t)) continue;
            artSeen.add(t);
            if (!canSpeak() || artifactWords >= 2) continue;
            const now = Date.now();
            if (now - lastNoteInsight.current < 12_000) continue;
            if (now - lastPhraseAt.current < 6500) continue;
            const b = brain();
            if (!b) continue;
            artifactWords += 1;
            lastNoteInsight.current = now;
            if (t.classList.contains("callout")) {
              /* the renderer stamps the kind on the title row */
              const kind =
                Array.from(
                  t.querySelector(".callout-title")?.classList ?? [],
                ).find((c) => c !== "callout-title") ?? "";
              showPhrase(b.noteCalloutLine(kind), 4200, true);
            } else {
              showPhrase(b.noteShotLine(), 4200, true);
            }
          }
        },
        { rootMargin: "-22% 0px -40% 0px" },
      );
      art.querySelectorAll("img, .callout").forEach((el) => aObs.observe(el));
      observers.push(aObs);

      return true;
    };

    pollId = window.setInterval(() => {
      if (startCoach()) window.clearInterval(pollId);
    }, 700);
    window.setTimeout(() => window.clearInterval(pollId), 25_000);

    /* the note's end: this speaks instead of the generic scroll-end line
       (endSpokenRef is claimed here first) and spotlights the rendered
       next-part link when the folder has one. Checked both live and on
       a settle-timer: layout shifts (images failing/sizing) can clamp
       the scroll mid-flight without ever producing a >=93% event. */
    let endDebounce = 0;
    const tryEnd = () => {
      if (cancelled || endSpokenRef.current) return;
      const pct = Math.round(
        ((window.scrollY + window.innerHeight) /
          Math.max(document.documentElement.scrollHeight, 1)) *
          100,
      );
      if (pct < 93) return;
      endSpokenRef.current = true;
      midSpokenRef.current = true; /* the end moots "halfway" */
      const speakEnd = () => {
        if (!canSpeak()) return;
        const b = brain();
        if (!b) return;
        const next = noteNextTitle.current || undefined;
        lastNoteInsight.current = Date.now();
        showPhrase(b.noteEndLine(next), 6400, true);
        if (next) {
          const needle = next.slice(0, 22).toLowerCase();
          const link = Array.from(
            document.querySelectorAll<HTMLAnchorElement>(
              'a[href^="/blog/post/"]',
            ),
          ).find((a) => (a.textContent || "").toLowerCase().includes(needle));
          if (link) spotlight(link, 5200);
        }
      };
      if (Date.now() - lastPhraseAt.current < 4500) {
        window.setTimeout(speakEnd, 4700);
      } else {
        speakEnd();
      }
    };
    const onEnd = () => {
      tryEnd();
      window.clearTimeout(endDebounce);
      endDebounce = window.setTimeout(tryEnd, 400);
    };
    /* capture phase: the coach claims endSpokenRef before the generic
       bubble-phase scroll handler can speak its "end of page" line —
       the note's end always names the next part instead */
    window.addEventListener("scroll", onEnd, { passive: true, capture: true });

    /* remember how deep this note was read — she welcomes you back at
       that exact % on the next visit */
    const isNote = path.startsWith("/blog/post/");
    let lastReadSave = 0;
    const saveRead = (force: boolean) => {
      const now = Date.now();
      if (!force && now - lastReadSave < 2000) return;
      const pct = Math.round(
        ((window.scrollY + window.innerHeight) /
          Math.max(1, document.documentElement.scrollHeight)) *
          100,
      );
      if (pct < 5) return;
      lastReadSave = now;
      try {
        const raw = safeGet(localStorage, READS_KEY);
        const map: Record<string, number> = raw ? JSON.parse(raw) : {};
        /* deepest reach ever — later visits may only go further */
        map[slug] = Math.max(Number(map[slug]) || 0, pct);
        const keys = Object.keys(map);
        if (keys.length > 40) {
          for (const k of keys.slice(0, keys.length - 40)) delete map[k];
        }
        safeSet(localStorage, READS_KEY, JSON.stringify(map));
      } catch {
        /* private mode or quota — resume awareness stays off */
      }
    };
    const onRead = () => saveRead(false);
    if (isNote) {
      window.addEventListener("scroll", onRead, { passive: true });
    }

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      window.clearTimeout(endDebounce);
      observers.forEach((o) => o.disconnect());
      window.removeEventListener("scroll", onEnd, { capture: true });
      if (isNote) {
        window.removeEventListener("scroll", onRead);
        saveRead(true); /* final depth — where she last saw you */
      }
    };
  }, [location.pathname, showPhrase, spotlight]);

  /* suggestion accept (a / open button) · skip (d / skip button) */
  const acceptSuggestion = useCallback(() => {
    const sg = suggestRef.current;
    if (!sg) return;
    suggestRef.current = null;
    setSuggest(null);
    navigate(`/blog/post/${sg.path}`);
  }, [navigate]);

  const denySuggestion = useCallback(() => {
    if (!suggestRef.current) return;
    suggestRef.current = null;
    setSuggest(null);
    showPhrase(SUGGEST_DENY[rand(SUGGEST_DENY.length)], 2800, true);
  }, [showPhrase]);

  /* live context for the brain: route, hour, depth, pets, typing tempo */
  const getCtx = useCallback((): CatContext => {
    const now = Date.now();
    const kt = keyTimesRef.current;
    while (kt.length && now - kt[0] > 2000) kt.shift();
    return {
      path: window.location.pathname,
      hour: new Date().getHours(),
      scrollPct: scrollPctRef.current,
      visits: visitsRef.current,
      pets: Number(safeGet(localStorage, PET_KEY)) || 0,
      dark: darkRef.current,
      keyRate: kt.length / 2,
    };
  }, []);

  /* prophecies resolve here: matching gesture inside the window → hit */
  const checkProphecy = useCallback(
    (kind: "scroll" | "click") => {
      const p = pendingProphecy.current;
      if (!p || p.verify !== kind) return;
      pendingProphecy.current = null;
      window.clearTimeout(prophecyTimer.current);
      showPhrase(p.hit, 3000, true);
    },
    [showPhrase],
  );

  /* settle on the right standoff: GSAP eases the distance so the cat
     glides between "come here" and "i'll watch from here" instead of
     teleporting its stop point */
  const applyStandoff = useCallback(() => {
    const mode: StandoffMode =
      standoffReasons.current.size > 0 ? "back" : standoffBase.current;
    standoffModeRef.current = mode;
    const neko = nekoRef.current;
    if (!neko) return;
    const setDist = (d: number) => {
      (neko as unknown as { distanceFromMouse: number }).distanceFromMouse = d;
    };
    if (isReducedMotion()) {
      standoffNum.current.d = STANDOFF_DIST[mode];
      setDist(STANDOFF_DIST[mode]);
    } else {
      gsap.to(standoffNum.current, {
        d: STANDOFF_DIST[mode],
        duration: 0.7,
        ease: "power2.out",
        overwrite: true,
        onUpdate: () => setDist(standoffNum.current.d),
      });
      setDist(standoffNum.current.d);
    }
    neko.setSpeed(STANDOFF_SPEED[mode]);
    neko.setAnimationSpeed(STANDOFF_ANIM[mode]);
  }, []);

  /* shift gears: speed + foot cadence together; restorePace returns to
     whatever the room's standoff asks for — trot and faster leave a
     trail of little paw prints behind her */
  const printTimer = useRef(0);
  const pace = useCallback((tier: PaceTier) => {
    const n = nekoRef.current;
    if (!n) return;
    n.setSpeed(PACE[tier].speed);
    n.setAnimationSpeed(PACE[tier].anim);
    window.clearInterval(printTimer.current);
    if (tier === "trot" || tier === "run" || tier === "sprint") {
      printTimer.current = window.setInterval(() => {
        const c = nekoRef.current;
        if (!c || document.hidden) return;
        spawnPaw(c.position.x + rand(16) - 8, c.position.y + 20);
      }, 430);
    }
  }, []);

  const restorePace = useCallback(() => {
    const n = nekoRef.current;
    window.clearInterval(printTimer.current);
    if (!n) return;
    const mode = standoffModeRef.current;
    n.setSpeed(STANDOFF_SPEED[mode]);
    n.setAnimationSpeed(STANDOFF_ANIM[mode]);
  }, []);

  useEffect(
    () => () => window.clearInterval(printTimer.current),
    [],
  );

  const setStandoffReason = useCallback(
    (reason: "select" | "overlay" | "form", on: boolean) => {
      const set = standoffReasons.current;
      if (set.has(reason) === on) return;
      if (on) set.add(reason);
      else set.delete(reason);
      applyStandoff();
      /* stepping back is quiet; coming back close earns a word now and then */
      if (!on && set.size === 0) {
        const now = Date.now();
        const brain = brainRef.current;
        if (
          brain &&
          nekoRef.current &&
          !sleepingRef.current &&
          now - lastCloseIn.current >= cd(45_000) &&
          showPhrase(brain.closeInLine(), 2600, false)
        ) {
          lastCloseIn.current = now;
        }
      }
    },
    [applyStandoff, showPhrase],
  );

  /* load the brain in the background — stays out of the entry bundle;
     if the chunk never lands, cat.ts phrase banks keep working */
  useEffect(() => {
    let cancelled = false;
    void import("../lib/catBrain")
      .then((m) => {
        if (cancelled) return;
        brainRef.current = m;
        /* unknown path on a fresh load: speak once the greeting has had
           the floor (attempt, then retry every 3s until it lands) */
        const p = window.location.pathname;
        if (m.isKnownPath(p)) return;
        const line = m.routeLine(p, getCtx());
        const attempt = (delay: number) => {
          window.setTimeout(() => {
            if (cancelled) return;
            if (suggestRef.current || document.hidden) return;
            if (!showPhrase(line, 2600, false)) attempt(3000);
          }, delay);
        };
        attempt(2500);
      })
      .catch(() => {
        /* offline / blocked chunk — fallback lines are already wired */
      });
    return () => {
      cancelled = true;
    };
  }, [getCtx, showPhrase]);

  const markActivity = useCallback(() => {
    const now = Date.now();
    lastActivity.current = now;
    lastInput.current = now;
    if (sleepingRef.current && nekoRef.current) {
      sleepingRef.current = false;
      nekoRef.current.wake();
      setSleeping(false);
      if (now - lastSleptAt.current > cd(14_000)) {
        const brain = brainRef.current;
        showPhrase(
          brain
            ? brain.wakeLine()
            : WAKE_LINES[wakeLine.current++ % WAKE_LINES.length],
          2400,
          true,
        );
      }
    }
  }, [showPhrase]);

  /* trusted pointer/keyboard activity drives idle detection + last target */
  useEffect(() => {
    lastActivity.current = Date.now();
    lastInput.current = lastActivity.current;
    lastPointer.current = {
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.55,
    };
    /* rapid direction changes: the cursor is chasing something too */
    let lastDx = 0;
    let lastDy = 0;
    let lastPX = -1;
    let lastPY = -1;
    let jiggleFlips = 0;
    let jiggleWindow = 0;
    /* sustained cursor speed: one friendly word when you're flying */
    let lastMoveAt = 0;
    let speedStreak = 0;
    const standoffObj = standoffNum.current;
    const onMove = (e: Event) => {
      const t = e as MouseEvent;
      if (!t.isTrusted) return;
      lastPointer.current = { x: t.clientX, y: t.clientY };
      markActivity();
      const dx = lastPX < 0 ? 0 : t.clientX - lastPX;
      const dy = lastPY < 0 ? 0 : t.clientY - lastPY;
      lastPX = t.clientX;
      lastPY = t.clientY;
      const now = Date.now();
      /* px/ms: a frantic sweep cruises past ~1.3, normal pointing sits
         well under — eight fast samples in a row earns the scurry line */
      const dt = now - lastMoveAt;
      lastMoveAt = now;
      if (dx !== 0 || dy !== 0) {
        if (dt >= 8 && dt < 400) {
          const v = Math.hypot(dx, dy) / dt;
          if (v > 1.3) speedStreak += 1;
          else speedStreak = Math.max(0, speedStreak - 1);
          if (speedStreak >= 8) {
            speedStreak = 0;
            const speedBrain = brainRef.current;
            if (speedBrain) {
              sayUiLine(
                () => speedBrain.speedLine(),
                lastScurry,
                cd(70_000),
                2800,
              );
            }
          }
        }
      } else if (dt > 400) {
        speedStreak = 0;
      }
      const flipped =
        (Math.abs(dx) > 3 && lastDx !== 0 && Math.sign(dx) !== Math.sign(lastDx)) ||
        (Math.abs(dy) > 3 && lastDy !== 0 && Math.sign(dy) !== Math.sign(lastDy));
      /* the window advances only on flips, so the count covers changes
         within 1.2s of each other — not "since the mouse last paused" */
      if (flipped) {
        if (now - jiggleWindow > 1200) jiggleFlips = 0;
        jiggleWindow = now;
        jiggleFlips += 1;
      }
      if (dx !== 0) lastDx = dx;
      if (dy !== 0) lastDy = dy;
      if (jiggleFlips >= 7) {
        jiggleFlips = 0;
        const brain = brainRef.current;
        if (brain) {
          sayUiLine(() => brain.jiggleLine(), lastJiggle, cd(45_000), 3000);
        }
      }
      /* standoff intelligence: in observe/back mode a crowding cursor gets
         gently shown a wider berth — pick the escape heading that gains the
         most ground (corners and walls included) and say so, once a while */
      const mode = standoffModeRef.current;
      if (
        (mode === "observe" || mode === "back") &&
        !sleepingRef.current &&
        nekoRef.current
      ) {
        const neko = nekoRef.current;
        const sd = standoffNum.current.d;
        const rx = neko.position.x - t.clientX;
        const ry = neko.position.y - t.clientY;
        const rdist = Math.hypot(rx, ry);
        if (rdist > 1 && rdist < sd && now - lastRetreat.current > 140) {
          const travel = sd + 100;
          const ux = rx / rdist;
          const uy = ry / rdist;
          let bx = 0;
          let by = 0;
          let bgain = -1;
          for (const deg of [0, 60, -60, 120, -120, 180]) {
            const a = (deg * Math.PI) / 180;
            const hx = Math.cos(a) * ux - Math.sin(a) * uy;
            const hy = Math.sin(a) * ux + Math.cos(a) * uy;
            const tx = Math.min(
              Math.max(neko.position.x + hx * travel, 48),
              window.innerWidth - 48,
            );
            const ty = Math.min(
              Math.max(neko.position.y + hy * travel, 48),
              window.innerHeight - 48,
            );
            const moved = Math.hypot(
              tx - neko.position.x,
              ty - neko.position.y,
            );
            if (moved < 80) continue;
            const away = Math.hypot(tx - t.clientX, ty - t.clientY);
            if (away > bgain) {
              bgain = away;
              bx = tx;
              by = ty;
            }
          }
          if (bgain > rdist) {
            lastRetreat.current = now;
            seedPointer(bx, by);
            const brain = brainRef.current;
            if (
              brain &&
              now - lastStandoffLine.current >= cd(45_000) &&
              showPhrase(
                brain.standoffLine(mode === "observe" ? "observe" : "back"),
                3200,
                true,
              )
            ) {
              lastStandoffLine.current = now;
            }
          }
        }
      }
    };
    const onTouch = (e: Event) => {
      const t = e as TouchEvent;
      if (!t.isTrusted || !t.touches[0]) return;
      lastPointer.current = {
        x: t.touches[0].clientX,
        y: t.touches[0].clientY,
      };
      markActivity();
    };
    /* set by onAny when Escape is what dismissed the suggestion, so the
       escape line stays quiet even though onAny runs first and clears
       suggestRef before onEscapeKey sees it */
    let escapeDismissedSuggest = false;
    const onAny = (e: Event) => {
      if (!e.isTrusted) return;
      /* gestures resolve a pending prophecy (wheel counts as scrolling) */
      if (e.type !== "keydown") {
        checkProphecy(e.type === "wheel" ? "scroll" : "click");
      }
      if (suggestRef.current) {
        /* a opens the suggestion, d skips it — unless the visitor is typing */
        if (e.type === "keydown") {
          const k = (e as KeyboardEvent).key.toLowerCase();
          const el = document.activeElement;
          const typing =
            !!el &&
            (el.tagName === "INPUT" ||
              el.tagName === "TEXTAREA" ||
              (el as HTMLElement).isContentEditable);
          if (!typing && (k === "a" || k === "d")) {
            if (k === "a") acceptSuggestion();
            else denySuggestion();
            markActivity();
            return;
          }
        }
        /* clicks/keys outside the suggestion dismiss it; reaching for the
           bubble itself (mouse moves, taps on the link) must not kill it */
        const t = e.target;
        if (!(t instanceof Element && t.closest(".cat-suggest"))) {
          if (e.type === "keydown" && (e as KeyboardEvent).key === "Escape") {
            escapeDismissedSuggest = true;
          }
          suggestRef.current = null;
          setSuggest(null);
        }
      }
      markActivity();
    };
    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("touchmove", onTouch, { passive: true });
    document.addEventListener("pointerdown", onAny, { passive: true });
    document.addEventListener("keydown", onAny);
    window.addEventListener("wheel", onAny, { passive: true });

    /* clicks: react to what the visitor is exploring — mail, external
       links, cards, graph nodes. in-app navigation stays quiet because
       the route line already comments on arrivals */
    const onCatClick = (e: Event) => {
      const t = e.target;
      if (
        !e.isTrusted ||
        !(t instanceof Element) ||
        document.hidden ||
        suggestRef.current
      )
        return;
      if (t.closest(".cat-suggest, .cat-bubble-anchor, [data-neko]")) return;
      /* clicks ON the cat belong to the pet/tap handlers, not us */
      const nearNeko = nekoRef.current;
      const pt = e as MouseEvent;
      if (
        nearNeko &&
        Math.hypot(pt.clientX - nearNeko.position.x, pt.clientY - nearNeko.position.y) < 56
      )
        return;
      const now = Date.now();
      /* three rapid clicks on one target: the repeat line beats the
         per-click throttle (it is the point of the observation) */
      const target =
        t.closest("a, .feature-card, .exp-card-wrapper, .app-showcase, canvas") || t;
      if (target === repeatTarget.current) repeatStreak.current += 1;
      else {
        repeatTarget.current = target;
        repeatStreak.current = 1;
      }
      window.clearTimeout(repeatReset.current);
      repeatReset.current = window.setTimeout(() => {
        repeatStreak.current = 0;
      }, 8000);
      if (
        repeatStreak.current >= 3 &&
        now - lastRepeatLine.current >= cd(30_000) &&
        brainRef.current &&
        nekoRef.current
      ) {
        repeatStreak.current = 0;
        lastRepeatLine.current = now;
        lastClickLine.current = now;
        showPhrase(brainRef.current.repeatLine(), 3600, true);
        return;
      }
      if (now - lastClickLine.current < cd(7000)) return;
      const brain = brainRef.current;
      if (!brain || !nekoRef.current) return;
      const a = t.closest("a");
      let line: string | null = null;
      if (a) {
        const href = a.getAttribute("href") || "";
        if (href.startsWith("mailto:")) {
          line = brain.clickLine("email");
        } else if (href.includes("#") && !href.startsWith("http")) {
          /* in-page anchor: speak for the destination section and let the
             scroll have the stage (suppress observer + route lines) */
          const id = href.split("#")[1];
          if (id) {
            lastSectionAt.current = now;
            lastRoutePhrase.current = now;
            seenSections.current.add(id);
            if (!tourDone.current && seenSections.current.size >= 4) {
              tourDone.current = true;
              line = brain.tourLine();
            } else {
              line = brain.sectionLine(id);
            }
          }
        } else if (href.startsWith("http") || a.target === "_blank") {
          let host = "";
          try {
            host = new URL(href, window.location.href).hostname;
          } catch {
            /* odd href — generic external line below */
          }
          if (host.includes("itch.io")) line = brain.clickLine("games");
          else if (host.includes("github.com")) line = brain.clickLine("github");
          else if (host.includes("linkedin.com")) line = brain.clickLine("linkedin");
          else if (host.includes("leetcode.com")) line = brain.clickLine("leetcode");
          else if (host.includes("x.com") || host.includes("twitter.com"))
            line = brain.clickLine("x");
          else line = brain.clickLine("external");
        }
        /* same-tab internal links: the route line speaks on arrival */
      } else if (
        t.closest(".feature-card, .exp-card-wrapper, .app-showcase")
      ) {
        line = brain.clickLine("card");
      } else if (t.closest("canvas") && window.location.pathname === "/graph") {
        line = brain.clickLine("graph");
      }
      if (!line) return;
      lastClickLine.current = now;
      showPhrase(line, 3600, true);
      /* clicking a social/external/mail link also lights the target up —
         her endorsement lands with the click */
      if (
        a &&
        (a.target === "_blank" || (a.getAttribute("href") || "").startsWith("mailto:"))
      ) {
        spotlight(a, 3000);
      }
    };

    /* touching the contact form earns a nudge (once, politely) */
    const onContactFocus = (e: Event) => {
      const t = e.target;
      if (!(t instanceof Element) || document.hidden || suggestRef.current)
        return;
      if (!t.closest("#contact")) return;
      const now = Date.now();
      if (now - lastContactFocus.current < cd(25_000)) return;
      if (now - lastSectionAt.current < cd(12_000)) return;
      if (now - lastPhraseAt.current < 3000) return; /* fresh line has the floor */
      const brain = brainRef.current;
      if (!brain || !nekoRef.current) return;
      lastContactFocus.current = now;
      showPhrase(brain.sectionLine("contact"), 3600, true);
    };

    document.addEventListener("click", onCatClick);
    /* the contact nudge registers before the per-field word: both listen
       on focusin, and the force line must claim the floor first (the field
       word is non-force and would otherwise win the same event) */
    document.addEventListener("focusin", onContactFocus);
    /* big selections, contact-field focus, the vim g-prefix, and printing
       each get one quiet word (non-force: a fresh phrase keeps the floor) */
    const onSelectChange = () => {
      const sel = document.getSelection();
      const len = sel ? sel.toString().length : 0;
      /* any highlight backs her off the words; longer ones also get a line */
      setStandoffReason("select", len > 0);
      if (!sel || len < 120) return;
      const brain = brainRef.current;
      if (!brain) return;
      if (len >= 3000) {
        sayUiLine(() => brain.selectAllLine(), lastSelectAll, cd(30_000), 3000);
        return;
      }
      const node = sel.anchorNode;
      const inBubble =
        (node instanceof Element ? node : node?.parentElement)?.closest(
          ".cat-bubble",
        ) !== null;
      if (inBubble && len >= 15) {
        sayUiLine(() => brain.bubbleCopyLine(), lastBubbleCopy, cd(30_000), 3000);
        return;
      }
      sayUiLine(() => brain.selectionLine(), lastSelectionLine, cd(30_000), 3000);
    };
    const onFieldFocus = (e: Event) => {
      syncFormReason();
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const field =
        t.id === "name" ? "name" : t.id === "email" ? "email" : t.id === "message" ? "message" : null;
      if (!field) return;
      const brain = brainRef.current;
      if (!brain) return;
      sayUiLine(() => brain.focusLine(field), lastFieldFocus, cd(5_000), 3000);
    };
    /* typing in a field (any field) = she stops hovering over your words */
    const syncFormReason = () => {
      const el = document.activeElement;
      setStandoffReason(
        "form",
        !!el &&
          (el.tagName === "INPUT" ||
            el.tagName === "TEXTAREA" ||
            (el as HTMLElement).isContentEditable),
      );
    };
    const onFocusOut = () => {
      window.setTimeout(syncFormReason, 0);
    };
    /* the palette and the shortcuts sheet are someone else's moment —
       watch for their mount/unmount and give them the room */
    let overlayRaf = 0;
    const syncOverlay = () => {
      if (overlayRaf) return;
      overlayRaf = window.requestAnimationFrame(() => {
        overlayRaf = 0;
        setStandoffReason(
          "overlay",
          document.querySelector(
            '[data-testid="command-palette"], [data-testid="shortcuts-help"]',
          ) !== null,
        );
      });
    };
    const overlayObs = new MutationObserver(syncOverlay);
    overlayObs.observe(document.body, { childList: true, subtree: true });
    const onGArmed = () => {
      const brain = brainRef.current;
      if (!brain) return;
      sayUiLine(() => brain.gArmedLine(), lastGArmed, cd(30_000), 3000);
    };
    const onBeforePrint = () => {
      const brain = brainRef.current;
      if (!brain) return;
      sayUiLine(() => brain.printLine(), lastPrintLine, cd(60_000), 3000);
    };
    document.addEventListener("selectionchange", onSelectChange);
    document.addEventListener("focusin", onFieldFocus);
    document.addEventListener("focusout", onFocusOut);
    window.addEventListener("g-armed", onGArmed);
    window.addEventListener("beforeprint", onBeforePrint);

    /* four or more Tab presses in a row: the keyboard tour earns a word */
    let tabTaps = 0;
    let tabTimer = 0;
    const onTabKey = (e: Event) => {
      const t = e as KeyboardEvent;
      if (t.key !== "Tab") return;
      const el = document.activeElement;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          (el as HTMLElement).isContentEditable)
      )
        return;
      tabTaps += 1;
      window.clearTimeout(tabTimer);
      tabTimer = window.setTimeout(() => {
        tabTaps = 0;
      }, 12000);
      if (tabTaps < 4) return;
      tabTaps = 0;
      const brain = brainRef.current;
      if (!brain) return;
      sayUiLine(() => brain.tabLine(), lastTabLine, cd(30_000), 3000);
    };
    document.addEventListener("keydown", onTabKey);

    /* escape with nothing open: a comment, not a correction */
    const onEscapeKey = (e: Event) => {
      const t = e as KeyboardEvent;
      const dismissedSuggest = escapeDismissedSuggest;
      escapeDismissedSuggest = false;
      if (t.key !== "Escape") return;
      const el = document.activeElement;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          (el as HTMLElement).isContentEditable)
      )
        return;
      /* escape also closes overlays elsewhere (help sheet, theme menu,
         graph node card, palette). React has not committed their removal
         yet, so they are still queryable from this handler. */
      if (
        document.querySelector(
          '[role="dialog"], .theme-toggle-menu, .graph-card-in',
        )
      )
        return;
      const brain = brainRef.current;
      if (!brain || dismissedSuggest || suggestRef.current || document.hidden)
        return;
      sayUiLine(() => brain.escapeLine(), lastEscapeLine, cd(30_000), 3000);
    };
    document.addEventListener("keydown", onEscapeKey);

    /* writing a real message earns one quiet word of encouragement */
    let messageNudged = false;

    const onFormInput = (e: Event) => {
      const t = e.target;
      if (!(t instanceof HTMLTextAreaElement) || t.id !== "message") return;
      if (messageNudged || t.value.length < 24) return;
      if (suggestRef.current || document.hidden) return;
      const brain = brainRef.current;
      if (!brain || !nekoRef.current) return;
      messageNudged = true;
      showPhrase(brain.messageLine(), 3600, true);
    };
    document.addEventListener("input", onFormInput);

    /* the contact form dispatches this after EmailJS resolves */
    let celebDone = false;
    const onSent = () => {
      if (celebDone || suggestRef.current || document.hidden) return;
      const brain = brainRef.current;
      const neko = nekoRef.current;
      if (!brain || !neko) return;
      celebDone = true;
      const { x, y } = neko.position;
      spawnHearts(x, y, 8);
      spawnSparkles(x, y);
      showPhrase(brain.celebrationLine(), 5200, true);
    };
    window.addEventListener("contact-sent", onSent);

    /* rejected send: one word for the whole miss, capped at once per 45s */
    const onInvalid = () => {
      const now = Date.now();
      if (now - lastFormErr.current < cd(45_000)) return;
      const brain = brainRef.current;
      if (!brain || suggestRef.current || document.hidden || !nekoRef.current) return;
      lastFormErr.current = now;
      showPhrase(brain.formErrorLine(), 2800, true);
    };
    window.addEventListener("contact-invalid", onInvalid);

    /* the palette and the shortcuts sheet each earn one word, 30s apart,
       and never while a suggestion holds the floor */
    const onPalette = () => {
      const brain = brainRef.current;
      if (!brain) return;
      sayUiLine(() => brain.paletteLine(), lastPaletteLine, cd(30_000), 3000);
    };
    const onHelpSheet = () => {
      const brain = brainRef.current;
      if (!brain) return;
      sayUiLine(() => brain.helpLine(), lastHelpLine, cd(30_000), 3000);
    };
    window.addEventListener("palette-opened", onPalette);
    window.addEventListener("help-opened", onHelpSheet);


    /* proximity hover: the sprite has pointer-events:none (neko-ts inline),
       so pointerover never fires — we do the distance math ourselves.
       Hysteresis (40 in, 64 out) keeps the perk-up from flickering */
    let hoveringCat = false;
    const onHoverMove = (e: Event) => {
      const t = e as MouseEvent;
      if (!t.isTrusted) return;
      const neko = nekoRef.current;
      const root = document.querySelector<HTMLElement>('[data-neko="0"]');
      if (!neko || !root) {
        hoveringCat = false;
        return;
      }
      const d = Math.hypot(t.clientX - neko.position.x, t.clientY - neko.position.y);
      if (d < 40 && !hoveringCat) {
        hoveringCat = true;
        /* a curious tilt-lean, tweened (transform stays neko-free) */
        if (!isReducedMotion()) {
          gsap
            .timeline({ overwrite: "auto" })
            .to(root, { scale: 1.07, rotation: 4, duration: 0.24, ease: "power2.out" })
            .to(root, { scale: 1.03, rotation: -3, duration: 0.24, ease: "sine.inOut" })
            .to(root, { scale: 1, rotation: 0, duration: 0.32, ease: "sine.out" });
        }
        const now = Date.now();
        if (now - lastHoverLine.current < cd(28_000)) return;
        if (suggestRef.current || document.hidden) return;
        const brain = brainRef.current;
        if (!brain || !nekoRef.current) return;
        lastHoverLine.current = now;
        showPhrase(brain.hoverLine(sleepingRef.current), 2800, true);
      } else if (d > 64 && hoveringCat) {
        hoveringCat = false;
        if (isReducedMotion()) {
          gsap.set(root, { scale: 1, rotation: 0 });
        } else {
          gsap.to(root, {
            scale: 1,
            rotation: 0,
            duration: 0.18,
            overwrite: "auto",
          });
        }
      }
    };
    document.addEventListener("mousemove", onHoverMove, { passive: true });

    /* typing tempo feeds ctx.keyRate; a fast burst outside inputs earns
       an occasional comment (gap + 45s cooldown keep it easy-going) */
    const onKeyRate = (e: Event) => {
      const t = e as KeyboardEvent;
      if (!t.key || t.key.length !== 1) return;
      const now = Date.now();
      const kt = keyTimesRef.current;
      kt.push(now);
      while (kt.length && now - kt[0] > 2000) kt.shift();
      const el = document.activeElement;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          (el as HTMLElement).isContentEditable)
      )
        return;
      if (kt.length < 6) return;
      if (now - lastPhraseAt.current < PHRASE_GAP_MS) return;
      if (now - lastTypingLine.current < cd(45_000)) return;
      const brain = brainRef.current;
      if (!brain || !nekoRef.current || suggestRef.current) return;
      lastTypingLine.current = now;
      showPhrase(brain.typingLine(true), 2600);
    };
    document.addEventListener("keydown", onKeyRate);

    /* copying text earns a one-liner (only real selections count) */
    const onCopy = () => {
      const sel = window.getSelection()?.toString();
      if (!sel || !sel.trim()) return;
      if (!nekoRef.current || suggestRef.current) return;
      const brain = brainRef.current;
      if (!brain) return;
      showPhrase(brain.copyLine(), 3000);
    };
    document.addEventListener("copy", onCopy);

    /* type "pspsps" to call the cat back; words like luna/meow/hire/joke
       help/fish/thanks/sachin/nya/tuna/yarn/nap/chai/dog/cat/box/sudo/
       ship/bug/coffee/music/game/resume/job/love/dance/email/git/python/
       react/arch/who/why earn answers — and sometimes props — outside
       form fields */
    let psBuf = "";
    let lastPs = 0;
    let lastWord = 0;
    const onKeyType = (e: Event) => {
      const t = e as KeyboardEvent;
      const el = document.activeElement;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          (el as HTMLElement).isContentEditable)
      )
        return;
      if (!t.key || t.key.length !== 1 || !/[a-z]/i.test(t.key)) return;
      psBuf = (psBuf + t.key.toLowerCase()).slice(-12);
      if (psBuf.endsWith("pspsps")) {
        psBuf = "";
        const now = Date.now();
        if (now - lastPs < cd(8000)) return;
        lastPs = now;
        const neko = nekoRef.current;
        if (!neko) return;
        if (sleepingRef.current) {
          sleepingRef.current = false;
          neko.wake();
          setSleeping(false);
        }
        seedPointer(lastPointer.current.x, lastPointer.current.y);
        spawnSparkles(neko.position.x, neko.position.y);
        showPhrase(`pspsps~ ${CAT_NAME} reporting.`, 3000, true);
        pace("run");
        window.setTimeout(() => restorePace(), 2000);
        return;
      }
      const brain = brainRef.current;
      if (!brain || document.hidden) return;
      const word = brain.matchKeyword(psBuf);
      if (!word) return;
      /* a real cat word owns this keypress — don't let window-level
         shortcuts (like the 't' theme flip) shadow the reply */
      t.stopPropagation();
      psBuf = "";
      const now = Date.now();
      if (now - lastWord < cd(6000)) return;
      lastWord = now;
      const neko = nekoRef.current;
      if (neko && sleepingRef.current) {
        sleepingRef.current = false;
        neko.wake();
        setSleeping(false);
      }
      if (neko) {
        const { x, y } = neko.position;
        if (word === "fish" || word === "tuna" || word === "docker")
          spawnFish(x, y, x > window.innerWidth / 2 ? -1 : 1);
        else if (word === "luna" || word === "thanks" || word === "nya")
          spawnHearts(x, y, 5);
        else if (word === "sachin" || word === "chai") spawnSparkles(x, y);
        else if (word === "yarn") spawnYarn(x, y);
        else if (word === "cat") spawnSparkles(x, y);
        else if (word === "box") spawnHearts(x, y, 4);
        else if (word === "bug") spawnSparkles(x, y);
        else if (word === "game") spawnYarn(x, y);
        else if (word === "music") spawnHearts(x, y, 5);
        else if (word === "coffee") {
          /* caffeine: a sparkly run, then back to whatever the room asks */
          spawnSparkles(x, y);
          pace("run");
          window.setTimeout(() => restorePace(), 1200);
        }
        else if (word === "love") spawnHearts(x, y, 8);
        else if (word === "resume") spawnSparkles(x, y);
        else if (word === "dance") {
          spawnSparkles(x, y);
          pace("trot");
          window.setTimeout(() => restorePace(), 900);
        }
        else if (word === "git" || word === "python" || word === "react")
          spawnSparkles(x, y);
        else if (word === "arch") {
          spawnSparkles(x, y);
          pace("sprint");
          window.setTimeout(() => restorePace(), 1000);
        }
        else if (word === "node" || word === "linux" || word === "typescript")
          spawnSparkles(x, y);
        else if (word === "hello") spawnHearts(x, y, 5);
        else if (word === "wow") spawnSparkles(x, y);
        else if (word === "nice") spawnSparkles(x, y);
        else if (word === "cool") spawnHearts(x, y, 4);
        else if (word === "india") spawnSparkles(x, y);
        else if (word === "sql" || word === "java") spawnSparkles(x, y);
        else if (word === "api") spawnHearts(x, y, 4);
        else if (word === "biryani") spawnHearts(x, y, 8);
        else if (word === "rust") {
          spawnSparkles(x, y);
          pace("sprint");
          window.setTimeout(() => restorePace(), 1000);
        }
        else if (word === "mouse") spawnYarn(x, y);
        else if (word === "bird") {
          spawnSparkles(x, y);
          pace("trot");
          window.setTimeout(() => restorePace(), 900);
        }
        else if (word === "tea") spawnHearts(x, y, 4);
        else if (word === "pizza") spawnHearts(x, y, 6);
        else if (word === "travel") spawnSparkles(x, y);
        else if (word === "merge") spawnHearts(x, y, 4);
        else if (word === "lint" || word === "art") spawnSparkles(x, y);
        else if (word === "dream") {
          /* dreaming counts as napping */
          sleepingRef.current = true;
          lastSleptAt.current = Date.now();
          neko.sleep();
          setSleeping(true);
        }
        else if (word === "treat") spawnHearts(x, y, 6);
        else if (word === "belly") spawnHearts(x, y, 5);
        else if (word === "star" || word === "logic") spawnSparkles(x, y);
        else if (word === "sing") spawnHearts(x, y, 5);
        else if (word === "play") spawnYarn(x, y);
        else if (word === "hide") spawnSparkles(x, y);
        else if (word === "fetch") {
          /* fetch is a dog word — the cat sprints off anyway */
          spawnSparkles(x, y);
          pace("sprint");
          window.setTimeout(() => restorePace(), 1200);
        }
        else if (word === "vim") spawnHearts(x, y, 6);
        else if (word === "deploy") {
          spawnSparkles(x, y);
          pace("sprint");
          window.setTimeout(() => restorePace(), 1000);
        }
        else if (word === "dog") {
          /* dogs get chased off the premises */
          spawnSparkles(x, y);
          pace("sprint");
          seedPointer(
            x < window.innerWidth / 2 ? window.innerWidth - 64 : 64,
            window.innerHeight * 0.24,
          );
          window.setTimeout(() => {
            restorePace();
            seedPointer(lastPointer.current.x, lastPointer.current.y);
          }, 1400);
        } else if (word === "nap") {
          sleepingRef.current = true;
          lastSleptAt.current = Date.now();
          neko.sleep();
          setSleeping(true);
        }
        else if (
          word === "css" ||
          word === "html" ||
          word === "aws" ||
          word === "graphql" ||
          word === "redis" ||
          word === "figma" ||
          word === "tailwind" ||
          word === "seo" ||
          word === "llm" ||
          word === "remote"
        )
          spawnSparkles(x, y);
        else if (word === "tests") {
          /* green tests: a happy trot */
          spawnSparkles(x, y);
          pace("trot");
          window.setTimeout(() => restorePace(), 900);
        }
        else if (word === "offer" || word === "salary") spawnHearts(x, y, 8);
        else if (word === "internship" || word === "ramen") spawnHearts(x, y, 6);
      }
      showPhrase(brain.keywordLine(word), 4400, true);
    };
    document.addEventListener("keydown", onKeyType);

    /* coming back to the tab after a real absence earns a comment */
    let hiddenAt = 0;
    let lastReturnLine = 0;
    const onVis = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        return;
      }
      const away = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = 0;
      if (away < cd(8000)) return;
      const now = Date.now();
      if (now - lastReturnLine < cd(60_000)) return;
      const brain = brainRef.current;
      if (!brain || suggestRef.current || !nekoRef.current) return;
      lastReturnLine = now;
      showPhrase(brain.absentLine(away), 4200, true);
    };
    document.addEventListener("visibilitychange", onVis);

    /* a violent wheel burst gets called out (once in a while) */
    let rushSum = 0;
    let rushSumDir = 0;
    let rushAt = 0;
    let lastRushLine = 0;
    const onWheelRush = (e: Event) => {
      const now = Date.now();
      if (now - rushAt > 500) {
        rushSum = 0;
        rushAt = now;
      }
      const dy = (e as WheelEvent).deltaY;
      rushSum += Math.abs(dy);
      rushSumDir += dy;
      if (rushSum < 1400) return;
      const upward = rushSumDir < 0;
      rushSum = 0;
      rushSumDir = 0;
      if (now - lastRushLine < 20_000) return;
      const brain = brainRef.current;
      if (!brain || suggestRef.current || document.hidden || !nekoRef.current)
        return;
      lastRushLine = now;
      if (upward && now - lastRushUp.current >= cd(45_000)) {
        lastRushUp.current = now;
        showPhrase(brain.rushUpLine(), 3200, true);
        return;
      }
      showPhrase(brain.rushLine(), 3200, true);
    };
    window.addEventListener("wheel", onWheelRush, { passive: true });

    /* a big window resize recalculates the nap coordinates */
    let lastW = window.innerWidth;
    let lastH = window.innerHeight;
    let lastResizeLine = 0;
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const dw = Math.abs(window.innerWidth - lastW);
        const dh = Math.abs(window.innerHeight - lastH);
        lastW = window.innerWidth;
        lastH = window.innerHeight;
        if (dw < 150 && dh < 150) return;
        const now = Date.now();
        if (now - lastResizeLine < cd(30_000)) return;
        const brain = brainRef.current;
        if (!brain || suggestRef.current || document.hidden || !nekoRef.current)
          return;
        lastResizeLine = now;
        showPhrase(brain.resizeLine(), 3200, true);
      }, 700);
    };
    window.addEventListener("resize", onResize);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("touchmove", onTouch);
      document.removeEventListener("pointerdown", onAny);
      document.removeEventListener("keydown", onAny);
      document.removeEventListener("keydown", onKeyType);
      document.removeEventListener("keydown", onKeyRate);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("contact-sent", onSent);
      window.removeEventListener("contact-invalid", onInvalid);
      window.removeEventListener("palette-opened", onPalette);
      window.removeEventListener("help-opened", onHelpSheet);
      document.removeEventListener("selectionchange", onSelectChange);
      document.removeEventListener("focusin", onFieldFocus);
      document.removeEventListener("focusout", onFocusOut);
      overlayObs.disconnect();
      if (overlayRaf) window.cancelAnimationFrame(overlayRaf);
      gsap.killTweensOf(standoffObj);
      window.removeEventListener("g-armed", onGArmed);
      window.removeEventListener("beforeprint", onBeforePrint);
      document.removeEventListener("keydown", onTabKey);
      window.clearTimeout(tabTimer);
      document.removeEventListener("keydown", onEscapeKey);
      window.clearTimeout(repeatReset.current);
      window.removeEventListener("wheel", onWheelRush);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeTimer);
      document.removeEventListener("click", onCatClick);
      document.removeEventListener("focusin", onContactFocus);
      window.removeEventListener("wheel", onAny);
    };
  }, [markActivity, showPhrase, checkProphecy, acceptSuggestion, denySuggestion, setStandoffReason, pace, restorePace, spotlight, sayUiLine]);

  /* Alt+C shooes / summons the cat for good (the opt-out persists) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          (el as HTMLElement).isContentEditable)
      )
        return;
      if (!e.altKey || e.code !== "KeyC") return;
      if (!enabled) {
        setEnabled(true);
        return;
      }
      if (leaving.current) return;
      const catEl = document.querySelector<HTMLElement>('[data-neko="0"]');
      if (!catEl) {
        setEnabled(false);
        return;
      }
      catEl.classList.add("cat-leaving");
      leaving.current = true;
      window.setTimeout(() => {
        leaving.current = false;
        setEnabled(false);
      }, 340);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);

  useEffect(() => {
    safeSet(localStorage, SHOO_KEY, enabled ? "0" : "1");
  }, [enabled]);

  /* cat reacts to theme flips */
  useEffect(() => {
    let lastTheme = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    const obs = new MutationObserver(() => {
      const theme = document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
      if (theme === lastTheme) return;
      lastTheme = theme;
      darkRef.current = theme === "dark";
      if (!nekoRef.current) return;
      const now = Date.now();
      if (now - lastThemePhrase.current < cd(8000)) return;
      lastThemePhrase.current = now;
      const brain = brainRef.current;
      showPhrase(
        brain
          ? brain.themeLine(darkRef.current)
          : THEME_LINES[theme as "dark" | "light"][rand(THEME_LINES[theme as "dark" | "light"].length)],
        2600,
        true,
      );
    });
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, [showPhrase]);

  /* cat comments when you wander into another room */
  useEffect(() => {
    const navTimes = navTimesRef.current;
    /* on the graph she claims a bottom corner post and watches — retried
       so a fresh deep load lands too (the cat spawns a beat later) */
    const perchGraph = (tries = 0) => {
      if (window.location.pathname !== "/graph") return;
      const perch = nekoRef.current;
      if (!perch) {
        if (tries < 24) window.setTimeout(() => perchGraph(tries + 1), 250);
        return;
      }
      window.setTimeout(() => {
        if (!nekoRef.current || window.location.pathname !== "/graph") return;
        const cornerX =
          window.innerWidth / 2 < perch.position.x
            ? 60
            : window.innerWidth - 60;
        seedPointer(cornerX, window.innerHeight - 60);
      }, 800);
    };
    /* which standoff shape this room wants: the graph is watched from the
       rim, blog posts get a calm reading distance, everything else is
       right beside you — settled before the first-run return so a fresh
       deep load still lands correctly */
    const base: StandoffBase =
      location.pathname === "/graph"
        ? "observe"
        : location.pathname.startsWith("/blog")
          ? "calm"
          : "follow";
    if (standoffBase.current !== base) {
      standoffBase.current = base;
      applyStandoff();
    }
    if (prevPath.current === null) {
      prevPath.current = location.pathname;
      navTimes.push(Date.now());
      if (navTimes.length > 3) navTimes.shift();
      if (location.pathname === "/graph") perchGraph();
      return;
    }
    if (prevPath.current === location.pathname) return;
    prevPath.current = location.pathname;
    /* room memory: tally the visit even if she stays quiet about it */
    const routePath = location.pathname;
    let roomVisits = 1;
    try {
      const raw = safeGet(localStorage, ROOMS_KEY);
      const map: Record<string, number> = raw ? JSON.parse(raw) : {};
      roomVisits = (map[routePath] || 0) + 1;
      map[routePath] = roomVisits;
      safeSet(localStorage, ROOMS_KEY, JSON.stringify(map));
    } catch {
      /* private mode or quota: memory simply stays sessionless */
    }
    navTimes.push(Date.now());
    if (navTimes.length > 3) navTimes.shift();
    visitsRef.current += 1;
    scrollPctRef.current = 0;
    midSpokenRef.current = false;
    endSpokenRef.current = false;
    /* a prophecy belongs to the page it was made on */
    pendingProphecy.current = null;
    window.clearTimeout(prophecyTimer.current);
    if (suggestRef.current) {
      suggestRef.current = null;
      setSuggest(null);
    }
    if (location.pathname === "/graph") perchGraph();
    if (!nekoRef.current) return;
    const now = Date.now();
    if (now - lastRoutePhrase.current < cd(9000)) return;
    lastRoutePhrase.current = now;
    const brain = brainRef.current;
    const isPost = routePath.startsWith("/blog/post");
    const isNew = !seenPosts.current.has(routePath);
    if (isPost) seenPosts.current.add(routePath);
    const rapid =
      navTimes.length >= 3 &&
      now - navTimes[0] <= 18_000 &&
      now - lastRapidLine.current >= cd(45_000);
    if (rapid) lastRapidLine.current = now;
    const familiar = roomVisits >= 2 && Math.random() < 0.4;
    let line = routeLine(routePath);
    if (brain) {
      line =
        isPost && isNew && seenPosts.current.size > 1
          ? brain.streakPostLine()
          : rapid
            ? brain.rapidLine()
            : familiar
              ? brain.familiarLine(routePath, roomVisits)
              : brain.routeLine(routePath, getCtx());
    }
    /* the new room renders within this window (lazy pages settle too),
       then she greets it by its real headline — the site's own words */
    window.setTimeout(() => {
      if (prevPath.current !== routePath) return; /* superseded */
      if (suggestRef.current || document.hidden) return;
      const title = pageTitle();
      /* a note left mid-read is welcomed back at its exact depth — the
         brain chunk may still be arriving on a cold load, so re-read
         the live ref (with one short retry) instead of the captured one */
      if (isPost) {
        let resumePct: number;
        try {
          const raw = safeGet(localStorage, READS_KEY);
          const map = raw ? JSON.parse(raw) : {};
          const key = decodeURIComponent(routePath.slice("/blog/post/".length));
          resumePct = Math.round(Number(map[key]) || 0);
        } catch {
          resumePct = -1;
        }
        if (resumePct >= 30 && resumePct <= 95) {
          const speakResume = () => {
            if (prevPath.current !== routePath) return;
            if (suggestRef.current || document.hidden) return;
            const b2 = brainRef.current;
            if (!b2) return; /* chunk never landed — the coach will talk */
            showPhrase(
              b2.resumeLine(resumePct, noteTitle() || "that note"),
              3600,
              true,
            );
          };
          if (brainRef.current) {
            speakResume();
          } else {
            window.setTimeout(speakResume, 500);
          }
          return;
        }
      }
      const b = brainRef.current;
      const land = !!b && !!title && !isPost && Math.random() < 0.5;
      showPhrase(land ? b.landedLine(title) : line, land ? 3400 : 2600, true);
    }, 900);
  }, [location.pathname, showPhrase, getCtx, applyStandoff]);

  /* section awareness: when a home section takes the stage, Luna has a
     line about it — always the first time, sometimes after that */
  useEffect(() => {
    if (reduced || !enabled) return;
    const els = ["work", "experience", "skills", "contact"]
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const now = Date.now();
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          const id = en.target.id;
          const first = !seenSections.current.has(id);
          /* the first visit to a section always speaks; re-entries respect
             the cooldowns (and mostly stay quiet) */
          if (!first) {
            if (now - lastSectionAt.current < cd(14_000)) continue;
            if (now - lastContactFocus.current < 12_000) continue;
            if (Math.random() < 0.7) continue;
          }
          const brain = brainRef.current;
          if (!brain || suggestRef.current || document.hidden || !nekoRef.current)
            continue;
          seenSections.current.add(id);
          lastSectionAt.current = now;
          if (!tourDone.current && seenSections.current.size >= 4) {
            tourDone.current = true;
            showPhrase(brain.tourLine(), 4600, true);
          } else {
            showPhrase(brain.sectionLine(id), 3600, true);
          }
        }
      },
      { threshold: 0, rootMargin: "-25% 0px -45% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [location.pathname, showPhrase, enabled, reduced]);

  /* footer awareness: reaching the small print earns one quiet word */
  useEffect(() => {
    if (reduced || !enabled) return;
    const footer = document.querySelector("footer");
    if (!footer) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          const brain = brainRef.current;
          if (!brain || !nekoRef.current) continue;
          sayUiLine(() => brain.footerLine(), lastFooterLine, cd(60_000), 3200);
        }
      },
      { threshold: 0.25 },
    );
    io.observe(footer);
    return () => io.disconnect();
  }, [location.pathname, enabled, reduced, sayUiLine]);

  /* spawn / lifetime */
  useEffect(() => {
    if (reduced || !enabled) return;
    let cancelled = false;
    let greeted = false;
    let chatterTimer = 0;
    let greetInterval = 0;
    let sleepTick = 0;
    let runCalm = 0;
    let lastWheee = 0;
    let suggestFiring = false;
    let prevScrollY = window.scrollY;
    let lastScrollEvent = 0;
    const timers: number[] = [];
    const intervals: number[] = [];
    /* weighted random acts: first one lands 22–42s in, then every 60–95s,
       never while a suggestion owns the floor or the tab is hidden */
    const recentActs = new Set<ActId>();
    let actTimer = 0;
    /* set on pointer-down over the cat; long hold on release = purr */
    let pressAt = 0;

    const hop = (amp = 11) => {
      if (isReducedMotion()) return;
      const el = document.querySelector<HTMLElement>('[data-neko="0"]');
      if (!el) return;
      gsap
        .timeline()
        .to(el, {
          y: -amp,
          rotation: -6,
          scale: 1.06,
          duration: 0.16,
          ease: "power2.out",
          overwrite: "auto",
        })
        .to(el, {
          y: 0,
          rotation: 0,
          scale: 1,
          duration: 0.34,
          ease: "back.out(2.2)",
          overwrite: "auto",
        });
    };

    /* a proper jump: anticipation squash, airtime stretch, landing squash —
       reads very differently from the little walk-hop above */
    const jump = (amp = 22) => {
      if (isReducedMotion()) return;
      const el = document.querySelector<HTMLElement>('[data-neko="0"]');
      if (!el) return;
      gsap
        .timeline()
        .to(el, {
          scaleY: 0.82,
          scaleX: 1.12,
          duration: 0.1,
          ease: "power1.in",
          overwrite: "auto",
        })
        .to(el, {
          y: -amp,
          rotation: -8,
          scaleY: 1.16,
          scaleX: 0.9,
          duration: 0.18,
          ease: "power2.out",
          overwrite: "auto",
        })
        .to(el, {
          y: 0,
          rotation: 0,
          scaleY: 0.88,
          scaleX: 1.1,
          duration: 0.16,
          ease: "power1.in",
          overwrite: "auto",
        })
        .to(el, {
          scaleY: 1,
          scaleX: 1,
          duration: 0.3,
          ease: "back.out(2.6)",
        });
    };

    /* long idle → the cat wakes up with an idea and pitches one post */
    const fireSuggestion = async () => {
      if (suggestFiring) return;
      suggestFiring = true;
      try {
        const { pickSuggestion } = await import("../lib/blogSuggestions");
        if (cancelled || suggestRef.current || !nekoRef.current) return;
        const sg = pickSuggestion(
          window.location.pathname,
          suggestUsed.current,
        );
        if (!sg) return;
        lastSuggestAt.current = Date.now();
        suggestRef.current = sg;
        setSuggest(sg);
        window.clearTimeout(phraseTimer.current);
        setPhrase(null);
        const neko = nekoRef.current;
        if (sleepingRef.current) {
          sleepingRef.current = false;
          neko.wake();
          setSleeping(false);
        }
        spawnSparkles(neko.position.x, neko.position.y);
        timers.push(
          window.setTimeout(
            () => {
              if (cancelled) return;
              suggestRef.current = null;
              setSuggest(null);
            },
            SUGGEST_LIFE_MS,
          ),
        );
      } finally {
        suggestFiring = false;
      }
    };

    /* random acts: a line from the brain plus a cheap neko/DOM behavior —
       a chained call fires the next act in ~8s (combo), normal ones wait
       26–46s so the page never feels empty but never nags either */
    const scheduleAct = (first = false, chain = false) => {
      window.clearTimeout(actTimer);
      actTimer = window.setTimeout(
        runAct,
        chain
          ? 7_500 + Math.random() * 4_500
          : first
            ? 12_000 + Math.random() * 10_000
            : 26_000 + Math.random() * 20_000,
      );
    };

    const runAct = () => {
      if (cancelled) return;
      const brain = brainRef.current;
      const neko = nekoRef.current;
      if (
        !greeted ||
        !brain ||
        !neko ||
        suggestRef.current ||
        document.hidden ||
        petNap.current ||
        Date.now() - lastPhraseAt.current < 3000
      ) {
        scheduleAct();
        return;
      }
      /* a napping cat gets woken by its own idea — but a nap younger than
         8s (keyword-ordered or just dozed) keeps its zzz; petted cats too */
      if (sleepingRef.current && Date.now() - lastSleptAt.current < 8000) {
        scheduleAct();
        return;
      }
      if (sleepingRef.current) {
        sleepingRef.current = false;
        neko.wake();
        setSleeping(false);
      }

      const id = brain.pickAct(recentActs);
      recentActs.add(id);
      if (recentActs.size > 7)
        recentActs.delete(recentActs.values().next().value as ActId);
      /* the graph perch is sacred: roaming acts reschedule instead of
         yanking her off the corner post */
      if (ROAMING_ACTS.includes(id) && window.location.pathname === "/graph") {
        scheduleAct();
        return;
      }

      /* combo bookkeeping: an act that followed a chain can't chain again,
         so bursts top out at two back-to-back */
      const runNow = Date.now();
      const prevRun = lastActRun.current;
      lastActRun.current = runNow;

      const { x, y } = neko.position;
      const el = document.querySelector<HTMLElement>('[data-neko="0"]');

      if (id === "prophecy") {
        const p = brain.nextProphecy();
        pendingProphecy.current = {
          verify: p.verify,
          hit: p.hit,
          miss: p.miss,
        };
        window.clearTimeout(prophecyTimer.current);
        prophecyTimer.current = window.setTimeout(() => {
          pendingProphecy.current = null;
          if (cancelled || suggestRef.current) return;
          showPhrase(p.miss, 3000, true);
        }, 10_000);
        showPhrase(p.say, 4200, true);
      } else if (id !== "seat") {
        showPhrase(brain.actLine(id, getCtx()), 3200, true);
        /* seat says its line at the spotlight instead — she names the
           thing she's claiming (falls back to the generic act line) */
      }

      switch (id) {
        case "zoomies": {
          const w = window.innerWidth;
          const h = window.innerHeight;
          pace("sprint");
          const left = Math.random() < 0.5;
          seedPointer(left ? 48 : w - 48, h * (0.3 + Math.random() * 0.3));
          timers.push(
            window.setTimeout(() => {
              if (cancelled) return;
              jump(22);
              seedPointer(left ? w - 48 : 48, h * (0.34 + Math.random() * 0.4));
            }, 1100),
          );
          timers.push(
            window.setTimeout(() => {
              if (cancelled) return;
              restorePace();
              seedPointer(lastPointer.current.x, lastPointer.current.y);
            }, 2300),
          );
          break;
        }
        case "yarn": {
          const ball = spawnYarn(x, y);
          pace("run");
          let chaseHops = 0;
          const chase = window.setInterval(() => {
            if (cancelled || !ball.isConnected) {
              window.clearInterval(chase);
              return;
            }
            const r = ball.getBoundingClientRect();
            seedPointer(r.left + r.width / 2, r.top + r.height / 2);
            /* a leaping chase reads as a chase — hop every ~second */
            chaseHops += 1;
            if (chaseHops % 5 === 0) jump(14 + Math.round(Math.random() * 6));
          }, 200);
          intervals.push(chase);
          timers.push(
            window.setTimeout(() => {
              window.clearInterval(chase);
              ball.remove();
              restorePace();
              if (!cancelled)
                seedPointer(lastPointer.current.x, lastPointer.current.y);
            }, 3000),
          );
          break;
        }
        case "seat": {
          /* claim a spot on real UI — buttons, cards, headings, form fields
             (like sitting on the send button); the contact form is a
             favorite, so its button gets an extra vote when it's on screen */
          const cand = Array.from(
            document.querySelectorAll<HTMLElement>(
              "button, [role=button], a[class*=btn], textarea, input, .chip, kbd, .card, article, h1, h2, h3, .th-title, .latest-notes a, .feature-card, .exp-card-wrapper, .app-showcase, .tech-pill, canvas",
            ),
          );
          const spots = cand
            .map((c) => ({ el: c, r: c.getBoundingClientRect() }))
            .filter(
              ({ r }) =>
                r.width >= 70 &&
                r.width <= 640 &&
                r.height <= 320 &&
                r.top > 116 &&
                r.bottom < window.innerHeight - 44 &&
                r.left > 8 &&
                r.right < window.innerWidth - 8 &&
                Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y) > 90,
            );
          if (spots.length) {
            /* half the time, if a contact-form button is in play, sit on it —
               the send button is prime real estate */
            const formIdx = spots.findIndex(
              ({ el }) => el.closest("#contact") && el.tagName === "BUTTON",
            );
            const roll =
              formIdx >= 0 && Math.random() < 0.5
                ? formIdx
                : Math.floor(Math.random() * spots.length);
            const target = spots[roll];
            const r = target.r;
            /* text boxes and cards: sit ON TOP of the edge (feet at the
               border, body above the text); buttons/fields keep the
               inside-bottom seat (the send-button pose) */
            const onTop = target.el.matches(
              "h1, h2, h3, .th-title, article, .card, .feature-card, .exp-card-wrapper, .app-showcase, .latest-notes a",
            );
            const tx = r.left + r.width / 2;
            const ty = onTop ? r.top - 10 : r.bottom - 8;
            seedPointer(tx, ty);
            /* once settled she rings the target: spotlight + paw taps so
               the seat reads as a recommendation, not just a nap spot —
               and she names what she's sitting on when it has a name */
            timers.push(
              window.setTimeout(() => {
                if (cancelled) return;
                spotlight(target.el, 2800);
                spawnPaw(tx, ty - 4);
                spawnPaw(tx + 14, ty - 10);
                const b = brainRef.current;
                if (!b) return;
                const raw = (
                  target.el.querySelector("h1, h2, h3, h4")?.textContent ||
                  target.el.textContent ||
                  ""
                )
                  .replace(/\s+/g, " ")
                  .trim();
                const label = raw.length >= 3 ? raw : "";
                showPhrase(
                  label ? b.seatAbout(label) : b.actLine("seat", getCtx()),
                  3200,
                  true,
                );
              }, 350),
            );
            const arrive = Math.min(
              Math.max((Math.hypot(tx - x, ty - y) / 120) * 1000, 500),
              4500,
            );
            timers.push(window.setTimeout(() => hop(15), arrive));
            /* once settled she shows off: hop down, or tuck into a mini-loaf
               right on the button before returning to the cursor */
            timers.push(
              window.setTimeout(() => {
                if (cancelled) return;
                if (Math.random() < 0.35) {
                  sleepingRef.current = true;
                  lastSleptAt.current = Date.now();
                  neko.sleep();
                  setSleeping(true);
                  timers.push(
                    window.setTimeout(() => {
                      if (cancelled || !sleepingRef.current) return;
                      sleepingRef.current = false;
                      nekoRef.current?.wake();
                      setSleeping(false);
                    }, 3200),
                  );
                } else if (Math.random() < 0.5) {
                  jump(20);
                }
              }, arrive + 2600),
            );
            timers.push(
              window.setTimeout(
                () => {
                  if (!cancelled)
                    seedPointer(lastPointer.current.x, lastPointer.current.y);
                },
                arrive + 7000,
              ),
            );
          } else {
            /* nothing claimable in view: the act still says its line */
            showPhrase(brain.actLine("seat", getCtx()), 3200, true);
          }
          break;
        }
        case "prey": {
          /* the classic: a pixel mouse bolts, she gives chase */
          const mouse = spawnMouse({ x, y });
          pace("run");
          const hunt = window.setInterval(() => {
            if (cancelled || !mouse.isConnected || !el) {
              window.clearInterval(hunt);
              return;
            }
            const mr = mouse.getBoundingClientRect();
            const cx = mr.left + mr.width / 2;
            const cy = mr.top + mr.height / 2;
            seedPointer(cx, cy);
            const nr = el.getBoundingClientRect();
            if (
              Math.hypot(nr.x + nr.width / 2 - cx, nr.y + nr.height / 2 - cy) <
              40
            ) {
              window.clearInterval(hunt);
              mouse.remove();
              restorePace();
              hop(16);
              const nb = el.getBoundingClientRect();
              spawnHearts(nb.x + nb.width / 2, nb.y + nb.height / 2, 6);
              const caught = brainRef.current?.preyResult("catch");
              if (caught) showPhrase(caught, 2400, true);
            }
          }, 150);
          intervals.push(hunt);
          timers.push(
            window.setTimeout(() => {
              window.clearInterval(hunt);
              restorePace();
              if (mouse.isConnected) {
                mouse.remove();
                const got = brainRef.current?.preyResult("escape");
                if (got) showPhrase(got, 2400, true);
              }
            }, 5200),
          );
          break;
        }
        case "knock": {
          spawnDrop(
            x + (x < window.innerWidth / 2 ? -16 : 16),
            y + 6,
          );
          hop();
          break;
        }
        case "loaf": {
          sleepingRef.current = true;
          lastSleptAt.current = Date.now();
          neko.sleep();
          setSleeping(true);
          timers.push(
            window.setTimeout(() => {
              if (cancelled || !sleepingRef.current) return;
              sleepingRef.current = false;
              nekoRef.current?.wake();
              setSleeping(false);
            }, 2600),
          );
          break;
        }
        case "dance": {
          hop();
          timers.push(window.setTimeout(() => hop(16), 480));
          break;
        }
        case "hide": {
          if (el) {
            el.classList.add("cat-peek");
            timers.push(
              window.setTimeout(() => el.classList.remove("cat-peek"), 1400),
            );
          }
          break;
        }
        case "stare": {
          /* park the target right next to the cat so it stops and watches */
          seedPointer(
            Math.max(
              24,
              Math.min(
                window.innerWidth - 24,
                x + (x < window.innerWidth / 2 ? -64 : 64),
              ),
            ),
            y,
          );
          break;
        }
        case "groom":
        case "chirp":
        case "stretch": {
          hop();
          break;
        }
        case "scratch": {
          /* claw a nearby card or heading like it's a scratching post */
          const cand = Array.from(
            document.querySelectorAll<HTMLElement>(
              ".card, .feature-card, .contact-card, .exp-card-wrapper, article, h2, h3",
            ),
          );
          const near = cand
            .map((c) => ({ el: c, r: c.getBoundingClientRect() }))
            .filter(
              ({ r }) =>
                r.width >= 70 &&
                r.top > 116 &&
                r.bottom < window.innerHeight - 44 &&
                r.left > 8 &&
                r.right < window.innerWidth - 8 &&
                Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y) >
                  72,
            )
            .sort(
              (a, b) =>
                Math.hypot(
                  a.r.left + a.r.width / 2 - x,
                  a.r.top + a.r.height / 2 - y,
                ) -
                Math.hypot(
                  b.r.left + b.r.width / 2 - x,
                  b.r.top + b.r.height / 2 - y,
                ),
            );
          if (near.length && el) {
            const { r } = near[0];
            const side = x < r.left + r.width / 2 ? -1 : 1;
            const tx = side < 0 ? r.left + 10 : r.right - 10;
            const ty = r.bottom - 12;
            seedPointer(tx, ty);
            const arrive = Math.min(
              Math.max((Math.hypot(tx - x, ty - y) / 130) * 1000, 500),
              4200,
            );
            timers.push(
              window.setTimeout(() => {
                if (cancelled || !el) return;
                /* wiggle hard against the edge, kicking up little puffs */
                gsap
                  .timeline({ overwrite: "auto" })
                  .to(el, {
                    rotation: side * 7,
                    duration: 0.11,
                    repeat: 7,
                    yoyo: true,
                    ease: "sine.inOut",
                  })
                  .to(el, { rotation: 0, duration: 0.2 });
                spawnDrop(tx, ty + 6);
                timers.push(
                  window.setTimeout(() => spawnDrop(tx + 6, ty + 10), 420),
                );
                hop(8);
              }, arrive),
            );
            timers.push(
              window.setTimeout(
                () => {
                  if (!cancelled)
                    seedPointer(lastPointer.current.x, lastPointer.current.y);
                },
                arrive + 3400,
              ),
            );
          } else {
            hop();
          }
          break;
        }
        case "spin": {
          if (el) {
            gsap
              .timeline({ overwrite: "auto" })
              .to(el, { scale: 1.06, duration: 0.12, ease: "power1.out" })
              .to(el, {
                rotation: 360,
                duration: 0.72,
                ease: "power1.inOut",
              })
              .set(el, { rotation: 0 })
              .to(el, { scale: 1, duration: 0.24, ease: "back.out(1.8)" });
            spawnSparkles(x, y - 14);
          }
          break;
        }
        case "sneeze": {
          if (el) {
            /* wind-up squash, recoil pop, wobble back — plus a pixel poof */
            gsap
              .timeline({ overwrite: "auto" })
              .to(el, { scaleX: 0.84, scaleY: 0.88, duration: 0.14, ease: "power2.in" })
              .to(el, { scaleX: 1.12, scaleY: 0.94, duration: 0.09, ease: "power2.out" })
              .to(el, { scale: 1, duration: 0.4, ease: "elastic.out(1.2, 0.4)" });
            spawnSparkles(
              x + (x < window.innerWidth / 2 ? 22 : -22),
              y - 8,
            );
          }
          break;
        }
        case "butterfly": {
          /* a sky-blue pixel flutter wanders the viewport; she gives chase
             at a run, leaping every few strides, until it escapes (5.4s) */
          const bf = spawnButterfly(
            Math.min(Math.max(x + (x < window.innerWidth / 2 ? 90 : -90), 40), window.innerWidth - 60),
            Math.min(Math.max(y - 60 - Math.random() * 80, 130), window.innerHeight - 90),
          );
          pace("run");
          let steps = 0;
          const aim = () => {
            if (cancelled || !bf.isConnected) return;
            const bx = Math.min(
              Math.max(parseFloat(bf.style.left) + Math.random() * 320 - 160, 36),
              window.innerWidth - 56,
            );
            const by = Math.min(
              Math.max(parseFloat(bf.style.top) + Math.random() * 240 - 150, 124),
              window.innerHeight - 76,
            );
            bf.style.left = `${Math.round(bx)}px`;
            bf.style.top = `${Math.round(by)}px`;
          };
          aim();
          const chase = window.setInterval(() => {
            if (cancelled || !bf.isConnected) {
              window.clearInterval(chase);
              return;
            }
            const br = bf.getBoundingClientRect();
            seedPointer(br.left + br.width / 2, br.top + br.height / 2);
            steps += 1;
            if (steps % 5 === 0) jump(14 + Math.round(Math.random() * 6));
            if (steps % 4 === 0) aim();
            const n = nekoRef.current;
            if (
              n &&
              Math.hypot(
                n.position.x - (br.left + br.width / 2),
                n.position.y - (br.top + br.height / 2),
              ) < 44
            ) {
              window.clearInterval(chase);
              bf.remove();
              spawnSparkles(br.left + br.width / 2, br.top + br.height / 2);
              hop(16);
              restorePace();
              const got = brainRef.current?.preyResult("catch");
              if (got) showPhrase(got, 2400, true);
            }
          }, 150);
          intervals.push(chase);
          timers.push(
            window.setTimeout(() => {
              window.clearInterval(chase);
              restorePace();
              if (!cancelled)
                seedPointer(lastPointer.current.x, lastPointer.current.y);
              if (bf.isConnected) bf.remove();
            }, 5400),
          );
          break;
        }
        case "flop": {
          /* dramatic play-dead: tip over, hold the bit, rise ungracefully */
          if (el) {
            gsap
              .timeline({ overwrite: "auto" })
              .to(el, {
                rotation: 82,
                y: "+=6",
                duration: 0.32,
                ease: "power2.out",
              })
              .to(el, { rotation: 84, duration: 1.3 })
              .to(el, {
                rotation: 0,
                y: "-=6",
                duration: 0.42,
                ease: "power2.inOut",
              });
            spawnSparkles(x, y + 4);
          }
          break;
        }
        case "paw": {
          /* sprint to the cursor and leap — a high five for the pointer */
          const { x: px, y: py } = lastPointer.current;
          seedPointer(px, py);
          pace("run");
          const arrive = Math.min(
            Math.max((Math.hypot(px - x, py - y) / 160) * 1000, 400),
            2600,
          );
          timers.push(
            window.setTimeout(() => {
              if (cancelled) return;
              jump(20);
              spawnSparkles(px, py - 8);
              spawnPaw(px, py);
            }, arrive),
          );
          timers.push(
            window.setTimeout(() => {
              if (cancelled) return;
              restorePace();
              spawnHearts(px, py, 3);
              seedPointer(lastPointer.current.x, lastPointer.current.y);
            }, arrive + 900),
          );
          break;
        }
        case "sunbeam": {
          /* warm light lands a little away; she walks in and naps in it */
          const sx = Math.min(
            Math.max(x + (Math.random() < 0.5 ? -1 : 1) * (110 + Math.random() * 90), 140),
            window.innerWidth - 140,
          );
          const sy = Math.min(
            Math.max(y + (Math.random() * 120 - 40), 180),
            window.innerHeight - 110,
          );
          spawnSunbeam(sx, sy);
          seedPointer(sx, sy);
          pace("walk");
          const beamArrive = Math.min(
            Math.max((Math.hypot(sx - x, sy - y) / 130) * 1000, 600),
            4000,
          );
          timers.push(
            window.setTimeout(() => {
              if (cancelled) return;
              restorePace();
              sleepingRef.current = true;
              lastSleptAt.current = Date.now();
              nekoRef.current?.sleep();
              setSleeping(true);
              spawnSparkles(sx, sy - 12);
              timers.push(
                window.setTimeout(() => {
                  if (cancelled || !sleepingRef.current) return;
                  sleepingRef.current = false;
                  nekoRef.current?.wake();
                  setSleeping(false);
                  if (!cancelled)
                    seedPointer(lastPointer.current.x, lastPointer.current.y);
                }, 2600),
              );
            }, beamArrive),
          );
          break;
        }
        case "laser": {
          /* the red dot zigzags just ahead of her — uncatchable by design */
          const dot = spawnLaser(x, y);
          pace("run");
          let steps = 0;
          const aim = () => {
            if (cancelled || !dot.isConnected) return;
            dot.style.left = `${Math.round(40 + Math.random() * (window.innerWidth - 80))}px`;
            dot.style.top = `${Math.round(150 + Math.random() * (window.innerHeight - 240))}px`;
          };
          aim();
          const laserChase = window.setInterval(() => {
            if (cancelled || !dot.isConnected) {
              window.clearInterval(laserChase);
              return;
            }
            const dr = dot.getBoundingClientRect();
            seedPointer(dr.left + 5, dr.top + 5);
            steps += 1;
            if (steps % 3 === 0) aim();
            if (steps % 5 === 0) jump(15 + Math.round(Math.random() * 6));
          }, 130);
          intervals.push(laserChase);
          timers.push(
            window.setTimeout(() => {
              window.clearInterval(laserChase);
              restorePace();
              if (!cancelled)
                seedPointer(lastPointer.current.x, lastPointer.current.y);
            }, 4600),
          );
          break;
        }
        case "pounce": {
          /* stalk: butt wiggle in place, then launch at the pointer */
          const { x: ptx, y: pty } = lastPointer.current;
          if (el) {
            gsap
              .timeline({ overwrite: "auto" })
              .to(el, {
                rotation: -5,
                duration: 0.14,
                repeat: 5,
                yoyo: true,
                ease: "sine.inOut",
              })
              .set(el, { rotation: 0 });
          }
          pace("trot");
          timers.push(
            window.setTimeout(() => {
              if (cancelled) return;
              seedPointer(ptx, pty);
              pace("run");
              jump(26);
              spawnSparkles(x, y - 12);
            }, 950),
          );
          timers.push(
            window.setTimeout(() => {
              if (cancelled) return;
              restorePace();
              spawnHearts(ptx, pty - 8, 3);
              seedPointer(lastPointer.current.x, lastPointer.current.y);
            }, 2600),
          );
          break;
        }
        case "dig": {
          /* rapid alternating paws + dust puffs kicked up behind her */
          if (el) {
            gsap
              .timeline({ overwrite: "auto" })
              .to(el, {
                scaleY: 0.9,
                x: -3,
                duration: 0.1,
                repeat: 9,
                yoyo: true,
                ease: "sine.inOut",
              })
              .to(el, { scaleY: 1, x: 0, duration: 0.2, ease: "power2.out" });
          }
          timers.push(window.setTimeout(() => spawnDrop(x - 14, y + 12), 120));
          timers.push(window.setTimeout(() => spawnDrop(x + 12, y + 14), 380));
          timers.push(window.setTimeout(() => spawnDrop(x - 6, y + 16), 660));
          break;
        }
        case "box": {
          /* find open floor, summon cardboard, become one with the box */
          let bx = window.innerWidth / 2;
          let by = window.innerHeight / 2;
          for (let i = 0; i < 8; i++) {
            bx = 130 + Math.random() * (window.innerWidth - 260);
            by = 180 + Math.random() * (window.innerHeight - 320);
            if (Math.hypot(bx - x, by - y) > 150) break;
          }
          seedPointer(bx, by);
          pace("walk");
          const boxArrive = Math.min(
            Math.max((Math.hypot(bx - x, by - y) / 130) * 1000, 600),
            3800,
          );
          timers.push(
            window.setTimeout(() => {
              if (cancelled) return;
              restorePace();
              const p = nekoRef.current?.position;
              const held = spawnBox(p ? p.x : bx, p ? p.y : by);
              sleepingRef.current = true;
              lastSleptAt.current = Date.now();
              nekoRef.current?.sleep();
              setSleeping(true);
              timers.push(
                window.setTimeout(() => {
                  if (cancelled || !sleepingRef.current) return;
                  sleepingRef.current = false;
                  nekoRef.current?.wake();
                  setSleeping(false);
                  held.remove();
                  if (!cancelled)
                    seedPointer(lastPointer.current.x, lastPointer.current.y);
                }, 2600),
              );
            }, boxArrive),
          );
          break;
        }
        case "tailchase": {
          /* orbit a fixed spot at trot speed while spinning — the tail
             is always exactly one step ahead */
          const ox = x;
          const oy = y;
          let deg = Math.random() * 360;
          pace("trot");
          if (el) {
            gsap
              .timeline({ overwrite: "auto" })
              .to(el, { rotation: 360, duration: 1.9, ease: "none" })
              .set(el, { rotation: 0 });
          }
          const orbit = window.setInterval(() => {
            if (cancelled) return;
            deg += 75;
            const rad = (deg * Math.PI) / 180;
            seedPointer(
              Math.min(Math.max(ox + Math.cos(rad) * 64, 40), window.innerWidth - 40),
              Math.min(Math.max(oy + Math.sin(rad) * 42, 130), window.innerHeight - 52),
            );
          }, 240);
          intervals.push(orbit);
          timers.push(
            window.setTimeout(() => {
              window.clearInterval(orbit);
              restorePace();
              if (!cancelled) {
                jump(14);
                seedPointer(lastPointer.current.x, lastPointer.current.y);
              }
            }, 2700),
          );
          break;
        }
        case "social": {
          /* ambassador duty: walk to an external link, sit on it, ring it —
             footer socials, nav links, and the mailto are the suspects */
          const links = Array.from(
            document.querySelectorAll<HTMLElement>(
              'a[target="_blank"], .socials a, a[href^="mailto:"]',
            ),
          )
            .map((c) => ({ el: c, r: c.getBoundingClientRect() }))
            .filter(
              ({ r }) =>
                r.width > 12 &&
                r.top > 40 &&
                r.bottom < window.innerHeight - 40 &&
                r.left > 4 &&
                r.right < window.innerWidth - 4,
            );
          if (links.length) {
            let best = 0;
            let bestD = Infinity;
            links.forEach(({ r }, i) => {
              const d = Math.hypot(
                r.left + r.width / 2 - x,
                r.top + r.height / 2 - y,
              );
              if (d < bestD) {
                bestD = d;
                best = i;
              }
            });
            const spot = links[best];
            const tx = spot.r.left + spot.r.width / 2;
            const ty = Math.max(spot.r.bottom - 4, 44);
            seedPointer(tx, ty);
            const arrive = Math.min(
              Math.max((Math.hypot(tx - x, ty - y) / 120) * 1000, 500),
              4500,
            );
            timers.push(
              window.setTimeout(() => {
                if (cancelled) return;
                spotlight(spot.el, 3200);
                hop(12);
                spawnPaw(tx, ty - 6);
                /* then nod at a second link — one tour, two doors */
                timers.push(
                  window.setTimeout(() => {
                    if (cancelled) return;
                    const others = links.filter((_, i) => i !== best);
                    if (!others.length) return;
                    const nx =
                      others[Math.floor(Math.random() * others.length)];
                    seedPointer(
                      nx.r.left + nx.r.width / 2,
                      Math.max(nx.r.bottom - 4, 44),
                    );
                    timers.push(
                      window.setTimeout(() => {
                        if (!cancelled) spotlight(nx.el, 2600);
                      }, 1500),
                    );
                  }, 2800),
                );
              }, arrive),
            );
            timers.push(
              window.setTimeout(() => {
                if (!cancelled)
                  seedPointer(lastPointer.current.x, lastPointer.current.y);
              }, arrive + 7600),
            );
          } else {
            /* nothing external on screen — cheer the nearest CTA instead */
            const cta = Array.from(
              document.querySelectorAll<HTMLElement>(".chip, kbd, .cta-button"),
            )
              .map((c) => ({ el: c, r: c.getBoundingClientRect() }))
              .filter(
                ({ r }) =>
                  r.width > 24 &&
                  r.top > 96 &&
                  r.bottom < window.innerHeight - 40,
              );
            if (cta.length) {
              const pick = cta[Math.floor(Math.random() * cta.length)];
              spotlight(pick.el, 2400);
              seedPointer(
                pick.r.left + pick.r.width / 2,
                pick.r.bottom - 8,
              );
              timers.push(
                window.setTimeout(() => {
                  if (!cancelled)
                    seedPointer(lastPointer.current.x, lastPointer.current.y);
                }, 4200),
              );
            }
          }
          break;
        }
        case "roll": {
          /* barrel roll across the floor: drift sideways while spinning two
             full turns, land with a sparkle burst and a hop */
          const dir = Math.random() < 0.5 ? -1 : 1;
          seedPointer(x + dir * 110, y + rand(30) - 10);
          pace("walk");
          if (el) {
            gsap
              .timeline({ overwrite: "auto" })
              .to(el, { rotation: 180, duration: 0.55, ease: "power1.inOut" })
              .to(el, { rotation: 360, duration: 0.55, ease: "power1.inOut" })
              .set(el, { rotation: 0 });
          }
          timers.push(
            window.setTimeout(() => {
              if (cancelled) return;
              spawnSparkles(x + dir * 84, y);
              jump(12);
              restorePace();
              seedPointer(lastPointer.current.x, lastPointer.current.y);
            }, 1400),
          );
          break;
        }
        case "playbow": {
          /* front down, bum up: squash + shoulder wiggle, then bounce up
             into a sparkle — the universal "chase me" invitation */
          if (el) {
            gsap
              .timeline({ overwrite: "auto" })
              .to(el, {
                scaleY: 0.86,
                scaleX: 1.05,
                rotation: -6,
                duration: 0.28,
                ease: "power2.out",
              })
              .to(el, { rotation: 6, duration: 0.2, yoyo: true, repeat: 3 })
              .to(el, {
                scaleY: 1,
                scaleX: 1,
                rotation: 0,
                duration: 0.3,
                ease: "power2.in",
              });
          }
          timers.push(
            window.setTimeout(() => {
              if (cancelled) return;
              spawnSparkles(x, y - 8);
              jump(16);
            }, 1500),
          );
          break;
        }
        case "dust": {
          /* bat at an invisible speck: four darting taps, paw prints at
             each strike, the prey never stood a chance */
          let n = 0;
          const tap = window.setInterval(() => {
            if (cancelled || n >= 4) {
              window.clearInterval(tap);
              return;
            }
            const tx = x + rand(120) - 60;
            const ty = y - rand(46) + 6;
            seedPointer(tx, ty);
            spawnPaw(tx, ty);
            if (n % 2 === 0) hop(8);
            n += 1;
          }, 460);
          intervals.push(tap);
          timers.push(
            window.setTimeout(() => {
              window.clearInterval(tap);
              if (!cancelled)
                seedPointer(lastPointer.current.x, lastPointer.current.y);
            }, 2500),
          );
          break;
        }
        case "gift": {
          /* fetch a star and carry it to your cursor — she drops it with
             a heart-burst when she reaches the pointer (5s timeout) */
          const star = spawnGift(x + 20, y - 24);
          const gx = lastPointer.current.x;
          const gy = lastPointer.current.y;
          seedPointer(gx, gy);
          pace("walk");
          let delivered = false;
          const carry = window.setInterval(() => {
            const c = nekoRef.current;
            if (!c || !star.isConnected) {
              window.clearInterval(carry);
              return;
            }
            star.style.left = `${Math.round(c.position.x + 22)}px`;
            star.style.top = `${Math.round(c.position.y - 20)}px`;
            if (!delivered && Math.hypot(c.position.x - gx, c.position.y - gy) < 56) {
              delivered = true;
              window.clearInterval(carry);
              star.remove();
              spawnHearts(gx, gy, 5);
              spawnSparkles(gx, gy);
              restorePace();
              if (!cancelled) jump(14);
            }
          }, 110);
          intervals.push(carry);
          timers.push(
            window.setTimeout(() => {
              window.clearInterval(carry);
              star.remove();
              if (!delivered) restorePace();
            }, 4400),
          );
          break;
        }
        default:
          break; /* stats / deep / audit — the line is the act */
      }
      /* sometimes chain a quick follow-up so her bits flow into each
         other — but never a third in a row (prevRun stays recent) */
      const chain =
        runNow - prevRun >= 16_000 && Math.random() < 0.32;
      scheduleAct(false, chain);
    };

    const spawn = async () => {
      const [core, tabby, orange, marmalade, calico, socks, lucky, jess, lucy] =
        await Promise.all([
          import("neko-ts"),
          import("neko-ts/breeds/tabby"),
          import("neko-ts/breeds/orange"),
          import("neko-ts/breeds/marmalade"),
          import("neko-ts/breeds/calico"),
          import("neko-ts/breeds/socks"),
          import("neko-ts/breeds/lucky"),
          import("neko-ts/breeds/jess"),
          import("neko-ts/breeds/lucy"),
        ]);
      if (cancelled) return;

      const breeds = [
        tabby.tabby,
        orange.orange,
        marmalade.marmalade,
        calico.calico,
        socks.socks,
        lucky.lucky,
        jess.jess,
        lucy.lucy,
      ];
      const w = window.innerWidth;
      const h = window.innerHeight;
      const edges = [
        { x: -48, y: h * (0.55 + Math.random() * 0.35) },
        { x: w + 48, y: h * (0.55 + Math.random() * 0.35) },
        { x: Math.random() * w, y: h + 48 },
      ];
      const origin = edges[rand(edges.length)];

      const neko = new core.Neko({
        nekoId: 0,
        nekoSize: core.NekoSizeVariations.LARGE,
        speed: 12,
        origin,
        defaultState: "awake",
        breed: breeds[rand(breeds.length)],
      });
      /* a good chunk bigger than LARGE on desktop (and a step up on
         mobile) — same pixelated sprite; setSize rescales the sheet */
      neko.setSize(
        (w >= 768 ? 66 : 48) as unknown as NekoSizeVariations,
      );
      nekoRef.current = neko;
      /* settle the room's standoff now that she exists (graph = rim,
         blog = calm, selection/form/overlay = a respectful step back) */
      applyStandoff();

      const el = document.querySelector<HTMLElement>('[data-neko="0"]');
      /* above navbar (100) + tab bar (80): she can never vanish behind
         the chrome, and perches on the bars are fair game */
      if (el) el.style.zIndex = "130";

      /* seed its target just inside the edge so it walks in right away */
      const seed =
        origin.x < 0
          ? { x: 64, y: origin.y }
          : origin.x > w
            ? { x: w - 64, y: origin.y }
            : { x: origin.x, y: h - 64 };
      seedPointer(seed.x, seed.y);

      /* greet + sparkle once it's actually on screen */
      const greetStart = Date.now();
      const returning = safeGet(localStorage, GREETED_KEY) === "1";
      greetInterval = window.setInterval(() => {
        if (cancelled) return;
        const { x, y } = neko.position;
        const onScreen =
          x > 24 && x < w - 24 && y > 24 && y < h - 24;
        if (!onScreen && Date.now() - greetStart < 8000) return;
        window.clearInterval(greetInterval);
        greeted = true;
        lastActivity.current = Date.now();
        safeSet(localStorage, GREETED_KEY, "1");
        spawnSparkles(x, y);
        const brain = brainRef.current;
        const weekend = [0, 6].includes(new Date().getDay());
        let spoken: string;
        if (returning) {
          /* quote the real log when there is one: pets, rooms, favorite corner */
          const pets = Number(safeGet(localStorage, PET_KEY)) || 0;
          let rooms: Record<string, number>;
          try {
            rooms = JSON.parse(safeGet(localStorage, ROOMS_KEY) || "{}") || {};
          } catch {
            rooms = {};
          }
          let favoritePath = "/";
          let favoriteCount = 0;
          for (const [p, c] of Object.entries(rooms)) {
            if (typeof c === "number" && c > favoriteCount) {
              favoriteCount = c;
              favoritePath = p;
            }
          }
          /* a note left mid-read gets welcomed back to its exact depth —
             more personal than the counters line */
          let resume: string | null = null;
          const here = window.location.pathname;
          if (brain && here.startsWith("/blog/post/")) {
            try {
              const raw = safeGet(localStorage, READS_KEY);
              const map = raw ? JSON.parse(raw) : {};
              const key = decodeURIComponent(here.slice("/blog/post/".length));
              const pct = Math.round(Number(map[key]) || 0);
              if (pct >= 30 && pct <= 95) {
                resume = brain.resumeLine(pct, noteTitle() || "that note");
              }
            } catch {
              /* no reads log — fall through to the counters line */
            }
          }
          spoken =
            resume ??
            (brain
              ? brain.returnLine({
                  pets,
                  rooms: Object.keys(rooms).length,
                  favoritePath,
                  favoriteCount,
                })
              : RETURNING(CAT_NAME)[rand(3)]);
        } else {
          spoken = weekend
            ? WEEKEND_GREETING(CAT_NAME)[rand(WEEKEND_GREETING(CAT_NAME).length)]
            : GREETING(CAT_NAME);
        }
        showPhrase(spoken, returning ? 3200 : 5400, true);
        /* then wander toward the visitor's pointer (or screen centre) —
           never off a graph perch, where the corner post holds */
        timers.push(
          window.setTimeout(() => {
            if (!cancelled && window.location.pathname !== "/graph")
              seedPointer(lastPointer.current.x, lastPointer.current.y);
          }, 2400),
        );
      }, 250);

      /* idle chatter every 40–64s — brain lines when loaded, else the bank */
      const scheduleChatter = () => {
        chatterTimer = window.setTimeout(
          () => {
            if (cancelled) return;
            if (!suggestRef.current) {
              const brain = brainRef.current;
              showPhrase(
                brain
                  ? brain.chatterLine(getCtx())
                  : CHATTER[rand(CHATTER.length)],
                3200,
              );
            }
            scheduleChatter();
          },
          40_000 + Math.random() * 24_000,
        );
      };
      scheduleChatter();

      scheduleAct(true);

      /* non-stop: while the visitor rests, she invents her own errands —
         strolls to a fresh spot every few seconds between 4s and 16s
         of input-idle, but never while text is selected, a form has focus,
         an overlay is up, or the graph perch holds; naps and suggestions
         win over this too */
      let lastWander = 0;
      const wanderTick = window.setInterval(() => {
        const now = Date.now();
        const idle = now - lastInput.current;
        if (
          !greeted ||
          cancelled ||
          suggestRef.current ||
          sleepingRef.current ||
          petNap.current ||
          document.hidden ||
          standoffReasons.current.size > 0 ||
          window.location.pathname === "/graph" ||
          idle < 4_000 ||
          idle > 16_000 ||
          now - lastWander < 1500 ||
          Math.random() > 0.8
        )
          return;
        const n = nekoRef.current;
        if (!n) return;
        lastWander = now;
        /* aim for a spot at least 240px away so the stroll is a real walk */
        let sx = window.innerWidth / 2;
        let sy = window.innerHeight / 2;
        for (let i = 0; i < 8; i++) {
          sx = 90 + Math.random() * (window.innerWidth - 180);
          sy = 150 + Math.random() * (window.innerHeight - 260);
          if (Math.hypot(sx - n.position.x, sy - n.position.y) > 240) break;
        }
        /* gears match the trip: long hauls run, medium walks, short strolls */
        const dist = Math.hypot(sx - n.position.x, sy - n.position.y);
        pace(dist > 640 ? "run" : dist > 320 ? "walk" : "stroll");
        window.setTimeout(
          restorePace,
          Math.min(Math.max((dist / 14) * 1000, 700), 4200),
        );
        seedPointer(sx, sy);
        /* on the way: sometimes a leap, sometimes a bob, often just stride */
        const roll = Math.random();
        if (roll < 0.28)
          timers.push(
            window.setTimeout(() => jump(16 + Math.round(Math.random() * 8)), 450),
          );
        else if (roll < 0.5) timers.push(window.setTimeout(hop, 450));
      }, 2000);
      intervals.push(wanderTick);

      /* rescue watchdog: if she somehow ends up fully off-screen (a
         resize, a far seed), recall her to the pointer — the cat stays
         continuous, always */
      const rescueTick = window.setInterval(() => {
        const c = nekoRef.current;
        const el2 = document.querySelector<HTMLElement>('[data-neko="0"]');
        if (cancelled || document.hidden || !c || !el2) return;
        const r = el2.getBoundingClientRect();
        if (r.width === 0) return;
        if (
          r.right < 4 ||
          r.left > window.innerWidth - 4 ||
          r.bottom < 4 ||
          r.top > window.innerHeight - 4
        ) {
          seedPointer(lastPointer.current.x, lastPointer.current.y);
          pace("run");
          window.setTimeout(() => restorePace(), 1800);
        }
      }, 2500);
      intervals.push(rescueTick);

      /* non-stop idle fidgets: while she's waiting on you she stretches,
         bounces, and show-jumps in place — no words, just body language */
      const fidgetTick = window.setInterval(() => {
        const now = Date.now();
        const idle = now - lastInput.current;
        if (
          !greeted ||
          cancelled ||
          suggestRef.current ||
          sleepingRef.current ||
          petNap.current ||
          document.hidden ||
          standoffReasons.current.size > 0 ||
          window.location.pathname === "/graph" ||
          idle < 7_500 ||
          now - lastPhraseAt.current < 2200 ||
          Math.random() > 0.62
        )
          return;
        if (Math.random() < 0.5) jump(14 + Math.round(Math.random() * 9));
        else hop(9);
      }, 3300);
      intervals.push(fidgetTick);
    };

    /* petting / feeding — cat is pointer-events:none, so listen globally */
    const onPointerDown = (e: PointerEvent) => {
      if (!e.isTrusted) return;
      markActivity();
      /* taps are navigation too: the cat runs to your finger */
      seedPointer(e.clientX, e.clientY);
      const neko = nekoRef.current;
      if (!neko) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          "a,button,input,textarea,select,label,[contenteditable='true']",
        )
      )
        return;
      const { x, y } = neko.position;
      const radius = e.pointerType === "mouse" ? 42 : 56;
      if (Math.hypot(e.clientX - x, e.clientY - y) > radius) return;

      const now = Date.now();
      pressAt = now;
      /* every cat tap feeds a streak — repetition earns new answers */
      tapStreak.current.push(now);
      lastHoverLine.current = 0;
      tapStreak.current = tapStreak.current.filter((t) => now - t <= 2500);
      const streak = tapStreak.current.length;
      const tapBrain = brainRef.current;

      if (now - lastPetAt.current < 600 && streak < 5) {
        if (treatActive.current) return;
        treatActive.current = true;
        lastPetAt.current = 0;
        spawnFish(x, y, x > window.innerWidth / 2 ? -1 : 1);
        const treatBrain = brainRef.current;
        showPhrase(
          treatBrain
            ? treatBrain.treatLine()
            : TREAT_LINES[rand(TREAT_LINES.length)],
          2600,
          true,
        );
        timers.push(
          window.setTimeout(
            () => {
              treatActive.current = false;
              if (cancelled) return;
              spawnHearts(x, y, 4);
              hop();
            },
            560,
          ),
        );
        return;
      }

      /* poking a sleeping cat: startled awake with an opinion */
      if (sleepingRef.current) {
        sleepingRef.current = false;
        neko.wake();
        setSleeping(false);
        lastPetAt.current = now;
        tap(8);
        spawnHearts(x, y, 3);
        if (tapBrain) showPhrase(tapBrain.tapLine("wake"), 3200, true);
        return;
      }

      /* tap-storm: repeated clicks get escalating answers */
      if (streak >= 7 && tapBrain) {
        lastPetAt.current = now;
        tap(10);
        tapStreak.current = [];
        showPhrase(tapBrain.tapLine("melt"), 3600, true);
        spawnHearts(x, y, 8);
        spawnSparkles(x, y);
        pace("sprint");
        seedPointer(
          x < window.innerWidth / 2 ? 48 : window.innerWidth - 48,
          window.innerHeight * 0.78,
        );
        timers.push(
          window.setTimeout(
            () => {
              if (cancelled) return;
              restorePace();
              seedPointer(lastPointer.current.x, lastPointer.current.y);
            },
            1700,
          ),
        );
        return;
      }
      if (streak >= 5 && tapBrain) {
        lastPetAt.current = now;
        tap(6);
        showPhrase(tapBrain.tapLine("many"), 3200, true);
        hop();
        spawnHearts(x, y, 5);
        return;
      }

      lastPetAt.current = now;
      tap(6);
      neko.sleep();
      petNap.current = true;
      const stored = Number(safeGet(localStorage, PET_KEY));
      const pets = (Number.isFinite(stored) ? stored : 0) + 1;
      safeSet(localStorage, PET_KEY, String(pets));
      const petBrain = brainRef.current;
      showPhrase(
        petBrain
          ? petBrain.petLine(pets)
          : pets % 10 === 0
            ? `${pets} pets. ${CAT_NAME} approves.`
            : PET_LINES[rand(PET_LINES.length)],
        2800,
        true,
      );
      spawnHearts(x, y);
      hop();
      timers.push(
        window.setTimeout(
          () => {
            petNap.current = false;
            if (!cancelled && !sleepingRef.current) nekoRef.current?.wake();
          },
          1500,
        ),
      );
    };

    /* double-click the cat: a high five — same geometric petting radius,
       because her sprite never gets pointer events of its own */
    const onDblClick = (e: Event) => {
      const pt = e as MouseEvent;
      const neko = nekoRef.current;
      if (!e.isTrusted || document.hidden || suggestRef.current || !neko) return;
      const t = e.target;
      if (
        t instanceof Element &&
        t.closest(
          "a,button,input,textarea,select,label,[contenteditable='true'],.cat-suggest",
        )
      )
        return;
      if (
        Math.hypot(pt.clientX - neko.position.x, pt.clientY - neko.position.y) > 56
      )
        return;
      const now = Date.now();
      if (now - lastHighFive.current < cd(25_000)) return;
      const brain = brainRef.current;
      if (!brain) return;
      lastHighFive.current = now;
      markActivity();
      jump(20);
      spawnHearts(pt.clientX, pt.clientY - 10, 5);
      spawnSparkles(pt.clientX, pt.clientY - 6);
      showPhrase(brain.highFiveLine(), 2800, true);
    };
    document.addEventListener("dblclick", onDblClick);

    /* scroll fast and the cat breaks into a run; depth feeds the brain
       and once-per-route milestones get a line */
    const onScroll = () => {
      const now = Date.now();
      const y = window.scrollY;
      const dy = Math.abs(y - prevScrollY);
      const dt = lastScrollEvent ? Math.max(now - lastScrollEvent, 1) : 0;
      prevScrollY = y;
      lastScrollEvent = now;
      markActivity();
      checkProphecy("scroll");
      const pct = Math.round(
        ((y + window.innerHeight) /
          Math.max(document.documentElement.scrollHeight, 1)) *
          100,
      );
      if (pct > scrollPctRef.current)
        scrollPctRef.current = Math.min(pct, 100);
      const brain = brainRef.current;
      /* a fresh phrase (route lines, keywords) owns the next few seconds —
         keep the milestone marker unset so it speaks on the next event */
      const phraseFresh = now - lastPhraseAt.current < 2500;
      if (brain && !suggestRef.current && !phraseFresh) {
        if (!endSpokenRef.current && scrollPctRef.current >= 96) {
          endSpokenRef.current = true;
          midSpokenRef.current = true; /* reaching the end moots "halfway" */
          showPhrase(brain.scrollLine("end"), 2800, true);
        } else if (!midSpokenRef.current && scrollPctRef.current >= 50) {
          midSpokenRef.current = true;
          /* on a note the halfway line names the depth instead */
          const onNote = !!document.querySelector(".blog-content");
          showPhrase(
            onNote
              ? brain.noteMidLine(Math.round(scrollPctRef.current))
              : brain.scrollLine("mid"),
            2800,
            true,
          );
        }
      }
      const fast = dy >= 150 || (dt > 0 && (dy / dt) * 1000 > 700);
      if (!fast || !nekoRef.current) return;
      if (!running.current) {
        running.current = true;
        pace("sprint");
      }
      window.clearTimeout(runCalm);
      runCalm = window.setTimeout(() => {
        running.current = false;
        restorePace();
      }, 1300);
      if (now - lastWheee > 25_000 && now - lastPhraseAt.current >= 2500) {
        lastWheee = now;
        showPhrase(WHEEE_LINES[rand(WHEEE_LINES.length)], 2200, true);
      }
    };

    /* nap when the visitor goes quiet; a cat mid-walk stays busy, and her
       stroll window (10–42s idle) plays out before any auto-nap arms —
       naps need 45s of quiet, then 6s of a still cat */
    let prevPos = { x: 0, y: 0 };
    sleepTick = window.setInterval(() => {
      const neko = nekoRef.current;
      if (!neko || cancelled || !greeted) return;
      const { x, y } = neko.position;
      const moving = Math.hypot(x - prevPos.x, y - prevPos.y) > 2;
      prevPos = { x, y };
      if (moving) lastActivity.current = Date.now();
      const now = Date.now();
      if (
        !suggestRef.current &&
        !sleepingRef.current &&
        !petNap.current &&
        !document.hidden &&
        now - lastInput.current > 45_000 &&
        now - lastActivity.current > 6000
      ) {
        sleepingRef.current = true;
        lastSleptAt.current = now;
        neko.sleep();
        setSleeping(true);
      }
      if (
        !suggestRef.current &&
        !document.hidden &&
        now - lastInput.current > SUGGEST_IDLE_MS &&
        now - lastSuggestAt.current > SUGGEST_GAP_MS
      ) {
        void fireSuggestion();
      }
    }, 1000);

    const onVisibility = () => {
      const neko = nekoRef.current;
      if (!neko || cancelled) return;
      if (document.hidden) {
        suggestRef.current = null;
        setSuggest(null);
        if (!sleepingRef.current) {
          sleepingRef.current = true;
          lastSleptAt.current = Date.now();
          neko.sleep();
          setSleeping(true);
        }
      } else {
        markActivity();
        seedPointer(lastPointer.current.x, lastPointer.current.y);
      }
    };

    /* long hold on the cat = extra purr; right-click near it = a wink */
    const onPointerUp = () => {
      const held = pressAt ? Date.now() - pressAt : 0;
      pressAt = 0;
      if (held < 750) return;
      const neko = nekoRef.current;
      if (!neko || suggestRef.current || document.hidden) return;
      const brain = brainRef.current;
      if (!brain) return;
      const now = Date.now();
      if (now - lastClickLine.current < cd(7000)) return;
      lastClickLine.current = now;
      const { x, y } = neko.position;
      showPhrase(brain.tapLine("purr"), 3200, true);
      spawnHearts(x, y, 6);
    };

    const onCtxMenu = (e: MouseEvent) => {
      if (!e.isTrusted || suggestRef.current || document.hidden) return;
      const neko = nekoRef.current;
      if (!neko) return;
      const { x, y } = neko.position;
      if (Math.hypot(e.clientX - x, e.clientY - y) > 52) return;
      const brain = brainRef.current;
      if (!brain) return;
      const now = Date.now();
      if (now - lastClickLine.current < cd(7000)) return;
      lastClickLine.current = now;
      spawnSparkles(e.clientX, e.clientY);
      showPhrase(brain.tapLine("ctx"), 3200, true);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("contextmenu", onCtxMenu);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", onScroll, { passive: true });

    const spawnDelay = window.setTimeout(
      () => {
        void spawn();
      },
      1000 + Math.random() * 1200,
    );

    return () => {
      cancelled = true;
      window.clearTimeout(spawnDelay);
      window.clearTimeout(chatterTimer);
      window.clearTimeout(runCalm);
      window.clearTimeout(actTimer);
      window.clearTimeout(prophecyTimer.current);
      pendingProphecy.current = null;
      window.clearInterval(greetInterval);
      window.clearInterval(sleepTick);
      intervals.forEach((id) => window.clearInterval(id));
      timers.forEach((id) => window.clearTimeout(id));
      window.clearTimeout(phraseTimer.current);
      setPhrase(null);
      setSleeping(false);
      suggestRef.current = null;
      setSuggest(null);
      sleepingRef.current = false;
      petNap.current = false;
      running.current = false;
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("dblclick", onDblClick);
      document.removeEventListener("contextmenu", onCtxMenu);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      nekoRef.current?.destroy();
      nekoRef.current = null;
    };
  }, [reduced, enabled, showPhrase, markActivity, getCtx, checkProphecy, applyStandoff, pace, restorePace, spotlight]);

  /* keep the bubble + zZz parked next to the cat */
  useEffect(() => {
    /* spring the pill in (transform on the inner pill; the anchor owns
       positioning, so the two never fight over the same property) */
    const pill = (
      phrase
        ? bubbleRef.current?.querySelector<HTMLElement>(".cat-bubble")
        : suggest
          ? suggestAnchorRef.current?.querySelector<HTMLElement>(".cat-bubble")
          : null
    );
    if (pill && !reduced)
      gsap.fromTo(
        pill,
        { y: 9, scale: 0.93, autoAlpha: 0 },
        {
          y: 0,
          scale: 1,
          autoAlpha: 1,
          duration: 0.42,
          ease: "back.out(1.8)",
          overwrite: "auto",
        },
      );
    if (!phrase && !sleeping && !suggest) return;
    const neko = nekoRef.current;
    if (!neko) return;
    let raf = 0;
    const place = () => {
      const { x, y } = neko.position;
      const b = bubbleRef.current;
      if (b && phrase) {
        const bw = b.offsetWidth;
        const bh = b.offsetHeight;
        const cx = Math.min(
          Math.max(x, bw / 2 + 8),
          window.innerWidth - bw / 2 - 8,
        );
        const top = Math.max(y - 34 - bh, 8);
        const t = `translate(${Math.round(cx - bw / 2)}px, ${Math.round(top)}px)`;
        if (b.style.transform !== t) b.style.transform = t;
        /* the tail always points at the cat, even when clamped to an edge */
        const tail = Math.min(Math.max(x - (cx - bw / 2), 18), bw - 18);
        const tailPx = `${Math.round(tail)}px`;
        if (b.style.getPropertyValue("--bubble-arrow-x") !== tailPx)
          b.style.setProperty("--bubble-arrow-x", tailPx);
      }
      const s = suggestAnchorRef.current;
      if (s && suggest) {
        const sw = s.offsetWidth;
        const sh = s.offsetHeight;
        const cx = Math.min(
          Math.max(x, sw / 2 + 8),
          window.innerWidth - sw / 2 - 8,
        );
        const top = Math.max(y - 34 - sh, 8);
        const t = `translate(${Math.round(cx - sw / 2)}px, ${Math.round(top)}px)`;
        if (s.style.transform !== t) s.style.transform = t;
        const tail = Math.min(Math.max(x - (cx - sw / 2), 18), sw - 18);
        const tailPx = `${Math.round(tail)}px`;
        if (s.style.getPropertyValue("--bubble-arrow-x") !== tailPx)
          s.style.setProperty("--bubble-arrow-x", tailPx);
      }
      const z = zzzRef.current;
      if (z && sleeping) {
        const t = `translate(${Math.round(x + 12)}px, ${Math.round(y - 40)}px)`;
        if (z.style.transform !== t) z.style.transform = t;
      }
      /* faint paw prints trail behind the walking cat */
      if (!sleeping && !reduced) {
        const prev = pawPrev.current;
        if (!prev) pawPrev.current = { x, y };
        else if (Math.hypot(x - prev.x, y - prev.y) > 54) {
          pawPrev.current = { x, y };
          spawnPaw(x, y);
        }
      }
      raf = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(raf);
  }, [phrase, sleeping, suggest, reduced]);

  /* the tour-guide header over each suggestion (stable while bubble lives) */
  const suggestHeader = useMemo(
    () => (suggest ? GUIDE_HEADERS[rand(GUIDE_HEADERS.length)] : null),
    [suggest],
  );

  const typedPhrase = useTypewriter(phrase?.text ?? null);
  const typedSuggest = useTypewriter(suggest?.msg ?? null);

  if (reduced || !enabled) return null;

  return (
    <>
      {phrase && (
        <div ref={bubbleRef} className="cat-bubble-anchor" aria-hidden="true">
          <div className="cat-bubble rounded-2xl border border-black-50 bg-black-200/95 px-3.5 py-2 text-xs font-medium text-blue-50 text-center leading-snug shadow-xl backdrop-blur-md max-w-[230px]">
            {typedPhrase}
            {typedPhrase.length < phrase.text.length && (
              <span className="cat-caret">▌</span>
            )}
          </div>
        </div>
      )}
      {suggest && (
        <div ref={suggestAnchorRef} className="cat-bubble-anchor">
          <div className="cat-bubble cat-suggest rounded-2xl border border-blue-500/40 bg-black-200/95 px-3.5 py-2 text-xs font-medium text-blue-50 text-center leading-snug shadow-xl backdrop-blur-md max-w-[240px]">
            {suggestHeader && (
              <span className="cat-suggest-head" aria-hidden="true">
                {suggestHeader}
              </span>
            )}
            <span className="cat-suggest-msg">
              {typedSuggest}
              {typedSuggest.length < suggest.msg.length && (
                <span className="cat-caret">▌</span>
              )}
            </span>
            <Link
              to={`/blog/post/${suggest.path}`}
              className="cat-suggest-link"
            >
              <span aria-hidden="true">✦</span>
              <span>{suggest.title}</span>
            </Link>
            <div className="cat-suggest-actions">
              <button
                type="button"
                className="cat-suggest-btn"
                onClick={acceptSuggestion}
                aria-label={`Open ${suggest.title}`}
              >
                open · a
              </button>
              <button
                type="button"
                className="cat-suggest-btn cat-suggest-btn-ghost"
                onClick={denySuggestion}
                aria-label="Skip this suggestion"
              >
                skip · d
              </button>
            </div>
          </div>
        </div>
      )}
      {sleeping && (
        <div ref={zzzRef} className="cat-zzz-anchor" aria-hidden="true">
          <div className="cat-zzz">
            <span>z</span>
            <span>z</span>
            <span>z</span>
          </div>
        </div>
      )}
    </>
  );
};

export default CatCompanion;
