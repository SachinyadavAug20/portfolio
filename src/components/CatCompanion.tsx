import { useCallback, useEffect, useRef, useState } from "react";
import type { Neko } from "neko-ts";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { tap } from "../lib/haptics";
import {
  CHATTER,
  GREETING,
  GREETED_KEY,
  PET_KEY,
  PET_LINES,
  RETURNING,
  SHOO_KEY,
  TREAT_LINES,
  THEME_LINES,
  WHEEE_LINES,
  WAKE_LINES,
  pickName,
  rand,
  routeLine,
  safeGet,
  safeSet,
  spawnFish,
  spawnHearts,
  spawnSparkles,
} from "../lib/cat";
import { useLocation } from "react-router-dom";

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
 */

const seedPointer = (x: number, y: number) => {
  document.body.dispatchEvent(
    new MouseEvent("mousemove", { clientX: x, clientY: y, bubbles: true }),
  );
};

const CatCompanion = () => {
  const reduced = useReducedMotion();
  const location = useLocation();
  const [enabled, setEnabled] = useState(
    () => safeGet(sessionStorage, SHOO_KEY) !== "1",
  );
  const [phrase, setPhrase] = useState<{ text: string; ms: number } | null>(
    null,
  );
  const [sleeping, setSleeping] = useState(false);

  const nekoRef = useRef<Neko | null>(null);
  const nameRef = useRef("");
  const bubbleRef = useRef<HTMLDivElement>(null);
  const zzzRef = useRef<HTMLDivElement>(null);
  const phraseTimer = useRef(0);
  const lastPetAt = useRef(0);
  const treatActive = useRef(false);
  const petNap = useRef(false);
  const sleepingRef = useRef(false);
  const lastSleptAt = useRef(0);
  const lastActivity = useRef(0);
  const lastPointer = useRef({ x: 0, y: 0 });
  const wakeLine = useRef(0);
  const running = useRef(false);
  const leaving = useRef(false);
  const prevPath = useRef<string | null>(null);
  const lastRoutePhrase = useRef(0);
  const lastThemePhrase = useRef(0);

  const showPhrase = useCallback((text: string, ms = 3200) => {
    window.clearTimeout(phraseTimer.current);
    setPhrase({ text, ms });
    phraseTimer.current = window.setTimeout(() => setPhrase(null), ms);
  }, []);

  const markActivity = useCallback(() => {
    const now = Date.now();
    lastActivity.current = now;
    if (sleepingRef.current && nekoRef.current) {
      sleepingRef.current = false;
      nekoRef.current.wake();
      setSleeping(false);
      if (now - lastSleptAt.current > 14_000) {
        showPhrase(WAKE_LINES[wakeLine.current++ % WAKE_LINES.length], 2400);
      }
    }
  }, [showPhrase]);

  /* trusted pointer/keyboard activity drives idle detection + last target */
  useEffect(() => {
    lastActivity.current = Date.now();
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
      if (e.isTrusted) markActivity();
    };
    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("touchmove", onTouch, { passive: true });
    document.addEventListener("pointerdown", onAny, { passive: true });
    document.addEventListener("keydown", onAny);
    window.addEventListener("wheel", onAny, { passive: true });
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("touchmove", onTouch);
      document.removeEventListener("pointerdown", onAny);
      document.removeEventListener("keydown", onAny);
      window.removeEventListener("wheel", onAny);
    };
  }, [markActivity]);

  /* Alt+C shooes / summons the cat for this session (with a bye flourish) */
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
    safeSet(sessionStorage, SHOO_KEY, enabled ? "0" : "1");
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
      if (!nekoRef.current) return;
      const now = Date.now();
      if (now - lastThemePhrase.current < 8000) return;
      lastThemePhrase.current = now;
      const lines = THEME_LINES[theme as "dark" | "light"];
      showPhrase(lines[rand(lines.length)], 2600);
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
    if (!nekoRef.current) return;
    const now = Date.now();
    if (now - lastRoutePhrase.current < 9000) return;
    lastRoutePhrase.current = now;
    showPhrase(routeLine(location.pathname), 2600);
  }, [location.pathname, showPhrase]);

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
    let prevScrollY = window.scrollY;
    let lastScrollEvent = 0;
    const timers: number[] = [];

    const hop = () => {
      const el = document.querySelector<HTMLElement>('[data-neko="0"]');
      if (!el) return;
      el.classList.remove("cat-hop");
      void el.offsetWidth;
      el.classList.add("cat-hop");
      timers.push(window.setTimeout(() => el.classList.remove("cat-hop"), 500));
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
      nameRef.current = pickName();

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
        const name = nameRef.current || "cat";
        showPhrase(
          returning ? RETURNING(name)[rand(3)] : GREETING(name),
          returning ? 2600 : 5400,
        );
        /* then wander toward the visitor's pointer (or screen centre) */
        timers.push(
          window.setTimeout(() => {
            if (!cancelled)
              seedPointer(lastPointer.current.x, lastPointer.current.y);
          }, 2400),
        );
      }, 250);

      /* idle chatter every 40–75s */
      const scheduleChatter = () => {
        chatterTimer = window.setTimeout(
          () => {
            if (cancelled) return;
            showPhrase(CHATTER[rand(CHATTER.length)], 3200);
            scheduleChatter();
          },
          40_000 + Math.random() * 35_000,
        );
      };
      scheduleChatter();
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
        showPhrase(TREAT_LINES[rand(TREAT_LINES.length)], 2600);
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
      const name = nameRef.current || "cat";
      showPhrase(
        pets % 10 === 0
          ? `${pets} pets. ${name} approves.`
          : PET_LINES[rand(PET_LINES.length)],
        2800,
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

    /* scroll fast and the cat breaks into a run */
    const onScroll = () => {
      const now = Date.now();
      const y = window.scrollY;
      const dy = Math.abs(y - prevScrollY);
      const dt = lastScrollEvent ? Math.max(now - lastScrollEvent, 1) : 0;
      prevScrollY = y;
      lastScrollEvent = now;
      markActivity();
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
        showPhrase(WHEEE_LINES[rand(WHEEE_LINES.length)], 2200);
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
      if (
        !sleepingRef.current &&
        !petNap.current &&
        !document.hidden &&
        Date.now() - lastActivity.current > 6000
      ) {
        sleepingRef.current = true;
        lastSleptAt.current = Date.now();
        neko.sleep();
        setSleeping(true);
      }
    }, 1000);

    const onVisibility = () => {
      const neko = nekoRef.current;
      if (!neko || cancelled) return;
      if (document.hidden) {
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
      window.clearInterval(greetInterval);
      window.clearInterval(sleepTick);
      timers.forEach((id) => window.clearTimeout(id));
      window.clearTimeout(phraseTimer.current);
      setPhrase(null);
      setSleeping(false);
      sleepingRef.current = false;
      petNap.current = false;
      running.current = false;
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("scroll", onScroll);
      nekoRef.current?.destroy();
      nekoRef.current = null;
    };
  }, [reduced, enabled, showPhrase, markActivity]);

  /* keep the bubble + zZz parked next to the cat */
  useEffect(() => {
    if (!phrase && !sleeping) return;
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
        b.style.transform = `translate(${Math.round(cx - bw / 2)}px, ${Math.round(top)}px)`;
      }
      const z = zzzRef.current;
      if (z && sleeping) {
        z.style.transform = `translate(${Math.round(x + 12)}px, ${Math.round(y - 40)}px)`;
      }
      raf = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(raf);
  }, [phrase, sleeping]);

  if (reduced || !enabled) return null;

  return (
    <>
      {phrase && (
        <div ref={bubbleRef} className="cat-bubble-anchor" aria-hidden="true">
          <div className="cat-bubble rounded-2xl border border-black-50 bg-black-200/95 px-3.5 py-2 text-xs font-medium text-blue-50 text-center leading-snug shadow-xl backdrop-blur-md max-w-[230px]">
            {phrase.text}
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
