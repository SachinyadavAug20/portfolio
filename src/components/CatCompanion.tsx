import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Neko } from "neko-ts";
import { useReducedMotion, isReducedMotion } from "../hooks/useReducedMotion";
import { tap } from "../lib/haptics";
import {
  CAT_NAME,
  CHATTER,
  GREETING,
  WEEKEND_GREETING,
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
  spawnPaw,
  spawnSparkles,
  spawnYarn,
} from "../lib/cat";
import type { CatContext } from "../lib/catTypes";
import type { ActId } from "../lib/catBrain";
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
  const lastRushUp = useRef(0);
  const lastSelectAll = useRef(0);
  const lastRepeatLine = useRef(0);
  const lastBubbleCopy = useRef(0);
  const lastJiggle = useRef(0);
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
    gsap.to(standoffNum.current, {
      d: STANDOFF_DIST[mode],
      duration: 0.7,
      ease: "power2.out",
      overwrite: true,
      onUpdate: () => setDist(standoffNum.current.d),
    });
    setDist(standoffNum.current.d);
    neko.setSpeed(STANDOFF_SPEED[mode]);
  }, []);

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
          now - lastCloseIn.current >= 45_000 &&
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
    /* rapid direction changes: the cursor is chasing something too */
    let lastDx = 0;
    let lastDy = 0;
    let lastPX = -1;
    let lastPY = -1;
    let jiggleFlips = 0;
    let jiggleWindow = 0;
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
          sayUiLine(() => brain.jiggleLine(), lastJiggle, 45_000, 3000);
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
              now - lastStandoffLine.current >= 45_000 &&
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
        now - lastRepeatLine.current >= 30_000 &&
        brainRef.current &&
        nekoRef.current
      ) {
        repeatStreak.current = 0;
        lastRepeatLine.current = now;
        lastClickLine.current = now;
        showPhrase(brainRef.current.repeatLine(), 3600, true);
        return;
      }
      if (now - lastClickLine.current < 7000) return;
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
    };

    /* touching the contact form earns a nudge (once, politely) */
    const onContactFocus = (e: Event) => {
      const t = e.target;
      if (!(t instanceof Element) || document.hidden || suggestRef.current)
        return;
      if (!t.closest("#contact")) return;
      const now = Date.now();
      if (now - lastContactFocus.current < 25_000) return;
      if (now - lastSectionAt.current < 12_000) return;
      if (now - lastPhraseAt.current < 3000) return; /* fresh line has the floor */
      const brain = brainRef.current;
      if (!brain || !nekoRef.current) return;
      lastContactFocus.current = now;
      showPhrase(brain.sectionLine("contact"), 3600, true);
    };

    document.addEventListener("click", onCatClick);
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
        sayUiLine(() => brain.selectAllLine(), lastSelectAll, 30_000, 3000);
        return;
      }
      const node = sel.anchorNode;
      const inBubble =
        (node instanceof Element ? node : node?.parentElement)?.closest(
          ".cat-bubble",
        ) !== null;
      if (inBubble && len >= 15) {
        sayUiLine(() => brain.bubbleCopyLine(), lastBubbleCopy, 30_000, 3000);
        return;
      }
      sayUiLine(() => brain.selectionLine(), lastSelectionLine, 30_000, 3000);
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
      sayUiLine(() => brain.focusLine(field), lastFieldFocus, 5_000, 3000);
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
      sayUiLine(() => brain.gArmedLine(), lastGArmed, 30_000, 3000);
    };
    const onBeforePrint = () => {
      const brain = brainRef.current;
      if (!brain) return;
      sayUiLine(() => brain.printLine(), lastPrintLine, 60_000, 3000);
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
      sayUiLine(() => brain.tabLine(), lastTabLine, 30_000, 3000);
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
      sayUiLine(() => brain.escapeLine(), lastEscapeLine, 30_000, 3000);
    };
    document.addEventListener("keydown", onEscapeKey);

    document.addEventListener("focusin", onContactFocus);

    /* writing a real message earns one quiet word of encouragement */
    let messageNudged = false;
    const sayUiLine = (
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
  };

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

    /* the palette and the shortcuts sheet each earn one word, 30s apart,
       and never while a suggestion holds the floor */
    const onPalette = () => {
      const brain = brainRef.current;
      if (!brain) return;
      sayUiLine(() => brain.paletteLine(), lastPaletteLine, 30_000, 3000);
    };
    const onHelpSheet = () => {
      const brain = brainRef.current;
      if (!brain) return;
      sayUiLine(() => brain.helpLine(), lastHelpLine, 30_000, 3000);
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
        if (now - lastHoverLine.current < 28_000) return;
        if (suggestRef.current || document.hidden) return;
        const brain = brainRef.current;
        if (!brain || !nekoRef.current) return;
        lastHoverLine.current = now;
        showPhrase(brain.hoverLine(sleepingRef.current), 2800, true);
      } else if (d > 64 && hoveringCat) {
        hoveringCat = false;
        gsap.to(root, {
          scale: 1,
          rotation: 0,
          duration: 0.18,
          overwrite: "auto",
        });
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
      if (now - lastWord < 6000) return;
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
          /* caffeine: a sparkly speed burst, then back to twelve */
          spawnSparkles(x, y);
          neko.setSpeed(18);
          window.setTimeout(() => nekoRef.current?.setSpeed(12), 1200);
        }
        else if (word === "love") spawnHearts(x, y, 8);
        else if (word === "resume") spawnSparkles(x, y);
        else if (word === "dance") {
          spawnSparkles(x, y);
          neko.setSpeed(16);
          window.setTimeout(() => nekoRef.current?.setSpeed(12), 900);
        }
        else if (word === "git" || word === "python" || word === "react")
          spawnSparkles(x, y);
        else if (word === "arch") {
          spawnSparkles(x, y);
          neko.setSpeed(20);
          window.setTimeout(() => nekoRef.current?.setSpeed(12), 1000);
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
          neko.setSpeed(20);
          window.setTimeout(() => nekoRef.current?.setSpeed(12), 1000);
        }
        else if (word === "mouse") spawnYarn(x, y);
        else if (word === "bird") {
          spawnSparkles(x, y);
          neko.setSpeed(16);
          window.setTimeout(() => nekoRef.current?.setSpeed(12), 900);
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
          /* fetch is a dog word — the cat dashes off anyway */
          spawnSparkles(x, y);
          neko.setSpeed(26);
          window.setTimeout(() => {
            nekoRef.current?.setSpeed(12);
          }, 1200);
        }
        else if (word === "vim") spawnHearts(x, y, 6);
        else if (word === "deploy") {
          spawnSparkles(x, y);
          neko.setSpeed(20);
          window.setTimeout(() => nekoRef.current?.setSpeed(12), 1000);
        }
        else if (word === "dog") {
          /* dogs get chased off the premises */
          spawnSparkles(x, y);
          neko.setSpeed(30);
          seedPointer(
            x < window.innerWidth / 2 ? window.innerWidth - 64 : 64,
            window.innerHeight * 0.24,
          );
          window.setTimeout(() => {
            nekoRef.current?.setSpeed(12);
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
          /* green tests: a small zoomie */
          spawnSparkles(x, y);
          neko.setSpeed(16);
          window.setTimeout(() => nekoRef.current?.setSpeed(12), 900);
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
      if (away < 8000) return;
      const now = Date.now();
      if (now - lastReturnLine < 60_000) return;
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
      if (upward && now - lastRushUp.current >= 45_000) {
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
        if (now - lastResizeLine < 30_000) return;
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
  }, [markActivity, showPhrase, checkProphecy, acceptSuggestion, denySuggestion, setStandoffReason]);

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
      return;
    }
    if (prevPath.current === location.pathname) return;
    const from = prevPath.current;
    prevPath.current = location.pathname;
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
    if (!nekoRef.current) return;
    /* arriving at the graph: she claims a bottom corner post and watches */
    if (from === "/graph") {
      const perch = nekoRef.current;
      window.setTimeout(() => {
        if (nekoRef.current !== perch || prevPath.current !== "/graph") return;
        const cornerX =
          window.innerWidth / 2 < perch.position.x
            ? 60
            : window.innerWidth - 60;
        seedPointer(cornerX, window.innerHeight - 60);
      }, 800);
    }
    const now = Date.now();
    if (now - lastRoutePhrase.current < 9000) return;
    lastRoutePhrase.current = now;
    const brain = brainRef.current;
    let line = routeLine(location.pathname);
    if (brain) {
      const isPost = location.pathname.startsWith("/blog/post");
      const isNew = !seenPosts.current.has(location.pathname);
      if (isPost) seenPosts.current.add(location.pathname);
      const rapid =
        navTimes.length >= 3 &&
        now - navTimes[0] <= 18_000 &&
        now - lastRapidLine.current >= 45_000;
      if (rapid) lastRapidLine.current = now;
      line =
        isPost && isNew && seenPosts.current.size > 1
          ? brain.streakPostLine()
          : rapid
            ? brain.rapidLine()
            : brain.routeLine(location.pathname, getCtx());
    }
    showPhrase(line, 2600, true);
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
            if (now - lastSectionAt.current < 14_000) continue;
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

    const hop = () => {
      if (isReducedMotion()) return;
      const el = document.querySelector<HTMLElement>('[data-neko="0"]');
      if (!el) return;
      gsap
        .timeline()
        .to(el, {
          y: -11,
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
          ? 22_000 + Math.random() * 20_000
          : 60_000 + Math.random() * 35_000,
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
            : core.NekoSizeVariations.LARGE,
        speed: 12,
        origin,
        defaultState: "awake",
        breed: breeds[rand(breeds.length)],
      });
      nekoRef.current = neko;
      /* settle the room's standoff now that she exists (graph = rim,
         blog = calm, selection/form/overlay = a respectful step back) */
      applyStandoff();

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
        const weekend = [0, 6].includes(new Date().getDay());
        showPhrase(
          returning
            ? (brain ? brain.returnLine() : RETURNING(CAT_NAME)[rand(3)])
            : weekend
              ? WEEKEND_GREETING(CAT_NAME)[rand(WEEKEND_GREETING(CAT_NAME).length)]
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

      /* idle chatter every 52–90s — brain lines when loaded, else the bank */
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
          52_000 + Math.random() * 38_000,
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
        neko.setSpeed(30);
        seedPointer(
          x < window.innerWidth / 2 ? 48 : window.innerWidth - 48,
          window.innerHeight * 0.78,
        );
        timers.push(
          window.setTimeout(
            () => {
              if (cancelled) return;
              nekoRef.current?.setSpeed(12);
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
      if (now - lastWheee > 25_000 && now - lastPhraseAt.current >= 2500) {
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
      if (now - lastClickLine.current < 7000) return;
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
      if (now - lastClickLine.current < 7000) return;
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
      document.removeEventListener("contextmenu", onCtxMenu);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      nekoRef.current?.destroy();
      nekoRef.current = null;
    };
  }, [reduced, enabled, showPhrase, markActivity, getCtx, checkProphecy, applyStandoff]);

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
    if (pill)
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
