import { useEffect, useRef } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import BottomTabBar from "../components/BottomTabBar";
import CursorGlow from "../components/CursorGlow";
import Footer from "../sections/Footer";
import { Toaster } from "../components/ui/sonner";
import { SITE_NAME, SOCIAL_HANDLE, SITE_DESCRIPTION } from "../seo/config";

const RootLayout = () => {
  const location = useLocation();
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
