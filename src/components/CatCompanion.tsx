import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Neko } from "neko-ts";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { tap } from "../lib/haptics";
import {
  CAT_NAME,
  CHATTER,
  GREETING,
  GREETED_KEY,
  GUIDE_HEADERS,
  PET_KEY,
  PET_LINES,
  RETURNING,
  SHOO_KEY,
  SUGGEST_DENY,
  SUGGEST_GAP_MS,
  SUGGEST_IDLE_MS,
  SUGGEST_LIFE_MS,
  TREAT_LINES,
  THEME_LINES,
  WHEEE_LINES,
  WAKE_LINES,
  rand,
  routeLine,
  safeGet,
  safeSet,
  spawnDrop,
  spawnFish,
  spawnHearts,
  spawnSparkles,
  spawnYarn,
} from "../lib/cat";
import type { CatContext } from "../lib/catTypes";
import type { ActId } from "../lib/catBrain";
import type { BlogSuggestion } from "../lib/blogSuggestions";
import { Link, useLocation, useNavigate } from "react-router-dom";

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
 * - After long idle the cat wakes with a clickable blog suggestion
 *   (dynamic import keeps the reading list out of the entry bundle).
 * - Persona: Moti, Sachin's tour-guide cat — shows you around, nudges you
 *   toward the good stuff (and toward hiring Sachin).
 * - Type "pspsps" anywhere to call him back to your cursor.
 * - The brain (src/lib/catBrain) lazy-loads: 100k+ combinatorial lines,
 *   session context (route/hour/scroll/pets/typing), and weighted random
 *   acts (zoomies, yarn chase, knock, prophecy…) — cat.ts lines are the
 *   fallback until the chunk lands.
 */

/* background chatter respects this gap between any two idle phrases;
   user-facing reactions (greet, pet, acts) pass force=true and skip it */
const PHRASE_GAP_MS = 5000;

type Brain = typeof import("../lib/catBrain");

const seedPointer = (x: number, y: number) => {
  document.body.dispatchEvent(
    new MouseEvent("mousemove", { clientX: x, clientY: y, bubbles: true }),
  );
};

/* streaming typewriter: bubble text types itself in, char by char.
   reduced motion shows the full line at once. */
