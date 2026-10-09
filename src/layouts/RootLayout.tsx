import { lazy, Suspense, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { MotionConfig } from "motion/react";
import Navbar from "../components/Navbar";
import BottomTabBar from "../components/BottomTabBar";
import CursorGlow from "../components/CursorGlow";
import CommandPalette from "../components/CommandPalette";
import DevShortcuts from "../components/DevShortcuts";
import Footer from "../sections/Footer";
import { isTouchDevice } from "../hooks/useNearViewport";
import { useIdleReady } from "../hooks/useIdleReady";
import { tap } from "../lib/haptics";
import { isToasterWanted, onToasterWanted } from "../lib/toast";
import { canViewTransition, useRenderedLocation } from "../lib/routeTransition";

/* the cat is pure delight — her chunk waits for the first idle slot so
   entry paint never queues behind her */
const CatCompanion = lazy(() => import("../components/CatCompanion"));

/* sonner mounts on the first notify(): pages that never toast never pay */
const Toaster = lazy(() =>
  import("../components/ui/sonner").then((m) => ({ default: m.Toaster })),
);

const RootLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const rendered = useRenderedLocation() ?? location;
  /* /links is a standalone linktree — chrome (nav, footer, tab bar, cat)
     would crowd the stack, so the page stands alone */
  const quiet = rendered.pathname === "/links";
  const catReady = useIdleReady(1200);
  const [toasterWanted, setToasterWanted] = useState(isToasterWanted);

  useEffect(
    () =>
      onToasterWanted(() => {
        /* deferred: a sync setState inside the effect trips the purity lint */
        void Promise.resolve().then(() => setToasterWanted(true));
      }),
    [],
  );

  useEffect(() => {
    const splash = document.getElementById("splash");
    if (splash) {
      splash.classList.add("fade-out");
      setTimeout(() => splash.remove(), 550);
    }
  }, []);

  // iOS-style edge-swipe back (sub-routes only; the nav drawer opens from the
  // right edge, so this never collides with it). Browsers that own the gesture
  // simply never deliver these events — harmless either way.
  useEffect(() => {
    if (location.pathname === "/" || !isTouchDevice()) return;
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      tracking = t.clientX <= 24;
      startX = t.clientX;
      startY = t.clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dx >= 100 && dy <= 70 && window.history.length > 1) {
        tap(12);
        navigate(-1);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [location.pathname, navigate]);

  return (
    /* Honor prefers reduced-motion for every motion/react interaction
        (whileTap springs below) without affecting view transitions. */
    <MotionConfig reducedMotion="user">
      {!quiet && <Navbar />}
      <CursorGlow />
      {catReady && !quiet && (
        <Suspense fallback={null}>
          <CatCompanion />
        </Suspense>
      )}
      <CommandPalette />
      <DevShortcuts />
      <div
        key={rendered.pathname}
        className={canViewTransition ? undefined : "page-enter"}
      >
        <Outlet />
      </div>
      {toasterWanted && (
        <Suspense fallback={null}>
          <Toaster />
        </Suspense>
      )}
      {!quiet && <Footer />}
      {!quiet && <BottomTabBar />}
    </MotionConfig>
  );
};

export default RootLayout;
