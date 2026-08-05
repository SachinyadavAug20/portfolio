import { useEffect } from "react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import CursorGlow from "../components/CursorGlow";
import Footer from "../sections/Footer";
import { Toaster } from "../components/ui/sonner";
import { SITE_NAME, SOCIAL_HANDLE, SITE_DESCRIPTION } from "../seo/config";

const RootLayout = () => {
  useEffect(() => {
    const splash = document.getElementById("splash");
    if (splash) {
      splash.classList.add("fade-out");
      setTimeout(() => splash.remove(), 550);
    }
  }, []);

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
        <meta name="theme-color" content="#0e0e10" />
      </Helmet>
      <Navbar />
      <CursorGlow />
      <Outlet />
      <Toaster />
      <Footer />
    </HelmetProvider>
  );
};

export default RootLayout;
