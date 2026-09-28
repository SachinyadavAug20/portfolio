import { useEffect, useRef } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import BottomTabBar from "../components/BottomTabBar";
import CursorGlow from "../components/CursorGlow";
import Footer from "../sections/Footer";
import { Toaster } from "../components/ui/sonner";
import { SITE_NAME, SOCIAL_HANDLE, SITE_DESCRIPTION } from "../seo/config";
import { isTouchDevice } from "../hooks/useNearViewport";
import { tap } from "../lib/haptics";

const RootLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const firstNav = useRef(true);

  useEffect(() => {
    const splash = document.getElementById("splash");
    if (splash) {
      splash.classList.add("fade-out");
      setTimeout(() => splash.remove(), 550);
    }
  }, []);

  useEffect(() => {
    if (firstNav.current) {
      firstNav.current = false;
      return;
    }
    if (location.hash) return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.key, location.hash]);

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
    <HelmetProvider>
      <Helmet>
        <meta name="description" content={SITE_DESCRIPTION} />
        <meta name="author" content={SITE_NAME} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content="en_IN" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content={SOCIAL_HANDLE} />
        <meta name="twitter:creator" content={SOCIAL_HANDLE} />
      </Helmet>
      <Navbar />
      <CursorGlow />
      <div key={location.pathname} className="page-enter">
        <Outlet />
      </div>
      <Toaster />
      <Footer />
      <BottomTabBar />
    </HelmetProvider>
  );
};

export default RootLayout;