const typeSpeed = (len: number) => (len > 70 ? 10 : len > 40 ? 14 : 18);

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
  const wakeLine = useRef(0);
  const running = useRef(false);
  const leaving = useRef(false);
  const prevPath = useRef<string | null>(null);
  const lastRoutePhrase = useRef(0);
  const lastThemePhrase = useRef(0);
  const lastTypingLine = useRef(0);
  /* session context the brain reads (see catTypes.CatContext) */
  const scrollPctRef = useRef(0);
  const visitsRef = useRef(1);
  const keyTimesRef = useRef<number[]>([]);
  const darkRef = useRef(
    document.documentElement.classList.contains("dark"),
  );
  const midSpokenRef = useRef(false);
  const endSpokenRef = useRef(false);
  const pendingProphecy = useRef<{
    verify: "scroll" | "click";
    hit: string;
    miss: string;
  } | null>(null);
  const prophecyTimer = useRef(0);

  const showPhrase = useCallback(
    (text: string, ms = 3200, force = false) => {
      if (suggestRef.current) return; /* the suggestion bubble has the floor */
      const now = Date.now();
      if (!force && now - lastPhraseAt.current < PHRASE_GAP_MS) return;
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
    },
    [],
  );

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

  /* load the brain in the background — stays out of the entry bundle;
     if the chunk never lands, cat.ts phrase banks keep working */
  useEffect(() => {
    let cancelled = false;
    void import("../lib/catBrain")
      .then((m) => {
        if (!cancelled) brainRef.current = m;
      })
      .catch(() => {
        /* offline / blocked chunk — fallback lines are already wired */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const markActivity = useCallback(() => {
    const now = Date.now();
    lastActivity.current = now;
    lastInput.current = now;
    if (sleepingRef.current && nekoRef.current) {
      sleepingRef.current = false;
      nekoRef.current.wake();
      setSleeping(false);
      if (now - lastSleptAt.current > 14_000) {
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
    const onMove = (e: Event) => {
      const t = e as MouseEvent;
      if (!t.isTrusted) return;
      lastPointer.current = { x: t.clientX, y: t.clientY };
      markActivity();
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
      if (now - lastTypingLine.current < 45_000) return;
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

    /* type "pspsps" to call the cat back to your cursor */
    let psBuf = "";
    let lastPs = 0;
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
      psBuf = (psBuf + t.key.toLowerCase()).slice(-6);
      if (psBuf !== "pspsps") return;
      psBuf = "";
      const now = Date.now();
      if (now - lastPs < 8000) return;
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
    };
    document.addEventListener("keydown", onKeyType);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("touchmove", onTouch);
      document.removeEventListener("pointerdown", onAny);
      document.removeEventListener("keydown", onAny);
      document.removeEventListener("keydown", onKeyType);
      document.removeEventListener("keydown", onKeyRate);
      document.removeEventListener("copy", onCopy);
      window.removeEventListener("wheel", onAny);
    };
  }, [markActivity, showPhrase, checkProphecy, acceptSuggestion, denySuggestion]);

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
      if (now - lastThemePhrase.current < 8000) return;
      lastThemePhrase.current = now;
      const brain = brainRef.current;
      showPhrase(
        brain
          ? brain.themeLine(darkRef.current)
          : THEME_LINES[theme as "dark" | "light"][rand(2)],
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
    if (prevPath.current === null) {
      prevPath.current = location.pathname;
      return;
    }
    if (prevPath.current === location.pathname) return;
    prevPath.current = location.pathname;
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
    if (!nekoRef.current) return;
    const now = Date.now();
    if (now - lastRoutePhrase.current < 9000) return;
    lastRoutePhrase.current = now;
    const brain = brainRef.current;
    showPhrase(
      brain
        ? brain.routeLine(location.pathname, getCtx())
        : routeLine(location.pathname),
      2600,
      true,
    );
  }, [location.pathname, showPhrase, getCtx]);

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
    /* weighted random acts: first one lands 15–30s in, then every 45–80s,
       never while a suggestion owns the floor or the tab is hidden */
    const recentActs = new Set<ActId>();
    let actTimer = 0;

    const hop = () => {
      const el = document.querySelector<HTMLElement>('[data-neko="0"]');
      if (!el) return;
      el.classList.remove("cat-hop");
      void el.offsetWidth;
      el.classList.add("cat-hop");
      timers.push(window.setTimeout(() => el.classList.remove("cat-hop"), 500));
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

    /* random acts: a line from the brain plus a cheap neko/DOM behavior */
    const scheduleAct = (first = false) => {
      window.clearTimeout(actTimer);
      actTimer = window.setTimeout(
        runAct,
        first
          ? 15_000 + Math.random() * 15_000
          : 45_000 + Math.random() * 35_000,
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
        petNap.current
      ) {
        scheduleAct();
        return;
      }
      /* a napping cat gets woken by its own idea; petted cat is left alone */
      if (sleepingRef.current) {
        sleepingRef.current = false;
        neko.wake();
        setSleeping(false);
      }

      const id = brain.pickAct(recentActs);
      recentActs.add(id);
      if (recentActs.size > 5)
        recentActs.delete(recentActs.values().next().value as ActId);

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
      } else {
        showPhrase(brain.actLine(id, getCtx()), 3200, true);
      }

      switch (id) {
        case "zoomies": {
          const w = window.innerWidth;
          const h = window.innerHeight;
          neko.setSpeed(34);
          seedPointer(
            Math.random() < 0.5 ? 48 : w - 48,
            h * (0.3 + Math.random() * 0.45),
          );
          timers.push(
            window.setTimeout(() => {
              if (cancelled) return;
              neko.setSpeed(12);
              seedPointer(lastPointer.current.x, lastPointer.current.y);
            }, 1600),
          );
          break;
        }
        case "yarn": {
          const ball = spawnYarn(x, y);
          const chase = window.setInterval(() => {
            if (cancelled || !ball.isConnected) {
              window.clearInterval(chase);
              return;
            }
            const r = ball.getBoundingClientRect();
            seedPointer(r.left + r.width / 2, r.top + r.height / 2);
          }, 200);
          intervals.push(chase);
          timers.push(
            window.setTimeout(() => {
              window.clearInterval(chase);
              ball.remove();
              if (!cancelled)
                seedPointer(lastPointer.current.x, lastPointer.current.y);
            }, 3000),
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
          timers.push(window.setTimeout(hop, 480));
          break;
        }
        case "hide": {
          if (el) {
            el.classList.add("cat-peek");
            timers.push(
              window.setTimeout(() => el.classList.remove("cat-peek"), 1700),
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
        default:
          break; /* stats / deep / audit — the line is the act */
      }
      scheduleAct();
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
        nekoSize:
          w < 768
            ? core.NekoSizeVariations.SMALL
            : core.NekoSizeVariations.MEDIUM,
        speed: 12,
        origin,
        defaultState: "awake",
        breed: breeds[rand(breeds.length)],
      });
      nekoRef.current = neko;

      const el = document.querySelector<HTMLElement>('[data-neko="0"]');
      if (el) el.style.zIndex = "60"; /* under navbar (100) + tab bar (80) */

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
        showPhrase(
          returning
            ? (brain ? brain.returnLine() : RETURNING(CAT_NAME)[rand(3)])
            : GREETING(CAT_NAME),
          returning ? 3200 : 5400,
          true,
        );
        /* then wander toward the visitor's pointer (or screen centre) */
        timers.push(
          window.setTimeout(() => {
            if (!cancelled)
              seedPointer(lastPointer.current.x, lastPointer.current.y);
          }, 2400),
        );
      }, 250);

      /* idle chatter every 40–75s — brain lines when loaded, else the bank */
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
          40_000 + Math.random() * 35_000,
        );
      };
      scheduleChatter();

      scheduleAct(true);
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
      if (now - lastPetAt.current < 600) {
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
      if (brain && !suggestRef.current) {
        if (!endSpokenRef.current && scrollPctRef.current >= 96) {
          endSpokenRef.current = true;
          midSpokenRef.current = true; /* reaching the end moots "halfway" */
          showPhrase(brain.scrollLine("end"), 2800, true);
        } else if (!midSpokenRef.current && scrollPctRef.current >= 50) {
          midSpokenRef.current = true;
          showPhrase(brain.scrollLine("mid"), 2800, true);
        }
      }
      const fast = dy >= 150 || (dt > 0 && (dy / dt) * 1000 > 700);
      if (!fast || !nekoRef.current) return;
      if (!running.current) {
        running.current = true;
        nekoRef.current.setSpeed(20);
      }
      window.clearTimeout(runCalm);
      runCalm = window.setTimeout(
        () => {
          running.current = false;
          nekoRef.current?.setSpeed(12);
        },
        1300,
      );
      if (now - lastWheee > 25_000) {
        lastWheee = now;
        showPhrase(WHEEE_LINES[rand(WHEEE_LINES.length)], 2200, true);
      }
    };

    /* nap when the visitor goes quiet; a cat mid-walk stays busy */
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

    document.addEventListener("pointerdown", onPointerDown);
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
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      nekoRef.current?.destroy();
      nekoRef.current = null;
    };
  }, [reduced, enabled, showPhrase, markActivity, getCtx, checkProphecy]);

  /* keep the bubble + zZz parked next to the cat */
  useEffect(() => {
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
      raf = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(raf);
  }, [phrase, sleeping, suggest]);

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
